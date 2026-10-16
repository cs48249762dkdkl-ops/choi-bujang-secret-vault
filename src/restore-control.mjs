/**
 * Safe restore gate.
 * This module never changes notes or policies.
 * A caller must provide an independently trusted backup
 * and a verifier before any restore callback can run.
 */
export async function runRestoreGate({
  backup,
  verifyBackup,
  restoreOne,
}) {
  if (backup == null) {
    return { restored: false, status: 'BLOCKED', reason: 'S10_BACKUP_UNVERIFIED' };
  }

  if (typeof verifyBackup !== 'function' ||
      typeof restoreOne !== 'function') {
    return { restored: false, status: 'BLOCKED', reason: 'INVALID_CONFIGURATION' };
  }

  let verification;
  try {
    verification = await verifyBackup(backup);
  } catch {
    return { restored: false, status: 'BLOCKED', reason: 'S10_BACKUP_UNVERIFIED' };
  }

  if (verification?.valid !== true) {
    return { restored: false, status: 'BLOCKED', reason: 'S10_BACKUP_UNVERIFIED' };
  }

  // This gate intentionally does not call a production restore API.
  // A separate, explicitly reviewed single-record restore implementation is required.
  return {
    restored: false,
    status: 'VERIFIED_BUT_NOT_RESTORED',
    reason: 'RESTORE_IMPLEMENTATION_REQUIRED',
  };
}
