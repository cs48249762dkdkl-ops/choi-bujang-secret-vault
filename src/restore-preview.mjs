import { verifyNoteBackup } from './restore-verify.mjs';

/**
 * Re-read and verify a backup before showing a single-note restore preview.
 * This module never writes to notes or policies.
 */
export async function createRestorePreview({
  readBackup,
  currentNote,
  expectedVersion,
}) {
  if (typeof readBackup !== 'function') {
    return {
      ready: false,
      status: 'BLOCKED',
      reason: 'S10_BACKUP_UNVERIFIED',
    };
  }

  let backupRecord;

  try {
    // Re-read the backup on every preview request.
    backupRecord = await readBackup();
  } catch {
    return {
      ready: false,
      status: 'BLOCKED',
      reason: 'S10_BACKUP_UNVERIFIED',
    };
  }

  if (
    !backupRecord ||
    typeof backupRecord.version !== 'string' ||
    !backupRecord.note ||
    !backupRecord.manifest ||
    typeof expectedVersion !== 'string' ||
    backupRecord.version !== expectedVersion
  ) {
    return {
      ready: false,
      status: 'BLOCKED',
      reason: 'S10_BACKUP_UNVERIFIED',
    };
  }

  const verification = verifyNoteBackup(
    backupRecord.note,
    backupRecord.manifest,
  );

  if (!verification.valid) {
    return {
      ready: false,
      status: 'BLOCKED',
      reason: 'S10_BACKUP_UNVERIFIED',
    };
  }

  if (
    !currentNote ||
    currentNote.id !== backupRecord.note.id ||
    currentNote.ownerId !== backupRecord.note.ownerId
  ) {
    return {
      ready: false,
      status: 'BLOCKED',
      reason: 'S10_RESTORE_MISMATCH',
    };
  }

  const changes = [];

  for (const field of ['title', 'body']) {
    if (currentNote[field] !== backupRecord.note[field]) {
      changes.push({
        field,
        current: currentNote[field],
        restored: backupRecord.note[field],
      });
    }
  }

  return {
    ready: true,
    status: 'PREVIEW_ONLY',
    version: backupRecord.version,
    noteId: backupRecord.note.id,
    ownerId: backupRecord.note.ownerId,
    changes,
    restored: false,
  };
}
