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

/** 기존 ZTNA 규칙을 수정하지 않고 뒤에 연결할 단기 거부 규칙 후보를 만든다. */
export function createDenyRule(alert, result, now = Date.now()) {
  const verified = decide(alert);
  if (result?.action !== 'block' || result.confidence < 0.85 || verified.action !== 'block') return null;

  const alertId = safeId(alert?.id);
  const sourceIp = alert?.data?.srcip;
  const time = currentTime(now);
  if (!alertId || typeof sourceIp !== 'string' || isIP(sourceIp) === 0) return null;

  return Object.freeze({
    schema: 'aleph.xdr.ztna-deny-rule.v1',
    effect: 'deny',
    ruleId: 'xdr-known-cve-' + alertId,
    sourceAlertId: alertId,
    reasonCode: 'xdr_known_cve_block',
    evidencePattern: verified.reason,
    expiresAt: new Date(time + BLOCK_TTL_MS).toISOString(),
    match: Object.freeze({ sourceIp }),
  });
}

/** 유효한 후보 주소와 일치하는 요청만 추가 거부한다. */
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

/** 원문·주소·계정·조회 구문 없이 알림/차단 메타데이터만 한 줄씩 기록한다. */
export async function respond(alert, { now = Date.now(), logPath = DEFAULT_LOG_PATH } = {}) {
  const result = decide(alert);
  const denyRule = createDenyRule(alert, result, now);
  if (result.action !== 'record') {
    await mkdir(dirname(logPath), { recursive: true });
    await appendFile(logPath, JSON.stringify({
      at: new Date(currentTime(now)).toISOString(),
      alertId: safeId(alert?.id),
      action: result.action,
      reason: result.reason,
      expiresAt: denyRule?.expiresAt ?? null,
    }) + '\n', 'utf8');
  }
  return { result, denyRule };
}
