/**
 * Safe restore gate.
 *
 * Backup consistency alone does not prove provenance.
 * Actual restore remains blocked unless an independent
 * trust check and before/after verification are provided.
 */
export async function runRestoreGate({
  backup,
  verifyBackup,
  verifyTrust,
  restoreOne,
  verifyAfterRestore,
}) {
  if (backup == null) {
    return {
      restored: false,
      status: 'BLOCKED',
      reason: 'S10_BACKUP_UNVERIFIED',
    };
  }

  if (
    typeof verifyBackup !== 'function' ||
    typeof verifyTrust !== 'function' ||
    typeof restoreOne !== 'function' ||
    typeof verifyAfterRestore !== 'function'
  ) {
    return {
      restored: false,
      status: 'BLOCKED',
      reason: 'INVALID_CONFIGURATION',
    };
  }

  let backupVerification;
  let trustVerification;

  try {
    backupVerification = await verifyBackup(backup);

    if (backupVerification?.valid !== true) {
      return {
        restored: false,
        status: 'BLOCKED',
        reason: 'S10_BACKUP_UNVERIFIED',
      };
    }

    trustVerification = await verifyTrust(backup);
  } catch {
    return {
      restored: false,
      status: 'BLOCKED',
      reason: 'S10_BACKUP_UNVERIFIED',
    };
  }

  if (trustVerification?.trusted !== true) {
    return {
      restored: false,
      status: 'BLOCKED',
      reason: 'S10_BACKUP_UNVERIFIED',
    };
  }

  // Do not execute an operational restore until a separately
  // reviewed single-record implementation is available.
  return {
    restored: false,
    status: 'VERIFIED_BUT_NOT_RESTORED',
    reason: 'RESTORE_IMPLEMENTATION_REQUIRED',
  };
}
