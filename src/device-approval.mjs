export function isDeviceApproved(record, ownerId, deviceId) {
  return Boolean(
    record
    && record.owner_id === ownerId
    && record.device_id === deviceId
    && record.approval_status === 'approved'
    && typeof record.approved_at === 'string'
    && Number.isFinite(Date.parse(record.approved_at))
  );
}

export async function checkDeviceApproval({
  supabase,
  ownerId,
  deviceId
}) {
  if (
    typeof deviceId !== 'string'
    || !/^[0-9a-f]{16}$/u.test(deviceId)
  ) {
    return {
      approved: false,
      status: 'not_registered'
    };
  }

  const { data, error } = await supabase
    .from('registered_devices')
    .select('device_id, owner_id, approval_status, approved_at')
    .eq('device_id', deviceId)
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (error) {
    return {
      approved: false,
      status: 'verification_error'
    };
  }

  if (!data) {
    return {
      approved: false,
      status: 'not_registered'
    };
  }

  return {
    approved: isDeviceApproved(data, ownerId, deviceId),
    status: data.approval_status
  };
}
