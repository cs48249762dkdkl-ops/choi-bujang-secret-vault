import { createDeviceApiContext } from '../../../src/device-api.mjs';
import { verifyAndUpdateAuthentication } from '../../../src/webauthn.mjs';
import { createDeviceSessionToken } from '../../../src/device-session.mjs';
import { isDeviceApproved } from '../../../src/device-approval.mjs';

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
    .select('device_id, owner_id, approval_status, approved_at')
    .eq('device_id', deviceId)
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (deviceError) {
    return response.status(500).json({ error: 'DEVICE_LOOKUP_FAILED' });
  }

  if (!device) {
    return response.status(403).json({ error: 'DEVICE_NOT_REGISTERED' });
  }

  if (!isDeviceApproved(device, ownerId, deviceId)) {
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

    if (result?.verified !== true) {
      return response.status(401).json({
        error: 'WEBAUTHN_AUTHENTICATION_NOT_VERIFIED'
      });
    }

    const { data: currentDevice, error: currentDeviceError } =
      await context.supabase
        .from('registered_devices')
        .select('device_id, owner_id, approval_status, approved_at')
        .eq('device_id', deviceId)
        .eq('owner_id', ownerId)
        .maybeSingle();

    if (currentDeviceError) {
      return response.status(500).json({
        error: 'DEVICE_APPROVAL_RECHECK_FAILED'
      });
    }

    if (
      !currentDevice ||
      !isDeviceApproved(currentDevice, ownerId, deviceId)
    ) {
      return response.status(403).json({
        error: 'DEVICE_APPROVAL_REQUIRED'
      });
    }

    const sessionToken = await createDeviceSessionToken({
      ownerId,
      deviceId
    });

    response.setHeader(
      'Set-Cookie',
      `device_session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=900`
    );

    return response.status(200).json({
      verified: true,
      sessionExpiresIn: 900
    });
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

