import { createDeviceApiContext } from '../../../src/device-api.mjs';
import { verifyAndStoreRegistration } from '../../../src/webauthn.mjs';

const DEVICE_ID = /^[0-9a-f]{16}$/u;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Allow', 'POST');

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const context = await createDeviceApiContext(request);

  if (context.errorStatus) {
    return response.status(context.errorStatus).json({
      error: context.error
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

  const { deviceId, challengeId, response: credentialResponse } = body;

  if (typeof deviceId !== 'string' || !DEVICE_ID.test(deviceId)) {
    return response.status(400).json({ error: 'INVALID_DEVICE_ID' });
  }

  if (typeof challengeId !== 'string' || !UUID.test(challengeId)) {
    return response.status(400).json({ error: 'INVALID_CHALLENGE_ID' });
  }

  if (!credentialResponse || typeof credentialResponse !== 'object' ||
      Array.isArray(credentialResponse)) {
    return response.status(400).json({ error: 'INVALID_REGISTRATION_RESPONSE' });
  }

  const ownerId = context.identity.userId;

  const { data: device, error: deviceError } = await context.supabase
    .from('registered_devices')
    .select('device_id, owner_id, approval_status')
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
    const result = await verifyAndStoreRegistration({
      supabase: context.supabase,
      ownerId,
      deviceId,
      challengeId,
      response: credentialResponse
    });

    return response.status(200).json(result);
  } catch (error) {
    const knownErrors = new Set([
      'INVALID_OWNER_ID',
      'INVALID_DEVICE_ID',
      'INVALID_CHALLENGE_ID',
      'INVALID_REGISTRATION_RESPONSE',
      'WEBAUTHN_CHALLENGE_LOOKUP_FAILED',
      'WEBAUTHN_CHALLENGE_INVALID_OR_EXPIRED',
      'WEBAUTHN_CHALLENGE_CONSUME_FAILED',
      'WEBAUTHN_CHALLENGE_ALREADY_CONSUMED',
      'WEBAUTHN_REGISTRATION_VERIFICATION_FAILED',
      'WEBAUTHN_REGISTRATION_NOT_VERIFIED',
      'WEBAUTHN_CREDENTIAL_DATA_INVALID',
      'WEBAUTHN_CREDENTIAL_SAVE_FAILED'
    ]);

    const code = knownErrors.has(error?.message)
      ? error.message
      : 'WEBAUTHN_REGISTRATION_FAILED';

    const status = code === 'WEBAUTHN_CHALLENGE_INVALID_OR_EXPIRED' ||
      code === 'WEBAUTHN_CHALLENGE_ALREADY_CONSUMED'
      ? 409
      : code === 'WEBAUTHN_REGISTRATION_VERIFICATION_FAILED' ||
        code === 'WEBAUTHN_REGISTRATION_NOT_VERIFIED' ||
        code === 'WEBAUTHN_CREDENTIAL_DATA_INVALID'
        ? 400
        : 500;

    return response.status(status).json({ error: code });
  }
}