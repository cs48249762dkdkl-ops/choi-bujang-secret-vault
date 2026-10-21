import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decide } from './decide.mjs';

const BLOCK_TTL_MS = 5 * 60 * 1000;
const DEFAULT_LOG_PATH = fileURLToPath(new URL('../alerts.log', import.meta.url));

function safeId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{1,80}$/.test(value) ? value : null;
}

function safeAddress(value) {
  return typeof value === 'string' && /^[0-9A-Fa-f:.]{3,45}$/.test(value) ? value : null;
}

function currentTime(value) {
  const time = value instanceof Date ? value.getTime() : Number(value);
  if (!Number.isFinite(time)) throw new Error('유효한 현재 시각이 필요합니다.');
  return time;
}

/**
 * 기존 판정기를 바꾸지 않고, 상위 ZTNA 연결부에 전달할 짧은 수명의 추가 거부 규칙만 만든다.
 * 주소와 계정을 모두 맞춰야 하므로 같은 주소의 정상 다른 계정은 이 규칙으로 거부되지 않는다.
 */
export function createDenyRule(alert, result, now = Date.now()) {
  if (result?.action !== 'block') return null;

  const alertId = safeId(alert?.id);
  const sourceIp = safeAddress(alert?.data?.srcip);
  const account = safeId(alert?.data?.srcuser);
  const time = currentTime(now);
  if (!alertId || !sourceIp || !account) return null;

  return Object.freeze({
    schema: 'aleph.xdr.ztna-deny-rule.v1',
    effect: 'deny',
    ruleId: `xdr-brute-force-${alertId}`,
    sourceAlertId: alertId,
    reasonCode: 'xdr_brute_force_block',
    evidencePattern: result.reason,
    expiresAt: new Date(time + BLOCK_TTL_MS).toISOString(),
    match: Object.freeze({ sourceIp, account }),
  });
}

/**
 * ZTNA 연결부는 기존 판정 뒤에 이 좁은 추가 확인만 호출한다.
 */
export function checkDenyRule(request, rule, now = Date.now()) {
  const expiresAt = Date.parse(rule?.expiresAt);
  const applies = rule?.effect === 'deny'
    && Number.isFinite(expiresAt)
    && expiresAt > currentTime(now)
    && request?.sourceIp === rule.match?.sourceIp
    && request?.account === rule.match?.account;

  return applies
    ? { decision: 'deny', reasonCode: rule.reasonCode, sourceAlertId: rule.sourceAlertId }
    : { decision: 'allow', reasonCode: 'xdr_no_active_block' };
}

async function appendAlert(logPath, entry) {
  await mkdir(dirname(logPath), { recursive: true });
  await appendFile(logPath, `${JSON.stringify(entry)}\n`, 'utf8');
}

/**
 * block과 alert만 최소 메타데이터로 기록한다. 원본 경보·주소·계정은 로그에 쓰지 않는다.
 */
export async function respond(alert, { now = Date.now(), logPath = DEFAULT_LOG_PATH } = {}) {
  const result = decide(alert);
  const denyRule = createDenyRule(alert, result, now);

  if (result.action !== 'record') {
    await appendAlert(logPath, {
      at: new Date(currentTime(now)).toISOString(),
      alertId: safeId(alert?.id),
      action: result.action,
      reason: result.reason,
      expiresAt: denyRule?.expiresAt ?? null,
    });
  }

  return { result, denyRule };
}
