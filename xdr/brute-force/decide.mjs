// patterns.json과 같은 근거를 심판이 독립 실행할 수 있도록 이 파일에 고정한다.
export const PATTERNS = Object.freeze([
  Object.freeze({
    name: 'same_source_rapid_login_failures',
    conditions: '같은 출발 주소에서 짧은 시간에 로그인 실패가 30건 이상이고 Wazuh 규칙 수준이 10 이상이다.',
    rationale: 'MITRE ATT&CK T1110: 한 출발지의 짧은 시간 반복 인증 실패는 무차별 대입의 대표 신호다.',
  }),
  Object.freeze({
    name: 'password_spraying_across_accounts',
    conditions: '여러 계정에 같은 비밀번호를 넣거나 계정 이름을 바꿔 가며 실패가 이어지고 Wazuh 규칙 수준이 10 이상이다.',
    rationale: 'MITRE ATT&CK T1110: 여러 계정을 상대로 반복 인증을 시도하는 행위는 비밀번호 스프레이·계정 대입 신호다.',
  }),
]);

function text(value) {
  return typeof value === 'string' ? value : '';
}

function failureCount(description) {
  const counts = [...description.matchAll(/(\d+)\s*건/g)].map((match) => Number(match[1]));
  return counts.length === 0 ? 0 : Math.max(...counts);
}

function hasLoginFailure(description) {
  return /로그인\s*실패|비밀번호.*실패|실패가?\s*\d+\s*건/.test(description);
}

function hasPasswordSprayingSignal(description) {
  return /여러\s*계정|서로\s*다른\s*계정|계정\s*\d+\s*개|계정\s*이름.*바꿔|같은\s*비밀번호/.test(description);
}

function decision(action, confidence, pattern) {
  return { action, confidence, reason: pattern.name };
}

/**
 * 경보 한 건만으로 판단한다. 파일·패키지·네트워크를 사용하지 않는다.
 */
export function decide(alert) {
  const description = text(alert?.rule?.description);
  const level = Number.isFinite(alert?.rule?.level) ? alert.rule.level : 0;
  const sourceIp = text(alert?.data?.srcip);
  const repeatedFailures = failureCount(description) >= 30;
  const passwordSpraying = hasPasswordSprayingSignal(description);
  const highSeverity = level >= 10;

  if (highSeverity && sourceIp && (repeatedFailures || passwordSpraying)) {
    const pattern = repeatedFailures ? PATTERNS[0] : PATTERNS[1];
    return decision('block', 0.95, pattern);
  }

  if (level >= 5 && hasLoginFailure(description)) {
    return decision('alert', 0.65, PATTERNS[0]);
  }

  return decision('record', 0.15, PATTERNS[0]);
}
