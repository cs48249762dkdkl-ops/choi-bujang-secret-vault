import assert from 'node:assert/strict';
import { copyFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { PATTERNS, decide } from '../xdr/known-cve/decide.mjs';
import { readAlerts, readFixture } from '../xdr/known-cve/read-alerts.mjs';
import { checkDenyRule, createDenyRule, respond } from '../xdr/known-cve/respond.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = JSON.parse(await readFile(join(root, 'xdr', 'fixtures', 'known-cve.json'), 'utf8'));

test('경보를 한 건당 한 줄로 읽고 비밀값을 출력하지 않는다', async () => {
  const rows = await readFixture();
  assert.equal(rows.length, fixture.alerts.length);
  assert.deepEqual(Object.keys(rows[0]), ['timestamp', 'sourceIp', 'account', 'ruleLevel', 'description']);
  assert.equal(rows[0].account, null);
  assert.equal(rows[16].account, fixture.alerts[16].data.srcuser);

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

test('패턴 근거가 독립 판정기 맨 위의 상수와 일치한다', async () => {
  const listed = JSON.parse(await readFile(join(root, 'xdr', 'known-cve', 'patterns.json'), 'utf8'));
  assert.equal(listed.source, 'CVE-2021-44228; MITRE ATT&CK T1190');
  assert.deepEqual(PATTERNS, listed.patterns);
  assert.ok(PATTERNS.every((pattern) => pattern.name && pattern.conditions && pattern.rationale && !pattern.rationale.includes('\n')));

  const source = await readFile(join(root, 'xdr', 'known-cve', 'decide.mjs'), 'utf8');
  assert.equal(/^\s*import\s/m.test(source), false);
  assert.equal(/\b(?:readFile|writeFile|fetch|require)\s*\(/.test(source), false);
});

test('판정 파일 하나만 있는 격리 폴더에서 모든 경보에 답한다', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'known-cve-isolated-'));
  const isolatedPath = join(directory, 'decide.mjs');
  try {
    await copyFile(join(root, 'xdr', 'known-cve', 'decide.mjs'), isolatedPath);
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

test('완전한 원격 조회 요청만 차단하고 애매한 경보와 정상 요청을 구분한다', () => {
  const results = fixture.alerts.map(decide);
  const counts = Object.fromEntries(['block', 'alert', 'record'].map((action) => [
    action, results.filter((result) => result.action === action).length,
  ]));
  assert.deepEqual(counts, { block: 8, alert: 8, record: 8 });
  assert.ok(results.slice(0, 8).every((result) => result.action === 'block' && result.confidence >= 0.85));
  assert.ok(results.slice(8, 16).every((result) => result.action === 'alert' && result.confidence >= 0.5 && result.confidence < 0.85));
  assert.ok(results.slice(16).every((result) => result.action === 'record' && result.confidence < 0.5));

  const normal = structuredClone(fixture.alerts[16]);
  normal.rule.level = 13;
  normal.rule.mitre = ['T1190'];
  normal.data.count = 20;
  assert.notEqual(decide(normal).action, 'block');

  const weak = structuredClone(fixture.alerts[0]);
  weak.rule.level = 5;
  assert.equal(decide(weak).action, 'alert');
});

test('5분짜리 주소 거부 규칙에 근거 경보 번호를 붙이고 정상 사용자를 통과시킨다', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'known-cve-'));
  const logPath = join(directory, 'alerts.log');
  const now = Date.parse('2026-09-27T00:00:00.000Z');
  try {
    const blocked = await respond(fixture.alerts[0], { now, logPath });
    const ambiguous = await respond(fixture.alerts[8], { now, logPath });
    const normal = await respond(fixture.alerts[16], { now, logPath });
    assert.equal(blocked.result.action, 'block');
    assert.equal(blocked.denyRule.sourceAlertId, fixture.alerts[0].id);
    assert.equal(ambiguous.denyRule, null);
    assert.equal(normal.denyRule, null);
    assert.equal(checkDenyRule({ sourceIp: blocked.denyRule.match.sourceIp }, blocked.denyRule, now).decision, 'deny');
    for (const ordinary of fixture.alerts.slice(16)) {
      assert.equal(checkDenyRule({ sourceIp: ordinary.data.srcip }, blocked.denyRule, now).decision, 'allow');
    }
    assert.equal(checkDenyRule({ sourceIp: blocked.denyRule.match.sourceIp }, blocked.denyRule, now + 300000).decision, 'allow');
    assert.equal(createDenyRule(fixture.alerts[16], { action: 'block', confidence: 1, reason: 'fake' }, now), null);

    const lines = (await readFile(logPath, 'utf8')).trim().split(/\r?\n/).map((line) => JSON.parse(line));
    assert.equal(lines.length, 2);
    assert.ok(lines.every((line) => !['sourceIp', 'account', 'url', 'description'].some((key) => Object.hasOwn(line, key))));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
