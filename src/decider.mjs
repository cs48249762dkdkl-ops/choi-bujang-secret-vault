// ALEPH SDP 엔진이 확인한 요청만 받는 학생 판정기.
// 브라우저가 보낸 사용자 번호, 역할, 기기 상태를 별도로 신뢰하지 않습니다.

export const RULE_IDS = Object.freeze([
  'device_registered',
  'step_up_required',
]);

export async function decide(request) {
  const registered = request.deviceRegistered === true;

  let decision = 'allow';
  let reasonCode = 'approved';
  let ruleIds = ['device_registered'];

  if (!registered) {
    decision = 'deny';
    reasonCode = 'device_not_registered';
    ruleIds = ['device_registered'];
  } else {
    const events = Array.isArray(request.recentEvents)
      ? request.recentEvents
      : [];

    const needsStepUp = events.some((event) =>
      event?.kind === 'risk_signal'
      && Number.isFinite(event.ageSeconds)
      && event.ageSeconds >= 0
      && event.ageSeconds <= 60
      && Number.isFinite(event.count)
      && event.count >= 20
    );

    if (needsStepUp) {
      const stepUp = request.stepUp;

      const verifiedRecently = stepUp?.verified === true
        && Number.isFinite(stepUp.authAgeSeconds)
        && stepUp.authAgeSeconds >= 0
        && stepUp.authAgeSeconds <= 900;

      if (!verifiedRecently) {
        decision = 'step_up';
        reasonCode = 'step_up_required';
        ruleIds = ['step_up_required'];
      }
    }
  }

  return {
    schema: 'aleph.decision.v1',
    requestId: request.requestId,
    decision,
    reasonCode,
    ruleIds,
  };
}
