import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { PATTERNS, decide } from '../xdr/brute-force/decide.mjs';
import { readAlerts } from '../xdr/brute-force/read-alerts.mjs';
import { checkDenyRule, respond } from '../xdr/brute-force/respond.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = JSON.parse(await readFile(join(root, 'xdr', 'fixtures', 'brute-force.json'), 'utf8'));

test('읽기 모듈은 경보마다 허용된 다섯 필드만 한 줄로 만든다', () => {
  const rows = readAlerts(fixture);
  assert.equal(rows.length, fixture.alerts.length);
  for (const row of rows) {
    assert.deepEqual(Object.keys(row).sort(), ['account', 'description', 'ruleLevel', 'sourceIp', 'timestamp']);
  }
});

test('읽기 모듈은 이름 없는 토큰 형태도 출력 전에 가린다', () => {
  const opaque = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
  const jwtLike = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.signature-value';
  const rows = readAlerts({
    schema: 'aleph.xdr.fixture.v1',
    alerts: [{
      timestamp: '2026-09-27T09:12:01+09:00',
      rule: { level: 12, description: `authorization: Bearer ${opaque}; raw ${jwtLike}` },
      data: { srcip: '192.0.2.10', srcuser: jwtLike },
    }],
  });
  const printed = JSON.stringify(rows[0]);

  assert.doesNotMatch(printed, new RegExp(opaque, 'u'));
  assert.doesNotMatch(printed, new RegExp(jwtLike.replaceAll('.', '\\.'), 'u'));
  assert.match(printed, /\[REDACTED\]/u);
});

test('패턴은 T1110 근거를 가지며 독립 판정기 상수와 같다', async () => {
  const listed = JSON.parse(await readFile(join(root, 'xdr', 'brute-force', 'patterns.json'), 'utf8'));
  assert.equal(listed.source, 'MITRE ATT&CK T1110');
  assert.deepEqual(PATTERNS, listed.patterns);
  assert.ok(PATTERNS.every((pattern) => pattern.name && pattern.conditions && pattern.rationale));
  const source = await readFile(join(root, 'xdr', 'brute-force', 'decide.mjs'), 'utf8');
  assert.equal(/^\s*import\s/m.test(source), false);
});

test('명확한 공격만 차단하고 애매한 실패와 정상 이벤트를 구분한다', () => {
  const results = fixture.alerts.map((alert) => decide(alert));
  const counts = Object.fromEntries(['block', 'alert', 'record'].map((action) => [
    action,
    results.filter((result) => result.action === action).length,
  ]));

  assert.deepEqual(counts, { block: 10, alert: 9, record: 9 });
  for (const result of results) {
    assert.ok(['block', 'alert', 'record'].includes(result.action));
    assert.ok(result.confidence >= 0 && result.confidence <= 1);
    assert.ok(PATTERNS.some((pattern) => pattern.name === result.reason));
  }
  for (let index = 19; index < fixture.alerts.length; index += 1) {
    assert.notEqual(results[index].action, 'block');
  }
});

test('응답 연결은 명확한 공격만 짧게 차단하고 최소 로그만 남긴다', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'brute-force-'));
  const logPath = join(directory, 'alerts.log');
  const now = Date.parse('2026-09-27T00:00:00.000Z');
  try {
    const blocked = await respond(fixture.alerts[0], { now, logPath });
    const ambiguous = await respond(fixture.alerts[10], { now, logPath });
    const normal = await respond(fixture.alerts[19], { now, logPath });
    assert.equal(blocked.result.action, 'block');
    assert.ok(blocked.denyRule);
    assert.equal(ambiguous.denyRule, null);
    assert.equal(normal.denyRule, null);

    assert.equal(checkDenyRule({ ...blocked.denyRule.match }, blocked.denyRule, now).decision, 'deny');
    assert.equal(checkDenyRule({ ...blocked.denyRule.match, account: 'another-account' }, blocked.denyRule, now).decision, 'allow');
    assert.equal(checkDenyRule({ ...blocked.denyRule.match }, blocked.denyRule, now + (6 * 60 * 1000)).decision, 'allow');

    const lines = (await readFile(logPath, 'utf8')).trim().split(/\r?\n/).map((line) => JSON.parse(line));
    assert.equal(lines.length, 2);
    assert.ok(lines.every((line) => Object.keys(line).every((key) => !['sourceIp', 'account'].includes(key))));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
