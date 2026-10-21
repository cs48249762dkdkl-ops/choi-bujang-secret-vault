// 격리 심판은 이 파일만 불러오므로 patterns.json의 근거를 상수로 고정한다.
export const PATTERNS = Object.freeze([
  Object.freeze({
    name: 'log4shell_remote_jndi_lookup',
    conditions: '요청 머리글이나 인자에 원격 프로토콜을 가리키는 완전한 JNDI 조회 구문이 있고 높은 수준의 T1190 경보가 함께 있다.',
    rationale: 'CVE-2021-44228: Log4j가 공격자 제어 JNDI 끝점을 조회할 수 있는 입력은 공개 앱 악용(T1190)의 구체적 증거다.',
  }),
  Object.freeze({
    name: 'known_cve_scanner_trace',
    conditions: '요청 머리글에 Log4Shell 점검 도구의 명시적 식별자가 있지만 완전한 원격 JNDI 구문은 없다.',
    rationale: 'CVE-2021-44228·MITRE ATT&CK T1190: 취약점 점검 흔적은 조사 신호이나 단독으로 공격 성공이나 차단 근거는 아니다.',
  }),
  Object.freeze({
    name: 'unconfirmed_t1190_cve_signal',
    conditions: 'T1190 관련 Wazuh 규칙 수준이 5 이상이지만 완전한 원격 JNDI 구문이 확인되지 않는다.',
    rationale: 'MITRE ATT&CK T1190: 취약점 이름·잘린 구문·문서 조회만으로 악용을 단정할 수 없으므로 알림으로 조사한다.',
  }),
]);

function text(value) {
  return typeof value === 'string' ? value : '';
}

function decodedText(value) {
  let result = text(value).slice(0, 4096);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const next = decodeURIComponent(result);
      if (next === result) break;
      result = next;
    } catch {
      break;
    }
  }
  return result;
}

// 설명이나 계정 같은 메타데이터는 페이로드 증거로 사용하지 않는다.
function requestFields(alert) {
  const data = alert?.data;
  if (!data || typeof data !== 'object') return [];
  const values = [data.url, data.uri, data.query, data.request, data.useragent];
  for (const group of [data.headers, data.parameters, data.http?.headers]) {
    if (typeof group === 'string') values.push(group);
    else if (group && typeof group === 'object' && !Array.isArray(group)) {
      values.push(...Object.values(group));
    }
  }
  return values.filter((value) => typeof value === 'string').map(decodedText);
}

/** 경보 한 건만 순수 계산한다. 파일·패키지·네트워크를 사용하지 않는다. */
export function decide(alert) {
  const fields = requestFields(alert);
  const remoteLookup = /[$][{]\s*jndi\s*:\s*(?:ldaps?|rmi|dns)\s*:\s*\/\/[^\s{}]{1,512}\s*[}]/i;
  const clearPayload = fields.some((field) => remoteLookup.test(field));
  const scanner = fields.some((field) => /\b(?:log4(?:j|shell)[-_ ]?(?:scan|scanner|probe)|CVE-2021-44228[_-]?scanner)\b/i.test(field));
  const level = Number(alert?.rule?.level);
  const mitre = Array.isArray(alert?.rule?.mitre) && alert.rule.mitre.includes('T1190');
  const sourceIp = text(alert?.data?.srcip);
  const description = text(alert?.rule?.description);
  const explicitlyNegative = /조회\s*구문은?\s*없|악용\s*구문은?\s*없|완전한\s*구문은?\s*아닙니다/.test(description);

  if (clearPayload && sourceIp && level >= 10 && mitre && !explicitlyNegative) {
    return { action: 'block', confidence: 0.96, reason: PATTERNS[0].name };
  }
  if (clearPayload) {
    return { action: 'alert', confidence: 0.72, reason: PATTERNS[0].name };
  }
  if (scanner) {
    return { action: 'alert', confidence: 0.65, reason: PATTERNS[1].name };
  }
  if (mitre && Number.isFinite(level) && level >= 5) {
    return { action: 'alert', confidence: 0.55, reason: PATTERNS[2].name };
  }
  return { action: 'record', confidence: 0.1, reason: 'no_matching_known_cve_pattern' };
}
