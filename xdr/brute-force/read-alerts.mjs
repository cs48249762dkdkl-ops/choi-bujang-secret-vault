import { readFile } from 'node:fs/promises';

const FIXTURE_URL = new URL('../fixtures/brute-force.json', import.meta.url);
const SECRET_VALUE = /((?:password|passwd|token|secret|api[_-]?key|authorization)\s*[:=]\s*)([^\s,;]+)/gi;

function safeText(value) {
  return typeof value === 'string'
    ? value.replace(SECRET_VALUE, '$1[REDACTED]')
    : null;
}

/**
 * 원본 경보에서 확인에 필요한 다섯 필드만 추립니다.
 * 이 모듈은 xdr 실행기의 decide 모듈과 독립적입니다.
 */
export function readAlerts(fixture) {
  if (!fixture || fixture.schema !== 'aleph.xdr.fixture.v1' || !Array.isArray(fixture.alerts)) {
    throw new Error('경보 묶음 형식이 아닙니다.');
  }

  return fixture.alerts.map((alert) => ({
    timestamp: safeText(alert?.timestamp),
    sourceIp: safeText(alert?.data?.srcip),
    account: safeText(alert?.data?.srcuser),
    ruleLevel: Number.isFinite(alert?.rule?.level) ? alert.rule.level : null,
    description: safeText(alert?.rule?.description),
  }));
}

export async function readFixture() {
  const fixture = JSON.parse(await readFile(FIXTURE_URL, 'utf8'));
  return readAlerts(fixture);
}

const isMain = process.argv[1] && new URL(`file:${process.argv[1]}`).href === import.meta.url;

if (isMain) {
  const alerts = await readFixture();
  for (const alert of alerts) {
    console.log(JSON.stringify(alert));
  }
}
