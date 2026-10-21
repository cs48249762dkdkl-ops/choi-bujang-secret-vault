import { appendFile, mkdir } from 'node:fs/promises';
import { isIP } from 'node:net';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decide } from './decide.mjs';

const BLOCK_TTL_MS = 5 * 60 * 1000;
const DEFAULT_LOG_PATH = fileURLToPath(new URL('../alerts.log', import.meta.url));

function safeId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{1,80}$/.test(value) ? value : null;
}

function currentTime(value) {
  const time = value instanceof Date ? value.getTime() : Number(value);
  if (!Number.isFinite(time)) throw new Error('유효한 현재 시각이 필요합니다.');
  return time;
}

/** 기존 ZTNA 판정 뒤에 추가할 단기 거부 규칙 후보만 만든다. */
export function createDenyRule(alert, result, now = Date.now()) {
  if (result?.action !== 'block' || result.confidence < 0.85) return null;

  const alertId = safeId(alert?.id);
  const sourceIp = alert?.data?.srcip;
  const time = currentTime(now);
  if (!alertId || typeof sourceIp !== 'string' || isIP(sourceIp) === 0) return null;

  return Object.freeze({
    schema: 'aleph.xdr.ztna-deny-rule.v1',
    effect: 'deny',
    ruleId: `xdr-web-injection-${alertId}`,
    sourceAlertId: alertId,
    reasonCode: 'xdr_web_injection_block',
    evidencePattern: result.reason,
    expiresAt: new Date(time + BLOCK_TTL_MS).toISOString(),
    match: Object.freeze({ sourceIp }),
  });
}

/** 기존 판정기의 허용/거부 결과를 대체하지 않는 추가 검사다. */
export function checkDenyRule(request, rule, now = Date.now()) {
  const expiresAt = Date.parse(rule?.expiresAt);
  const applies = rule?.schema === 'aleph.xdr.ztna-deny-rule.v1'
    && rule.effect === 'deny'
    && Number.isFinite(expiresAt)
    && expiresAt > currentTime(now)
    && request?.sourceIp === rule.match?.sourceIp;

  return applies
    ? { decision: 'deny', reasonCode: rule.reasonCode, sourceAlertId: rule.sourceAlertId }
    : { decision: 'allow', reasonCode: 'xdr_no_active_block' };
}

/** 경보 원문·URL·주소·계정 없이 block과 alert 메타데이터만 한 줄씩 기록한다. */
export async function respond(alert, { now = Date.now(), logPath = DEFAULT_LOG_PATH } = {}) {
  const result = decide(alert);
  const denyRule = createDenyRule(alert, result, now);

  if (result.action !== 'record') {
    await mkdir(dirname(logPath), { recursive: true });
    await appendFile(logPath, `${JSON.stringify({
      at: new Date(currentTime(now)).toISOString(),
      alertId: safeId(alert?.id),
      action: result.action,
      reason: result.reason,
      expiresAt: denyRule?.expiresAt ?? null,
    })}\n`, 'utf8');
  }

  return { result, denyRule };
}
