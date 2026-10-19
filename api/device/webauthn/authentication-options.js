import { createDeviceApiContext } from '../../../src/device-api.mjs';
import { createAuthenticationOptions } from '../../../src/webauthn.mjs';

const DEVICE_ID = /^[0-9a-f]{16}$/u;

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

  const deviceId = body.deviceId;

  if (typeof deviceId !== 'string' || !DEVICE_ID.test(deviceId)) {
    return response.status(400).json({ error: 'INVALID_DEVICE_ID' });
  }

  const ownerId = context.identity.userId;
  const { data: device, error } = await context.supabase
    .from('registered_devices')
    .select('device_id, approval_status')
    .eq('device_id', deviceId)
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (error) {
    return response.status(500).json({ error: 'DEVICE_LOOKUP_FAILED' });
  }

  if (!device) {
    return response.status(403).json({ error: 'DEVICE_NOT_REGISTERED' });
  }

  if (device.approval_status !== 'approved') {
    return response.status(403).json({ error: 'DEVICE_APPROVAL_REQUIRED' });
  }

  try {
    const result = await createAuthenticationOptions({
      supabase: context.supabase,
      ownerId,
      deviceId,
    });

    return response.status(200).json(result);
  } catch (error) {
    const knownErrors = new Set([
      'INVALID_OWNER_ID',
      'INVALID_DEVICE_ID',
      'WEBAUTHN_CREDENTIAL_LOOKUP_FAILED',
      'WEBAUTHN_CREDENTIAL_NOT_FOUND',
      'WEBAUTHN_CHALLENGE_CREATE_FAILED',
    ]);

    return response.status(500).json({
      error: knownErrors.has(error?.message)
        ? error.message
        : 'WEBAUTHN_OPTIONS_FAILED',
    });
  }
}
