import assert from 'node:assert/strict';
import { copyFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { PATTERNS, decide } from '../xdr/exfiltration/decide.mjs';
import { readAlerts, readFixture } from '../xdr/exfiltration/read-alerts.mjs';
import { checkDenyRule, createDenyRule, respond } from '../xdr/exfiltration/respond.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = JSON.parse(await readFile(join(root, 'xdr', 'fixtures', 'exfiltration.json'), 'utf8'));

test('경보 30건에서 허용된 다섯 필드만 30줄로 읽고 비밀값을 가린다', async () => {
  const rows = await readFixture();
  assert.equal(rows.length, fixture.alerts.length);
  assert.equal(rows.length, 30);
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

test('T1041·T1048 근거 패턴은 독립 판단기 상수와 일치한다', async () => {
  const listed = JSON.parse(await readFile(join(root, 'xdr', 'exfiltration', 'patterns.json'), 'utf8'));
  assert.equal(listed.source, 'MITRE ATT&CK T1041; MITRE ATT&CK T1048');
  assert.deepEqual(PATTERNS, listed.patterns);
  assert.ok(PATTERNS.every((pattern) => pattern.name && pattern.conditions && pattern.rationale && !pattern.rationale.includes('\n')));
  const source = await readFile(join(root, 'xdr', 'exfiltration', 'decide.mjs'), 'utf8');
  assert.equal(/^\s*import\s/m.test(source), false);
  assert.equal(/\b(?:readFile|writeFile|fetch|require)\s*\(/.test(source), false);
});

test('판단 파일 하나만 있는 격리 폴더에서 즉시 답한다', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'exfiltration-isolated-'));
  const isolatedPath = join(directory, 'decide.mjs');
  try {
    await copyFile(join(root, 'xdr', 'exfiltration', 'decide.mjs'), isolatedPath);
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

test('명확한 대량 반출만 막고 불확실한 전송과 정상 활동을 구분한다', () => {
  const results = fixture.alerts.map(decide);
  const counts = Object.fromEntries(['block', 'alert', 'record'].map((action) => [
    action, results.filter((result) => result.action === action).length,
  ]));
  assert.deepEqual(counts, { block: 10, alert: 10, record: 10 });
  assert.ok(results.slice(0, 10).every((result) => result.action === 'block' && result.confidence >= 0.85));
  assert.ok(results.slice(10, 20).every((result) => result.action === 'alert' && result.confidence >= 0.5 && result.confidence < 0.85));
  assert.ok(results.slice(20).every((result) => result.action === 'record' && result.confidence < 0.5));

  const benign = structuredClone(fixture.alerts[11]);
  benign.rule.level = 12;
  benign.data.bytes = 240_000_000;
  assert.notEqual(decide(benign).action, 'block');
  const failed = structuredClone(fixture.alerts[17]);
  failed.rule.level = 12;
  failed.data.bytes = 240_000_000;
  assert.notEqual(decide(failed).action, 'block');
  const unknownDestination = structuredClone(fixture.alerts[0]);
  delete unknownDestination.data.dstip;
  assert.equal(decide(unknownDestination).action, 'alert');
  const smallTransfer = structuredClone(fixture.alerts[0]);
  smallTransfer.data.bytes = 1000;
  assert.equal(decide(smallTransfer).action, 'alert');
});

test('단기 목적지 거부 후보는 관련 주소·계정에만 적용하고 정상 요청을 통과시킨다', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'exfiltration-'));
  const logPath = join(directory, 'alerts.log');
  const now = Date.parse('2026-09-27T00:00:00.000Z');
  try {
    const responses = [];
    for (const alert of fixture.alerts) responses.push(await respond(alert, { now, logPath }));
    const rules = responses.map((response) => response.denyRule).filter(Boolean);
    assert.equal(rules.length, 10);
    for (const rule of rules) {
      assert.ok(rule.sourceAlertId && rule.expiresAt && rule.match.destinationIp);
      assert.equal(checkDenyRule(rule.match, rule, now).decision, 'deny');
      assert.equal(checkDenyRule({ ...rule.match, account: 'another-user' }, rule, now).decision, 'allow');
      assert.equal(checkDenyRule({ ...rule.match, sourceIp: '192.0.2.250' }, rule, now).decision, 'allow');
      assert.equal(checkDenyRule({ ...rule.match, destinationIp: '192.0.2.251' }, rule, now).decision, 'allow');
      assert.equal(checkDenyRule(rule.match, rule, now + 300000).decision, 'allow');
      for (const ordinary of fixture.alerts.slice(20)) {
        assert.equal(checkDenyRule({
          sourceIp: ordinary.data.srcip,
          account: ordinary.data.srcuser,
          destinationIp: ordinary.data.dstip,
        }, rule, now).decision, 'allow');
      }
    }
    assert.equal(createDenyRule(fixture.alerts[20], { action: 'block', confidence: 1, reason: 'fake' }, now), null);
    const lines = (await readFile(logPath, 'utf8')).trim().split(/\r?\n/).map((line) => JSON.parse(line));
    assert.equal(lines.length, 20);
    assert.ok(lines.every((line) => !['sourceIp', 'destinationIp', 'account', 'description', 'bytes'].some((key) => Object.hasOwn(line, key))));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
