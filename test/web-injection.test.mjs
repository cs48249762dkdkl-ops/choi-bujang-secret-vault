import assert from 'node:assert/strict';
import { copyFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { PATTERNS, decide } from '../xdr/web-injection/decide.mjs';
import { checkDenyRule, respond } from '../xdr/web-injection/respond.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = JSON.parse(await readFile(join(root, 'xdr', 'fixtures', 'web-injection.json'), 'utf8'));

test('T1190 패턴마다 근거가 있고 독립 판정기의 상수와 같다', async () => {
  const listed = JSON.parse(await readFile(join(root, 'xdr', 'web-injection', 'patterns.json'), 'utf8'));
  assert.equal(listed.source, 'MITRE ATT&CK T1190');
  assert.deepEqual(PATTERNS, listed.patterns);
  assert.ok(PATTERNS.every((pattern) => pattern.name && pattern.conditions && pattern.rationale));

  const source = await readFile(join(root, 'xdr', 'web-injection', 'decide.mjs'), 'utf8');
  assert.equal(/^\s*import\s/m.test(source), false);
  assert.equal(/\b(?:readFile|writeFile|fetch|require)\s*\(/.test(source), false);
});

test('판정 모듈 파일 하나만 있는 격리 폴더에서 모든 경보에 답한다', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'web-injection-isolated-'));
  const isolatedPath = join(directory, 'decide.mjs');
  try {
    await copyFile(join(root, 'xdr', 'web-injection', 'decide.mjs'), isolatedPath);
    const isolated = await import(pathToFileURL(isolatedPath).href);
    assert.equal(typeof isolated.decide, 'function');
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

test('반복된 명확한 주입만 차단하고 단발 시도와 정상 요청을 구분한다', () => {
  const results = fixture.alerts.map(decide);
  const counts = Object.fromEntries(['block', 'alert', 'record'].map((action) => [
    action, results.filter((result) => result.action === action).length,
  ]));
  assert.deepEqual(counts, { block: 8, alert: 9, record: 9 });
  assert.ok(results.slice(0, 8).every((result) => result.action === 'block' && result.confidence >= 0.85));
  assert.ok(results.slice(8, 17).every((result) => result.action === 'alert' && result.confidence >= 0.5));
  assert.ok(results.slice(17).every((result) => result.action === 'record' && result.confidence < 0.5));

  const normal = structuredClone(fixture.alerts[17]);
  normal.rule.level = 12;
  normal.rule.mitre = ['T1190'];
  normal.data.count = '20';
  assert.notEqual(decide(normal).action, 'block');
});

test('거부 규칙은 차단 후보에만 5분간 적용하고 정상 주소를 통과시킨다', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'web-injection-'));
  const logPath = join(directory, 'alerts.log');
  const now = Date.parse('2026-09-27T00:00:00.000Z');
  try {
    const blocked = await respond(fixture.alerts[0], { now, logPath });
    const ambiguous = await respond(fixture.alerts[8], { now, logPath });
    const normal = await respond(fixture.alerts[17], { now, logPath });
    assert.equal(blocked.result.action, 'block');
    assert.equal(blocked.denyRule.sourceAlertId, fixture.alerts[0].id);
    assert.equal(ambiguous.denyRule, null);
    assert.equal(normal.denyRule, null);
    assert.equal(checkDenyRule({ sourceIp: blocked.denyRule.match.sourceIp }, blocked.denyRule, now).decision, 'deny');
    for (const ordinary of fixture.alerts.slice(17)) {
      assert.equal(checkDenyRule({ sourceIp: ordinary.data.srcip }, blocked.denyRule, now).decision, 'allow');
    }
    assert.equal(checkDenyRule({ sourceIp: blocked.denyRule.match.sourceIp }, blocked.denyRule, now + (6 * 60 * 1000)).decision, 'allow');

    const lines = (await readFile(logPath, 'utf8')).trim().split(/\r?\n/).map((line) => JSON.parse(line));
    assert.equal(lines.length, 2);
    assert.ok(lines.every((line) => !['sourceIp', 'account', 'url', 'description'].some((key) => Object.hasOwn(line, key))));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
