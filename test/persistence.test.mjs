import assert from 'node:assert/strict';
import { copyFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { PATTERNS, decide } from '../xdr/persistence/decide.mjs';
import { readAlerts, readFixture } from '../xdr/persistence/read-alerts.mjs';
import { checkDenyRule, createDenyRule, respond } from '../xdr/persistence/respond.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = JSON.parse(await readFile(join(root, 'xdr', 'fixtures', 'persistence.json'), 'utf8'));

test('경보마다 허용된 다섯 필드만 한 줄로 읽고 비밀값 형태를 가린다', async () => {
  const rows = await readFixture();
  assert.equal(rows.length, fixture.alerts.length);
  assert.deepEqual(Object.keys(rows[0]), ['timestamp', 'sourceIp', 'account', 'ruleLevel', 'description']);
  assert.equal(rows[0].account, fixture.alerts[0].data.srcuser);
  const sample = 'a'.repeat(12) + '1'.repeat(12);
  const secret = readAlerts({
    schema: fixture.schema,
    alerts: [{
      timestamp: '2026-09-27T00:00:00Z',
      data: { srcip: '192.0.2.1', srcuser: 'token=' + sample },
      rule: { level: 3, description: 'Bearer ' + sample },
    }],
  })[0];
  assert.ok(!JSON.stringify(secret).includes(sample));
});

test('T1543·T1053 패턴 근거가 독립 판단기 상수와 일치한다', async () => {
  const listed = JSON.parse(await readFile(join(root, 'xdr', 'persistence', 'patterns.json'), 'utf8'));
  assert.equal(listed.source, 'MITRE ATT&CK T1543; MITRE ATT&CK T1053');
  assert.deepEqual(PATTERNS, listed.patterns);
  assert.ok(PATTERNS.every((pattern) => pattern.name && pattern.conditions && pattern.rationale && !pattern.rationale.includes('\n')));
  const source = await readFile(join(root, 'xdr', 'persistence', 'decide.mjs'), 'utf8');
  assert.equal(/^\s*import\s/m.test(source), false);
  assert.equal(/\b(?:readFile|writeFile|fetch|require)\s*\(/.test(source), false);
});

test('판단 파일 하나만 있는 격리 폴더에서 24건 모두 즉시 답한다', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'persistence-isolated-'));
  const isolatedPath = join(directory, 'decide.mjs');
  try {
    await copyFile(join(root, 'xdr', 'persistence', 'decide.mjs'), isolatedPath);
    const isolated = await import(pathToFileURL(isolatedPath).href);
    for (const alert of fixture.alerts) {
      const result = isolated.decide(alert);
      assert.ok(['block', 'alert', 'record'].includes(result.action));
      assert.ok(result.confidence >= 0 && result.confidence <= 1);
      assert.equal(typeof result.reason, 'string');
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('명확한 지속성만 차단하고 애매한 변경과 정상 활동을 구분한다', () => {
  const results = fixture.alerts.map(decide);
  const counts = Object.fromEntries(['block', 'alert', 'record'].map((action) => [
    action, results.filter((result) => result.action === action).length,
  ]));
  assert.deepEqual(counts, { block: 8, alert: 8, record: 8 });
  assert.ok(results.slice(0, 8).every((result) => result.action === 'block' && result.confidence >= 0.85));
  assert.ok(results.slice(8, 16).every((result) => result.action === 'alert' && result.confidence >= 0.5 && result.confidence < 0.85));
  assert.ok(results.slice(16).every((result) => result.action === 'record' && result.confidence < 0.5));

  const normal = structuredClone(fixture.alerts[18]);
  normal.rule.level = 12;
  normal.rule.mitre = ['T1543'];
  assert.notEqual(decide(normal).action, 'block');
  const unknownActor = structuredClone(fixture.alerts[0]);
  delete unknownActor.data.srcuser;
  assert.equal(decide(unknownActor).action, 'alert');
});

test('거부 후보는 같은 주소·계정에 5분만 적용하고 정상 사용자는 통과한다', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'persistence-'));
  const logPath = join(directory, 'alerts.log');
  const now = Date.parse('2026-09-27T00:00:00.000Z');
  try {
    const responses = [];
    for (const alert of fixture.alerts) responses.push(await respond(alert, { now, logPath }));
    const rules = responses.map((response) => response.denyRule).filter(Boolean);
    assert.equal(rules.length, 8);
    for (const rule of rules) {
      assert.ok(rule.sourceAlertId && rule.expiresAt);
      assert.equal(checkDenyRule(rule.match, rule, now).decision, 'deny');
      assert.equal(checkDenyRule({ ...rule.match, account: 'another-user' }, rule, now).decision, 'allow');
      assert.equal(checkDenyRule(rule.match, rule, now + 300000).decision, 'allow');
      for (const ordinary of fixture.alerts.slice(16)) {
        assert.equal(checkDenyRule({ sourceIp: ordinary.data.srcip, account: ordinary.data.srcuser }, rule, now).decision, 'allow');
      }
    }
    assert.equal(createDenyRule(fixture.alerts[16], { action: 'block', confidence: 1, reason: 'fake' }, now), null);
    const lines = (await readFile(logPath, 'utf8')).trim().split(/\r?\n/).map((line) => JSON.parse(line));
    assert.equal(lines.length, 16);
    assert.ok(lines.every((line) => !['sourceIp', 'account', 'path', 'description'].some((key) => Object.hasOwn(line, key))));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
