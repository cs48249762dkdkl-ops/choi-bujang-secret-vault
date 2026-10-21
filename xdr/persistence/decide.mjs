// 격리 심판은 이 파일 하나만 불러오므로 patterns.json의 근거를 여기에도 고정한다.
export const PATTERNS = Object.freeze([
  Object.freeze({
    name: 'unsigned_service_persistence',
    conditions: '새 서비스 등록 또는 실행 파일 변경이 서명 없음과 임시 경로, 반복 등록 또는 부팅 후 잔존 같은 추가 신호와 함께 확인된다.',
    rationale: 'MITRE ATT&CK T1543: 공격자는 서비스를 만들거나 수정해 재부팅 뒤에도 코드를 반복 실행할 수 있다.',
  }),
  Object.freeze({
    name: 'unusual_scheduled_task',
    conditions: '새 예약 작업이 임시 경로의 실행 파일을 가리키고 낯선 이름이나 평소와 다른 실행 시각이 확인된다.',
    rationale: 'MITRE ATT&CK T1053: 예약 작업을 이용해 비정상 프로그램을 주기적으로 실행하는 것은 지속성 신호다.',
  }),
  Object.freeze({
    name: 'unlisted_startup_entry',
    conditions: '평소 목록에 없는 시작 항목이 새로 추가되거나 시작 항목과 예약 작업이 같은 임시 파일을 가리킨다.',
    rationale: 'MITRE ATT&CK T1543·T1053: 자동 시작 항목과 예약 실행의 결합은 재실행을 위한 지속성 근거다.',
  }),
  Object.freeze({
    name: 'unconfirmed_persistence_change',
    conditions: 'T1543 또는 T1053 경보 수준이 5 이상이지만 악성 실행 파일과 재실행 조건이 함께 확인되지 않는다.',
    rationale: 'MITRE ATT&CK T1543·T1053: 서비스나 예약 작업의 단일 변경은 정상 관리 활동일 수 있어 알림으로 조사한다.',
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
  const path = text(alert?.data?.path);
  const count = Number(alert?.data?.count);
  const temporary = /(?:\\|\/)(?:Temp|tmp)(?:\\|\/)/i.test(path);
  const unsigned = /서명\s*없|서명이\s*없|서명되지\s*않|unsigned/i.test(description);
  const service = /서비스/.test(description);
  const task = /예약\s*작업/.test(description);
  const startup = /시작\s*(?:폴더|프로그램|항목)/.test(description);
  const unfamiliar = /평소\s*목록에\s*없는|처음\s*보는|낯선/.test(description);
  const changed = /새|등록|바뀌|변경|추가/.test(description);
  const persisted = /다시\s*켜도\s*남|재부팅.*남|자동\s*시작/.test(description);

  if (service && ((unsigned && changed && (temporary || count >= 3))
    || (unfamiliar && changed && persisted))) return PATTERNS[0];
  if (task && temporary && (unfamiliar || /임의\s*문자열|수업\s*시간\s*밖/.test(description))) return PATTERNS[1];
  if (startup && ((unfamiliar && changed && /(?:\\|\/)Startup(?:\\|\/)/i.test(path))
    || (task && temporary && /같은\s*임시\s*파일/.test(description)))) return PATTERNS[2];
  return null;
}

/** Wazuh 경보 한 건만 순수 계산하며 파일·패키지·네트워크를 사용하지 않는다. */
export function decide(alert) {
  const level = Number(alert?.rule?.level);
  const ids = mitreIds(alert);
  const related = ids.includes('T1543') || ids.includes('T1053');
  const pattern = matchingPattern(alert);
  const actorKnown = Boolean(text(alert?.data?.srcip) && text(alert?.data?.srcuser));

  if (pattern && related && Number.isFinite(level) && level >= 10 && actorKnown) {
    return { action: 'block', confidence: 0.94, reason: pattern.name };
  }
  if (pattern) {
    return { action: 'alert', confidence: 0.68, reason: pattern.name };
  }
  if (related && Number.isFinite(level) && level >= 5) {
    return { action: 'alert', confidence: 0.55, reason: PATTERNS[3].name };
  }
  return { action: 'record', confidence: 0.1, reason: 'no_matching_persistence_pattern' };
}
