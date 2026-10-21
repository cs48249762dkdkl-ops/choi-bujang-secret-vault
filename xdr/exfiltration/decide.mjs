// 격리 심판은 이 파일 하나만 불러오므로 patterns.json의 근거를 상수로 고정한다.
export const PATTERNS = Object.freeze([
  Object.freeze({
    name: 'c2_bulk_transfer',
    conditions: '명령 통로로 처음 보는 목적지에 큰 파일을 실제 반복 전송했고 전송량이 50000000바이트 이상이다.',
    rationale: 'MITRE ATT&CK T1041: 기존 명령·제어 통로로 자료를 보내는 것은 알려진 유출 방식이다.',
  }),
  Object.freeze({
    name: 'repeated_bulk_transfer',
    conditions: '같은 목적지로 큰 전송이 8번 이상 반복됐고 전송량이 50000000바이트 이상이다.',
    rationale: 'MITRE ATT&CK T1041·T1048: 단일 소량 전송보다 같은 목적지로 반복된 대량 전송은 유출 의심을 강하게 한다.',
  }),
  Object.freeze({
    name: 'unusual_port_bulk_transfer',
    conditions: '평소 쓰지 않던 포트로 50000000바이트 이상 자료를 실제 전송했다.',
    rationale: 'MITRE ATT&CK T1048: 평소와 다른 통신 경로의 대량 외부 전송은 대체 프로토콜 유출의 조사 신호다.',
  }),
  Object.freeze({
    name: 'external_repository_copy',
    conditions: '자료실 전체를 외부 주소로 복사했고 전송량이 50000000바이트 이상이다.',
    rationale: 'MITRE ATT&CK T1041·T1048: 외부 목적지로 자료 전체를 옮기는 것은 통신 경로와 함께 확인할 유출 신호다.',
  }),
  Object.freeze({
    name: 'off_hours_archive_transfer',
    conditions: '업무·수업 시간 밖에 압축 파일을 처음 보는 목적지로 실제 전송했고 전송량이 50000000바이트 이상이다.',
    rationale: 'MITRE ATT&CK T1048: 압축만으로 단정하지 않고 낯선 목적지·시간·대량 전송을 결합해 조사한다.',
  }),
  Object.freeze({
    name: 'unfamiliar_bulk_destination',
    conditions: '처음 보는 목적지로 50000000바이트 이상 자료가 실제 전송됐다.',
    rationale: 'MITRE ATT&CK T1041·T1048: 낯선 목적지에 대한 대량 송신은 유출 가능성을 뒷받침한다.',
  }),
  Object.freeze({
    name: 'unconfirmed_exfiltration_signal',
    conditions: 'T1041·T1048 관련 경보 수준이 5 이상이나 위의 완료된 대량 전송 조건이 확인되지 않는다.',
    rationale: 'MITRE ATT&CK T1041·T1048: 실패·소량·정상 목적지의 단서만으로 목적지를 차단하지 않고 조사한다.',
  }),
]);

function text(value) {
  return typeof value === 'string' ? value : '';
}

function techniqueIds(alert) {
  const value = alert?.rule?.mitre;
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.id)) return value.id;
  return typeof value?.id === 'string' ? [value.id] : [];
}

function validIpv4(value) {
  if (typeof value !== 'string') return false;
  const parts = value.split('.');
  return parts.length === 4 && parts.every((part) =>
    /^\d{1,3}$/.test(part) && Number(part) <= 255 && String(Number(part)) === part);
}

function matchingPattern(alert) {
  const description = text(alert?.rule?.description);
  const bytes = Number(alert?.data?.bytes);
  const count = Number(alert?.data?.count);
  if (!Number.isFinite(bytes) || bytes < 50_000_000) return null;
  if (/수업\s*자료\s*주소|평소\s*목적지|전송(?:은)?\s*아직\s*없|전송이\s*실패|승인된|정기\s*백업|교육용\s*시험/i.test(description)) return null;

  const unfamiliar = /처음\s*보는|낯선|평소에\s*쓰지\s*않던|unfamiliar|new\s*destination/i.test(description);
  const completed = /나갔|빠져나|전송됐|올라갔|복사됐|반출됐|유출됐|sent|uploaded|transferred|exfiltrat/i.test(description);
  const external = /외부\s*주소|바깥\s*주소|external/i.test(description);
  const repeated = Number.isFinite(count) && count >= 8 && /같은\s*목적지|반복|전송이\s*\d+번|repeated/i.test(description);

  if (completed && unfamiliar && /명령\s*통로|c2\s*channel/i.test(description) && repeated) return PATTERNS[0];
  if (repeated) return PATTERNS[1];
  if (completed && /쓰지\s*않던\s*포트|unusual\s*port/i.test(description)) return PATTERNS[2];
  if (completed && external && /자료실\s*전체|전체.{0,12}복사|whole\s*repository/i.test(description)) return PATTERNS[3];
  if (completed && unfamiliar && /수업\s*시간\s*밖|업무\s*시간\s*밖|야간|after.hours/i.test(description)
    && /압축\s*파일|\.zip\b|\.7z\b|archive/i.test(description)) return PATTERNS[4];
  if (completed && unfamiliar) return PATTERNS[5];
  return null;
}

/** 경보 한 건을 파일·패키지·네트워크 접근 없이 순수 계산한다. */
export function decide(alert) {
  const level = Number(alert?.rule?.level);
  const ids = techniqueIds(alert);
  const related = ids.includes('T1041') || ids.includes('T1048');
  const pattern = matchingPattern(alert);
  const sourceIp = alert?.data?.srcip;
  const destinationIp = alert?.data?.dstip;
  const account = text(alert?.data?.srcuser);
  const actorKnown = validIpv4(sourceIp) && validIpv4(destinationIp)
    && /^[A-Za-z0-9._:-]{1,80}$/.test(account);

  if (pattern && related && Number.isFinite(level) && level >= 10 && actorKnown) {
    return { action: 'block', confidence: 0.94, reason: pattern.name };
  }
  if (pattern) {
    return { action: 'alert', confidence: 0.7, reason: pattern.name };
  }
  if (related && Number.isFinite(level) && level >= 5) {
    return { action: 'alert', confidence: 0.55, reason: PATTERNS[6].name };
  }
  return { action: 'record', confidence: 0.1, reason: 'no_matching_exfiltration_pattern' };
}
