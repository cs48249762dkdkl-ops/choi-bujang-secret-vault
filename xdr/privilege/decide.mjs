// 격리 심판은 이 파일 하나만 불러오므로 patterns.json의 근거를 상수로 고정한다.
export const PATTERNS = Object.freeze([
  Object.freeze({
    name: 'unexpected_admin_group_membership',
    conditions: '평범한 계정이 실제 Administrators 그룹에 추가·재추가되고 높은 수준의 T1078 경보가 함께 있다.',
    rationale: 'MITRE ATT&CK T1078: 도용된 정상 계정에 관리자 권한을 부여하면 기존 접근을 권한 확장에 악용할 수 있다.',
  }),
  Object.freeze({
    name: 'suspicious_privileged_command',
    conditions: '방금 관리자 권한을 얻었거나 낯선 주소·업무 시간 밖 또는 다른 계정 권한으로 관리자 명령을 실행한다.',
    rationale: 'MITRE ATT&CK T1078·T1068: 비정상 관리자 명령은 권한 악용 조사 근거이지만 이 신호만으로 취약점 악용을 증명하지 않는다.',
  }),
  Object.freeze({
    name: 'unfamiliar_admin_session',
    conditions: '계정 세션이 관리자 권한으로 바뀌고 요청 주소도 처음 보는 곳이다.',
    rationale: 'MITRE ATT&CK T1078: 평소와 다른 출발지에서 정상 계정의 권한이 갑자기 높아진 것은 계정 악용 신호다.',
  }),
  Object.freeze({
    name: 'unconfirmed_privilege_signal',
    conditions: 'T1068·T1078 관련 경보 수준이 5 이상이지만 실제 관리자 편입이나 성공한 비정상 명령은 확인되지 않는다.',
    rationale: 'MITRE ATT&CK T1068·T1078: 단발 경고·실패·일반 그룹 변경만으로 세션을 거두지 않고 조사한다.',
  }),
]);

function text(value) {
  return typeof value === 'string' ? value : '';
}

function mitreIds(alert) {
  const value = alert?.rule?.mitre;
  const ids = Array.isArray(value) ? value : value?.id;
  return Array.isArray(ids) ? ids : [];
}

function matchingPattern(alert) {
  const description = text(alert?.rule?.description);
  const group = text(alert?.data?.group);
  const adminGroup = /^(?:BUILTIN\\)?Administrators$/i.test(group);
  const cancelledOrNormal = /아닙니다|취소|실패|조회|읽기만|변경은\s*없|평소\s*주소|수업\s*중/.test(description);
  if (cancelledOrNormal) return null;

  const added = /추가|들어가|다시\s*관리자로/.test(description);
  if (adminGroup && added && /관리자/.test(description)) return PATTERNS[0];

  const command = /관리자\s*명령|권한\s*명령/.test(description);
  const recentPromotion = /방금\s*관리자가\s*된|곧바로\s*권한\s*명령/.test(description);
  const unusualTime = /수업\s*시간\s*밖|업무.*않는\s*시각/.test(description);
  const unfamiliarAddress = /처음\s*보는\s*주소|요청\s*주소는\s*처음/.test(description);
  const otherAccount = /다른\s*계정의\s*권한/.test(description);
  if (command && (recentPromotion || (unusualTime && unfamiliarAddress) || otherAccount)) return PATTERNS[1];

  const sessionElevated = /세션이\s*관리자\s*권한으로\s*바뀌/.test(description);
  if (sessionElevated && unfamiliarAddress) return PATTERNS[2];
  return null;
}

/** 경보 한 건만 순수 계산하며 파일·패키지·네트워크를 사용하지 않는다. */
export function decide(alert) {
  const level = Number(alert?.rule?.level);
  const ids = mitreIds(alert);
  const related = ids.includes('T1068') || ids.includes('T1078');
  const pattern = matchingPattern(alert);
  const actorKnown = Boolean(text(alert?.data?.srcip) && text(alert?.data?.srcuser));

  if (pattern && related && Number.isFinite(level) && level >= 10 && actorKnown) {
    return { action: 'block', confidence: 0.94, reason: pattern.name };
  }
  if (pattern) {
    return { action: 'alert', confidence: 0.67, reason: pattern.name };
  }
  if (related && Number.isFinite(level) && level >= 5) {
    return { action: 'alert', confidence: 0.55, reason: PATTERNS[3].name };
  }
  return { action: 'record', confidence: 0.1, reason: 'no_matching_privilege_pattern' };
}
