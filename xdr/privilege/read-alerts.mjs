import { readFile } from 'node:fs/promises';

const FIXTURE_URL = new URL('../fixtures/privilege.json', import.meta.url);
const NAMED_SECRET = /((?:password|passwd|token|secret|api[_-]?key|authorization)\s*[:=]\s*)(?:Bearer\s+)?[^\s,;]+/gi;
const BEARER_TOKEN = /\bBearer\s+[A-Za-z0-9._~+/-]{12,}/gi;
const JWT_LIKE_TOKEN = /\beyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\b/g;
const PROVIDER_TOKEN = /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16})\b/g;
const LONG_OPAQUE_TOKEN = /(?<![A-Za-z0-9+/_=-])(?=[A-Za-z0-9+/_=-]{24,}(?![A-Za-z0-9+/_=-]))(?=[A-Za-z0-9+/_=-]*[A-Za-z])(?=[A-Za-z0-9+/_=-]*\d)[A-Za-z0-9+/_=-]{24,}(?![A-Za-z0-9+/_=-])/g;

function safeText(value) {
  if (typeof value !== 'string') return null;
  return value
    .replace(BEARER_TOKEN, 'Bearer [REDACTED]')
    .replace(NAMED_SECRET, '$1[REDACTED]')
    .replace(JWT_LIKE_TOKEN, '[REDACTED]')
    .replace(PROVIDER_TOKEN, '[REDACTED]')
    .replace(LONG_OPAQUE_TOKEN, '[REDACTED]');
}

/** 원본 경보를 바꾸지 않고 확인에 필요한 다섯 필드만 비밀값을 가려 추린다. */
export function readAlerts(fixture) {
  if (!fixture || fixture.schema !== 'aleph.xdr.fixture.v1' || !Array.isArray(fixture.alerts)) {
    throw new Error('경보 묶음 형식이 아닙니다.');
  }
  return fixture.alerts.map((alert) => ({
    timestamp: safeText(alert?.timestamp),
    sourceIp: safeText(alert?.data?.srcip),
    account: safeText(alert?.data?.srcuser ?? alert?.data?.account ?? alert?.data?.user),
    ruleLevel: Number.isFinite(alert?.rule?.level) ? alert.rule.level : null,
    description: safeText(alert?.rule?.description),
  }));
}

export async function readFixture() {
  const fixture = JSON.parse(await readFile(FIXTURE_URL, 'utf8'));
  return readAlerts(fixture);
}

const isMain = process.argv[1] && new URL('file:' + process.argv[1]).href === import.meta.url;
if (isMain) {
  for (const alert of await readFixture()) console.log(JSON.stringify(alert));
}
