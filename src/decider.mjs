
const ALLOWED_REQUEST_KEYS = new Set([
  'schema', 'requestId', 'classId', 'projectId', 'subjectId',
  'deviceId', 'service', 'method', 'path', 'route',
  'queryLength', 'querySha256', 'at', 'policyRevision',
  'deviceRegistered', 'stepUp', 'recentEvents', 'signals',
]);

export const RULE_IDS = Object.freeze([
  'device_registered',
  'step_up_required',
  'resource_zone',
]);

function validRequest(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    return false;
  }

  if (Object.keys(request).some((key) => !ALLOWED_REQUEST_KEYS.has(key))) {
    return false;
  }

  const requiredKeys = [
    'schema', 'requestId', 'classId', 'projectId', 'subjectId',
    'deviceId', 'service', 'method', 'path', 'route',
    'queryLength', 'querySha256', 'at', 'policyRevision',
    'deviceRegistered', 'stepUp', 'recentEvents', 'signals',
  ];

  if (requiredKeys.some((key) =>
    !Object.prototype.hasOwnProperty.call(request, key)
  )) {
    return false;
  }

  const nonEmptyStrings = [
    'classId', 'projectId', 'subjectId', 'service',
    'method', 'path', 'route',
  ];

  if (
    nonEmptyStrings.some((key) =>
      typeof request[key] !== 'string' || request[key].trim() === ''
    )
    || request.schema !== 'aleph.decision.v1'
    || typeof request.requestId !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request.requestId)
    || typeof request.at !== 'string'
    || !Number.isFinite(Date.parse(request.at))
    || !request.at.endsWith('Z')
    || Math.abs(Date.now() - Date.parse(request.at)) > 5000
    || typeof request.deviceRegistered !== 'boolean'
    || !Number.isInteger(request.policyRevision)
    || request.policyRevision < 0
    || typeof request.deviceId !== 'string'
    || !/^[0-9a-f]{16}$/.test(request.deviceId)
    || !Number.isInteger(request.queryLength)
    || request.queryLength < 0
    || typeof request.querySha256 !== 'string'
    || !/^[0-9a-f]{64}$/.test(request.querySha256)
    || !Array.isArray(request.recentEvents)
    || request.recentEvents.length > 12
  ) {
    return false;
  }

  if (!request.recentEvents.every((event) =>
    event !== null
    && typeof event === 'object'
    && !Array.isArray(event)
    && Object.keys(event).every((key) =>
      ['kind', 'ageSeconds', 'count'].includes(key)
    )
    && typeof event.kind === 'string'
    && event.kind.trim() !== ''
    && Number.isFinite(event.ageSeconds)
    && event.ageSeconds >= 0
    && Number.isFinite(event.count)
    && event.count >= 0
  )) {
    return false;
  }

  const stepUp = request.stepUp;
  if (
    !stepUp
    || typeof stepUp !== 'object'
    || Array.isArray(stepUp)
    || Object.keys(stepUp).some((key) =>
      !['verified', 'authAgeSeconds'].includes(key)
    )
    || typeof stepUp.verified !== 'boolean'
    || (
      stepUp.verified === false
      && stepUp.authAgeSeconds !== null
    )
    || (
      stepUp.verified === true
      && (
        !Number.isFinite(stepUp.authAgeSeconds)
        || stepUp.authAgeSeconds < 0
        || stepUp.authAgeSeconds > 900
      )
    )
  ) {
    return false;
  }

  const signals = request.signals;
  if (
    !signals
    || typeof signals !== 'object'
    || Array.isArray(signals)
    || Object.keys(signals).some((key) =>
      !['source', 'region', 'network', 'hour'].includes(key)
    )
    || typeof signals.source !== 'string'
    || typeof signals.region !== 'string'
    || typeof signals.network !== 'string'
    || !Number.isInteger(signals.hour)
    || signals.hour < 0
    || signals.hour > 23
  ) {
    return false;
  }

  return true;
}

export async function decide(request) {
  // 입력이 계약과 맞지 않으면 기본 허용하지 않는다.
  // 운영 등록부의 reasonCode 목록은 별도로 확인해야 한다.
  if (!validRequest(request)) {
    return {
      schema: 'aleph.decision.v1',
      requestId: request?.requestId,
      decision: 'deny',
      reasonCode: 'device_not_registered',
      ruleIds: ['device_registered'],
    };
  }

  // Stage 8: 노트 영역과 허용된 경로 모양을 명시적으로 검사한다.
  // GET /notes 목록 경로와 다른 서비스 영역은 허용하지 않는다.
  const pathAllowed = request.service === 'notes' && (
    (
      request.method === 'GET'
      && request.path === '/notes'
      && request.route === 'GET /notes'
    )
    || (
      request.method === 'POST'
      && request.path === '/notes'
      && request.route === 'POST /notes'
    )
    || (
      ['GET', 'PUT', 'DELETE'].includes(request.method)
      && /^\/notes\/[A-Za-z0-9_-]+$/.test(request.path)
      && request.route === `${request.method} /notes/:id`
    )
  );

  if (!pathAllowed) {
    return {
      schema: 'aleph.decision.v1',
      requestId: request.requestId,
      decision: 'deny',
      reasonCode: 'device_not_registered',
      ruleIds: ['resource_zone'],
    };
  }

  const registered = request.deviceRegistered === true;

  let decision = 'allow';
  let reasonCode = 'approved';
  let ruleIds = ['device_registered'];

  if (!registered) {
    decision = 'deny';
    reasonCode = 'device_not_registered';
    ruleIds = ['device_registered'];
  } else {
    const unusualTime = request.signals.hour < 6
      || request.signals.hour >= 23;
    const unusualNetwork = request.signals.network === 'unusual';
    const highVolumeReads = request.recentEvents.some((event) =>
      event.kind === 'risk_signal'
      && event.ageSeconds <= 60
      && event.count >= 20
    );

    const needsStepUp = unusualTime
      && unusualNetwork
      && highVolumeReads;

    if (needsStepUp) {
      const stepUp = request.stepUp;
      const verifiedRecently = stepUp.verified === true
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
