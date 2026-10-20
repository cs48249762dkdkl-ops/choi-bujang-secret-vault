import { checkDeviceApproval } from './device-approval.mjs';
import { verifyDeviceSessionToken } from './device-session.mjs';

export async function checkDeviceAccess({ cookieHeader, ownerId, supabase }) {
  const cookieMatch = (cookieHeader || '').match(
    /(?:^|;\s*)device_session=([^;]+)/u
  );

  if (!cookieMatch) {
    return { allowed: false, error: 'DEVICE_SESSION_REQUIRED' };
  }

  let deviceSession;

  try {
    deviceSession = await verifyDeviceSessionToken(cookieMatch[1]);
  } catch {
    return { allowed: false, error: 'DEVICE_SESSION_INVALID' };
  }

  if (deviceSession.ownerId !== ownerId) {
    return { allowed: false, error: 'DEVICE_SESSION_USER_MISMATCH' };
  }

  const approval = await checkDeviceApproval({
    supabase,
    ownerId,
    deviceId: deviceSession.deviceId
  });

  if (!approval.approved) {
    return {
      allowed: false,
      error: 'DEVICE_APPROVAL_REQUIRED',
      approvalStatus: approval.status
    };
  }

  return { allowed: true, approvalStatus: 'approved' };
}
