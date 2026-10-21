// 심판이 이 파일 하나만 불러오므로 patterns.json의 근거를 여기에도 고정한다.
export const PATTERNS = Object.freeze([
  Object.freeze({
    name: 'sql_query_injection',
    conditions: '요청 인자에 SQL 구문이 있거나 Wazuh가 SQL 구문 표기를 명시한다.',
    rationale: 'MITRE ATT&CK T1190: 공개 웹 앱의 SQL 주입 입력은 취약점 악용 시도의 근거가 된다.',
  }),
  Object.freeze({
    name: 'script_markup_injection',
    conditions: '요청 인자에 스크립트 태그·실행 속성이 있거나 Wazuh가 스크립트 삽입 표식을 명시한다.',
    rationale: 'MITRE ATT&CK T1190: 공개 웹 앱에 실행 가능한 스크립트 표기를 넣는 요청은 악용 시도의 신호다.',
  }),
  Object.freeze({
    name: 'repeated_path_traversal',
    conditions: '요청 경로에 ../ 이 두 번 이상 있거나 Wazuh가 여러 단계의 경로 이탈 표기를 명시한다.',
    rationale: 'MITRE ATT&CK T1190: 공개 웹 앱의 파일 경계를 넘어가려는 입력은 취약점 악용의 신호다.',
  }),
  Object.freeze({
    name: 'request_command_separator',
    conditions: '요청 인자에 명령 구분자와 명령이 함께 있거나 Wazuh가 반복된 명령 구분자 표기를 명시한다.',
    rationale: 'MITRE ATT&CK T1190: 공개 웹 앱의 입력으로 명령을 이어 실행하려는 시도는 악용 신호다.',
  }),
  Object.freeze({
    name: 'unconfirmed_t1190_request',
    conditions: 'Wazuh가 T1190 관련 규칙 수준 5 이상을 보고했지만 구체적 주입과 반복이 확인되지 않는다.',
    rationale: 'MITRE ATT&CK T1190: 단발 의심 경보만으로 실제 악용을 단정할 수 없어 알림으로 조사한다.',
  }),
]);

function text(value) {
  return typeof value === 'string' ? value : '';
}

function requestText(value) {
  let request = text(value).slice(0, 4096);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const decoded = decodeURIComponent(request);
      if (decoded === request) break;
      request = decoded;
    } catch {
      break;
    }
  }
  return request;
}

function signal(alert) {
  const request = requestText(alert?.data?.url);
  const description = text(alert?.rule?.description);
  const notConfirmed = /아닙니다|없습니다|수업|공지\s*제목/.test(description);

  const sql = /\bunion\s+(?:all\s+)?select\b|\bselect\b.{0,80}\bfrom\b|['"]\s*or\s+\d+\s*=\s*\d+/i.test(request);
  if (sql || (!notConfirmed && /SQL\s*(?:구문|표식)|데이터베이스\s*조회.*이어\s*붙이/i.test(description))) {
    return { pattern: PATTERNS[0], raw: sql };
  }

  const script = /<\s*script\b|<[^>]{0,160}\bon(?:error|load|click)\s*=|\bjavascript\s*:/i.test(request);
  if (script || (!notConfirmed && /스크립트\s*(?:삽입\s*)?표(?:기|식)/.test(description))) {
    return { pattern: PATTERNS[1], raw: script };
  }

  const traversal = /(?:\.\.[/\\]){2,}/.test(request);
  if (traversal || (!notConfirmed && /경로.*(?:거슬러\s*올라가|이탈).*표기/.test(description))) {
    return { pattern: PATTERNS[2], raw: traversal };
  }

  const separator = /(?:;|&&|\|\|)\s*(?:cat|id|whoami|wget|curl|select|union|drop)\b/i.test(request);
  if (separator || (!notConfirmed && /명령\s*구분자\s*표기/.test(description))) {
    return { pattern: PATTERNS[3], raw: separator };
  }

  return null;
}

/** 경보 한 건의 근거만 계산하며 파일·패키지·네트워크를 사용하지 않는다. */
export function decide(alert) {
  const level = Number(alert?.rule?.level);
  const count = Number(alert?.data?.count);
  const sourceIp = text(alert?.data?.srcip);
  const mitre = Array.isArray(alert?.rule?.mitre) && alert.rule.mitre.includes('T1190');
  const found = signal(alert);
  const repeated = Number.isSafeInteger(count) && count >= 8;
  const highLevel = Number.isFinite(level) && level >= 10;

  if (sourceIp && repeated && highLevel && found && (mitre || found.raw)) {
    return { action: 'block', confidence: 0.95, reason: found.pattern.name };
  }

  if (found || (mitre && Number.isFinite(level) && level >= 5)) {
    return { action: 'alert', confidence: 0.65, reason: (found?.pattern ?? PATTERNS[4]).name };
  }

  return { action: 'record', confidence: 0.1, reason: 'no_matching_web_injection_pattern' };
}
