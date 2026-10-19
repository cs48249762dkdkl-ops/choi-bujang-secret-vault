const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export function isDeviceAdmin(identity, allowedUserIds) {
  if (
    identity?.kind !== 'student' ||
    typeof identity.userId !== 'string' ||
    !UUID.test(identity.userId) ||
    typeof allowedUserIds !== 'string' ||
    !allowedUserIds.trim()
  ) {
    return false;
  }

  const allowed = new Set(
    allowedUserIds
      .split(',')
      .map((id) => id.trim().toLowerCase())
      .filter((id) => UUID.test(id))
  );

  return allowed.has(identity.userId.toLowerCase());
}
