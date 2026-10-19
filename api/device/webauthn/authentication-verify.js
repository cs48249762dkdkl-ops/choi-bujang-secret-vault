import { createDeviceApiContext } from '../../../src/device-api.mjs';
import { verifyAndUpdateAuthentication } from '../../../src/webauthn.mjs';

const DEVICE_ID = /^[0-9a-f]{16}$/u;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Allow', 'POST');

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const context = await createDeviceApiContext(request);

  if (context.errorStatus) {
    return response.status(context.errorStatus).json({
      error: context.error,
    });
  }

  let body;

  try {
    body = typeof request.body === 'object' && request.body !== null
      ? request.body
      : JSON.parse(request.body || '{}');
  } catch {
    return response.status(400).json({ error: 'INVALID_JSON' });
  }

  const { deviceId, challengeId, credentialResponse } = body;

  if (typeof deviceId !== 'string' || !DEVICE_ID.test(deviceId)) {
    return response.status(400).json({ error: 'INVALID_DEVICE_ID' });
  }

  if (typeof challengeId !== 'string' || !UUID.test(challengeId)) {
    return response.status(400).json({ error: 'INVALID_CHALLENGE_ID' });
  }

  if (!credentialResponse || typeof credentialResponse !== 'object') {
    return response.status(400).json({
      error: 'INVALID_AUTHENTICATION_RESPONSE',
    });
  }

  const ownerId = context.identity.userId;
  const { data: device, error: deviceError } = await context.supabase
    .from('registered_devices')
    .select('device_id, approval_status')
    .eq('device_id', deviceId)
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (deviceError) {
    return response.status(500).json({ error: 'DEVICE_LOOKUP_FAILED' });
  }

  if (!device) {
    return response.status(403).json({ error: 'DEVICE_NOT_REGISTERED' });
  }

  if (device.approval_status !== 'approved') {
    return response.status(403).json({ error: 'DEVICE_APPROVAL_REQUIRED' });
  }

  try {
    const result = await verifyAndUpdateAuthentication({
      supabase: context.supabase,
      ownerId,
      deviceId,
      challengeId,
      response: credentialResponse,
    });

    return response.status(200).json(result);
  } catch (error) {
    const statusByError = {
      INVALID_OWNER_ID: 400,
      INVALID_DEVICE_ID: 400,
      INVALID_CHALLENGE_ID: 400,
      INVALID_AUTHENTICATION_RESPONSE: 400,
      WEBAUTHN_CHALLENGE_INVALID_OR_EXPIRED: 401,
      WEBAUTHN_CHALLENGE_ALREADY_CONSUMED: 401,
      WEBAUTHN_AUTHENTICATION_VERIFICATION_FAILED: 401,
      WEBAUTHN_AUTHENTICATION_NOT_VERIFIED: 401,
      WEBAUTHN_CREDENTIAL_NOT_FOUND: 401,
      WEBAUTHN_COUNTER_INVALID: 401,
      WEBAUTHN_CREDENTIAL_UPDATE_CONFLICT: 409,
    };

    const status = statusByError[error?.message] ?? 500;

    const safeErrors = new Set([
      ...Object.keys(statusByError),
      'WEBAUTHN_CHALLENGE_LOOKUP_FAILED',
      'WEBAUTHN_CHALLENGE_CONSUME_FAILED',
      'WEBAUTHN_CREDENTIAL_LOOKUP_FAILED',
      'WEBAUTHN_CREDENTIAL_DATA_INVALID',
      'WEBAUTHN_CREDENTIAL_UPDATE_FAILED',
    ]);

    return response.status(status).json({
      error: safeErrors.has(error?.message)
        ? error.message
        : 'WEBAUTHN_AUTHENTICATION_FAILED',
    });
  }
}
