import { createHash } from 'node:crypto';

function sha256(value) {
  return createHash('sha256')
    .update(value, 'utf8')
    .digest('hex');
}

function validString(value) {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Compares a note with a claimed backup manifest.
 * This checks consistency only; it does not establish backup provenance.
 */
export function verifyNoteBackup(note, manifest) {
  if (!note || typeof note !== 'object' ||
      !manifest || typeof manifest !== 'object') {
    return { valid: false, reason: 'INVALID_INPUT' };
  }

  if (
    !validString(note.id) ||
    !validString(note.ownerId) ||
    typeof note.title !== 'string' ||
    typeof note.body !== 'string'
  ) {
    return { valid: false, reason: 'INVALID_NOTE' };
  }

  if (
    !validString(manifest.id) ||
    !validString(manifest.ownerId) ||
    !/^[a-f0-9]{64}$/u.test(manifest.contentSha256 ?? '')
  ) {
    return { valid: false, reason: 'INVALID_MANIFEST' };
  }

  if (note.id !== manifest.id) {
    return { valid: false, reason: 'ID_MISMATCH' };
  }

  if (note.ownerId !== manifest.ownerId) {
    return { valid: false, reason: 'OWNER_MISMATCH' };
  }

  const content = JSON.stringify({
    title: note.title,
    body: note.body,
  });

  if (sha256(content) !== manifest.contentSha256) {
    return { valid: false, reason: 'CONTENT_HASH_MISMATCH' };
  }

  return { valid: true, reason: 'MATCH' };
}

export function createNoteBackupManifest(note) {
  if (
    !note ||
    !validString(note.id) ||
    !validString(note.ownerId) ||
    typeof note.title !== 'string' ||
    typeof note.body !== 'string'
  ) {
    throw new TypeError('INVALID_NOTE');
  }

  const content = JSON.stringify({
    title: note.title,
    body: note.body,
  });

  return {
    id: note.id,
    ownerId: note.ownerId,
    contentSha256: sha256(content),
  };
}
