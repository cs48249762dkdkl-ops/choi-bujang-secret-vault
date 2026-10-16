import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createNoteBackupManifest,
  verifyNoteBackup,
} from '../src/restore-verify.mjs';

const note = {
  id: 'test-note-001',
  ownerId: 'test-user-b',
  title: '복구 테스트',
  body: '원본 내용',
};

test('백업과 자료가 일치하면 검증에 성공한다', () => {
  const manifest = createNoteBackupManifest(note);
  assert.deepEqual(verifyNoteBackup(note, manifest), {
    valid: true,
    reason: 'MATCH',
  });
});

test('자료 ID가 다르면 거부한다', () => {
  const manifest = createNoteBackupManifest(note);
  assert.equal(
    verifyNoteBackup({ ...note, id: 'test-note-002' }, manifest).reason,
    'ID_MISMATCH',
  );
});

test('소유자가 다르면 거부한다', () => {
  const manifest = createNoteBackupManifest(note);
  assert.equal(
    verifyNoteBackup({ ...note, ownerId: 'test-user-a' }, manifest).reason,
    'OWNER_MISMATCH',
  );
});

test('내용이 변경되면 거부한다', () => {
  const manifest = createNoteBackupManifest(note);
  assert.equal(
    verifyNoteBackup({ ...note, body: '변조된 내용' }, manifest).reason,
    'CONTENT_HASH_MISMATCH',
  );
});

test('잘못된 해시 형식의 매니페스트는 거부한다', () => {
  const manifest = createNoteBackupManifest(note);
  assert.equal(
    verifyNoteBackup(note, { ...manifest, contentSha256: 'invalid' }).reason,
    'INVALID_MANIFEST',
  );
});
