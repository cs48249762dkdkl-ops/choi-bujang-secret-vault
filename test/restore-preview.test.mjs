import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createNoteBackupManifest } from '../src/restore-verify.mjs';
import { createRestorePreview } from '../src/restore-preview.mjs';

const backupNote = {
  id: 'test-note-001',
  ownerId: 'test-user-b',
  title: '원본 제목',
  body: '원본 내용',
};

function makeBackup(note = backupNote) {
  return {
    version: 'backup-v1',
    note,
    manifest: createNoteBackupManifest(note),
  };
}

test('백업을 다시 읽고 변경 항목을 미리 보여 준다', async () => {
  let reads = 0;
  const result = await createRestorePreview({
    readBackup: async () => {
      reads += 1;
      return makeBackup();
    },
    currentNote: { ...backupNote, title: '변경된 제목' },
    expectedVersion: 'backup-v1',
  });

  assert.equal(reads, 1);
  assert.equal(result.ready, true);
  assert.equal(result.status, 'PREVIEW_ONLY');
  assert.equal(result.restored, false);
  assert.deepEqual(result.changes, [{
    field: 'title',
    current: '변경된 제목',
    restored: '원본 제목',
  }]);
});

test('백업이 없으면 차단한다', async () => {
  const result = await createRestorePreview({
    readBackup: async () => null,
    currentNote: backupNote,
    expectedVersion: 'backup-v1',
  });

  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reason, 'S10_BACKUP_UNVERIFIED');
});

test('백업 버전이 다르면 차단한다', async () => {
  const result = await createRestorePreview({
    readBackup: async () => makeBackup(),
    currentNote: backupNote,
    expectedVersion: 'backup-v2',
  });

  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reason, 'S10_BACKUP_UNVERIFIED');
});

test('백업 내용이 변조되면 차단한다', async () => {
  const backup = makeBackup();
  backup.note.body = '변조된 내용';

  const result = await createRestorePreview({
    readBackup: async () => backup,
    currentNote: backupNote,
    expectedVersion: 'backup-v1',
  });

  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reason, 'S10_BACKUP_UNVERIFIED');
});

test('노트 ID 또는 소유자가 다르면 차단한다', async () => {
  for (const currentNote of [
    { ...backupNote, id: 'other-note' },
    { ...backupNote, ownerId: 'test-user-a' },
  ]) {
    const result = await createRestorePreview({
      readBackup: async () => makeBackup(),
      currentNote,
      expectedVersion: 'backup-v1',
    });

    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.reason, 'S10_RESTORE_MISMATCH');
  }
});
