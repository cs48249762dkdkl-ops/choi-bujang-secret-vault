import { createDeviceApiContext } from '../../src/device-api.mjs';
import { isDeviceAdmin } from '../../src/device-admin.mjs';
import { approvePendingDevice } from '../../src/device-approval-admin.mjs';

export function createDeviceApprovalHandler({
  getContext = createDeviceApiContext,
  getAllowedUserIds = () => process.env.DEVICE_ADMIN_USER_IDS,
  approveDevice = approvePendingDevice
} = {}) {
  return async function handler(request, response) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Allow', 'POST');

    if (request.method !== 'POST') {
      return response.status(405).json({
        error: 'METHOD_NOT_ALLOWED'
      });
    }

    const context = await getContext(request);

    if (context.errorStatus) {
      return response.status(context.errorStatus).json({
        error: context.error
      });
    }

    if (!isDeviceAdmin(
      context.identity,
      getAllowedUserIds()
    )) {
      return response.status(403).json({
        error: 'DEVICE_ADMIN_REQUIRED'
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

    const result = await approveDevice({
      supabase: context.supabase,
      deviceId: body.deviceId
    });

    return response.status(result.status).json(result.body);
  };
}

export default createDeviceApprovalHandler();
