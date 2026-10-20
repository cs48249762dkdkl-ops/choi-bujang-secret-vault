import { createDeviceApiContext } from '../../src/device-api.mjs';
import { checkDeviceAccess } from '../../src/device-access.mjs';

const DEVICE_ID = /^[0-9a-f]{16}$/u;

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Allow', 'GET');

  if (request.method !== 'GET') {
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

  const deviceId = new URL(
    request.url,
    `https://${request.headers.host}`
  ).searchParams.get('deviceId');

  if (!deviceId) {
    const access = await checkDeviceAccess({
      cookieHeader: request.headers.cookie,
      ownerId: context.identity.userId,
      supabase: context.supabase
    });

    if (!access.allowed) {
      return response.status(403).json({
        error: access.error,
        ...(access.approvalStatus && {
          approvalStatus: access.approvalStatus
        }),
        deviceProofVerified: false
      });
    }

    return response.status(200).json({
      registered: true,
      approvalStatus: 'approved',
      deviceProofVerified: true
    });
  }

  if (!DEVICE_ID.test(deviceId)) {
    return response.status(400).json({
      error: 'INVALID_DEVICE_ID'
    });
  }

  const { data, error } = await context.supabase
    .from('registered_devices')
    .select('device_id, owner_id, approval_status, approved_at')
    .eq('device_id', deviceId)
    .eq('owner_id', context.identity.userId)
    .maybeSingle();

  if (error) {
    return response.status(500).json({
      error: 'DEVICE_STATUS_LOOKUP_FAILED'
    });
  }

  if (!data) {
    return response.status(200).json({
      registered: false,
      approvalStatus: 'not_registered',
      deviceProofVerified: false
    });
  }

  return response.status(200).json({
    registered: true,
    approvalStatus: data.approval_status,
    approvedAt: data.approved_at,
    deviceProofVerified: false
  });
}
