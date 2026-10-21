import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { readAlerts } from '../xdr/web-injection/read-alerts.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = JSON.parse(await readFile(join(root, 'xdr', 'fixtures', 'web-injection.json'), 'utf8'));

test('웹 주입 읽기 모듈은 경보마다 허용된 다섯 필드만 한 줄로 만든다', () => {
  const rows = readAlerts(fixture);

  assert.equal(rows.length, fixture.alerts.length);
  for (const row of rows) {
    assert.deepEqual(Object.keys(row).sort(), ['account', 'description', 'ruleLevel', 'sourceIp', 'timestamp']);
    assert.ok(row.account === null || typeof row.account === 'string');
  }
  assert.ok(rows.some((row) => typeof row.account === 'string'));
});

test('웹 주입 읽기 모듈은 설명에 섞인 비밀값 형태를 가린다', () => {
  const rawSecret = 'not-a-real-token-value-1234567890';
  const [row] = readAlerts({
    schema: 'aleph.xdr.fixture.v1',
    alerts: [{
      timestamp: '2026-10-18T09:00:00+09:00',
      rule: { level: 9, description: `authorization: Bearer ${rawSecret}` },
      data: { srcip: '192.0.2.1' },
    }],
  });

  assert.doesNotMatch(row.description, new RegExp(rawSecret, 'u'));
  assert.match(row.description, /\[REDACTED\]/u);
});
