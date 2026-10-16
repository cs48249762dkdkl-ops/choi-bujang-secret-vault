import test from 'node:test';
import assert from 'node:assert/strict';
import { runRestoreGate } from '../src/restore-control.mjs';

test('백업이 없으면 복구를 차단한다', async () => {
  let restoreCalled = false;

  const result = await runRestoreGate({
    backup: null,
    verifyBackup: async () => ({ valid: true }),
    restoreOne: async () => {
      restoreCalled = true;
    },
  });

  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reason, 'S10_BACKUP_UNVERIFIED');
  assert.equal(restoreCalled, false);
});

test('백업 검증 중 오류가 발생하면 복구를 차단한다', async () => {
  let restoreCalled = false;

  const result = await runRestoreGate({
    backup: { id: 'note-1' },
    verifyBackup: async () => {
      throw new Error('verification failed');
    },
    restoreOne: async () => {
      restoreCalled = true;
    },
  });

  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reason, 'S10_BACKUP_UNVERIFIED');
  assert.equal(restoreCalled, false);
});

test('백업 검증에 실패하면 복구를 차단한다', async () => {
  let restoreCalled = false;

  const result = await runRestoreGate({
    backup: { id: 'note-1' },
    verifyBackup: async () => ({ valid: false }),
    restoreOne: async () => {
      restoreCalled = true;
    },
  });

  assert.equal(result.status, 'BLOCKED');
  assert.equal(restoreCalled, false);
});

test('검증에 성공해도 실제 복구를 실행하지 않는다', async () => {
  let restoreCalled = false;

  const result = await runRestoreGate({
    backup: { id: 'note-1' },
    verifyBackup: async () => ({ valid: true }),
    restoreOne: async () => {
      restoreCalled = true;
    },
  });

  assert.equal(result.status, 'VERIFIED_BUT_NOT_RESTORED');
  assert.equal(result.reason, 'RESTORE_IMPLEMENTATION_REQUIRED');
  assert.equal(restoreCalled, false);
});
