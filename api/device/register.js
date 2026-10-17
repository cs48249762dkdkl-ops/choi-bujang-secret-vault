import { createDeviceApiContext } from '../../src/device-api.mjs';

const DEVICE_ID = /^[0-9a-f]{16}$/u;

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Allow', 'POST');

  if (request.method !== 'POST') {
    return response.status(405).json({
      error: 'METHOD_NOT_ALLOWED'
    });
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
    return response.status(400).json({
      error: 'INVALID_JSON'
    });
  }

  const deviceId = body.deviceId;

  if (typeof deviceId !== 'string' || !DEVICE_ID.test(deviceId)) {
    return response.status(400).json({
      error: 'INVALID_DEVICE_ID',
      message: '기기 ID 형식이 올바르지 않습니다.'
    });
  }

  const { data: existing, error: lookupError } = await context.supabase
    .from('registered_devices')
    .select('device_id, owner_id, approval_status')
    .eq('device_id', deviceId)
    .maybeSingle();

  if (lookupError) {
    return response.status(500).json({
      error: 'DEVICE_LOOKUP_FAILED'
    });
  }

  if (existing) {
    if (existing.owner_id !== context.identity.userId) {
      return response.status(409).json({
        error: 'DEVICE_ALREADY_REGISTERED'
      });
    }

    return response.status(200).json({
      registered: true,
      approvalStatus: existing.approval_status,
      deviceProofVerified: false
    });
  }

  const { error: insertError } = await context.supabase
    .from('registered_devices')
    .insert({
      device_id: deviceId,
      owner_id: context.identity.userId,
      approval_status: 'pending',
      approved_at: null
    });

  if (insertError) {
    return response.status(500).json({
      error: 'DEVICE_REGISTER_FAILED'
    });
  }

  return response.status(201).json({
    registered: true,
    approvalStatus: 'pending',
    deviceProofVerified: false
  });
}
