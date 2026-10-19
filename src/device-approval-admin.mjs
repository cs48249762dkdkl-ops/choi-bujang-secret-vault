const DEVICE_ID = /^[0-9a-f]{16}$/u;

export async function approvePendingDevice({
  supabase,
  deviceId,
  now = () => new Date().toISOString()
}) {
  if (typeof deviceId !== 'string' || !DEVICE_ID.test(deviceId)) {
    return { status: 400, body: { error: 'INVALID_DEVICE_ID' } };
  }

  const { data: device, error: lookupError } = await supabase
    .from('registered_devices')
    .select('device_id, owner_id, approval_status')
    .eq('device_id', deviceId)
    .maybeSingle();

  if (lookupError) {
    return { status: 500, body: { error: 'DEVICE_LOOKUP_FAILED' } };
  }

  if (!device) {
    return { status: 404, body: { error: 'DEVICE_NOT_FOUND' } };
  }

  if (device.approval_status !== 'pending') {
    return {
      status: 409,
      body: {
        error: 'DEVICE_NOT_PENDING',
        approvalStatus: device.approval_status
      }
    };
  }

  const approvedAt = now();

  const { data: updated, error: updateError } = await supabase
    .from('registered_devices')
    .update({
      approval_status: 'approved',
      approved_at: approvedAt
    })
    .eq('device_id', deviceId)
    .eq('owner_id', device.owner_id)
    .eq('approval_status', 'pending')
    .select('device_id, owner_id, approval_status, approved_at')
    .maybeSingle();

  if (updateError) {
    return { status: 500, body: { error: 'DEVICE_APPROVAL_FAILED' } };
  }

  if (!updated) {
    return { status: 409, body: { error: 'DEVICE_STATE_CHANGED' } };
  }

  return {
    status: 200,
    body: {
      approved: true,
      deviceId: updated.device_id,
      approvalStatus: updated.approval_status,
      approvedAt: updated.approved_at
    }
  };
}
