import test from 'node:test';
import assert from 'node:assert/strict';
import { isDeviceAdmin } from '../src/device-admin.mjs';

const adminId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';

test('허용 목록에 등록된 계정만 관리자 권한을 가진다', () => {
  assert.equal(
    isDeviceAdmin({ kind: 'student', userId: adminId }, adminId),
    true
  );
  assert.equal(
    isDeviceAdmin({ kind: 'student', userId }, adminId),
    false
  );
});

test('허용 목록이 없거나 비어 있으면 거부한다', () => {
  assert.equal(isDeviceAdmin({ kind: 'student', userId: adminId }, ''), false);
  assert.equal(isDeviceAdmin({ kind: 'student', userId: adminId }, undefined), false);
});

test('학생 신원이 아니거나 UUID 형식이 잘못되면 거부한다', () => {
  assert.equal(isDeviceAdmin({ kind: 'judge', userId: adminId }, adminId), false);
  assert.equal(isDeviceAdmin({ kind: 'student', userId: 'admin' }, adminId), false);
  assert.equal(isDeviceAdmin(null, adminId), false);
});

test('쉼표로 구분된 허용 목록에서 UUID를 비교한다', () => {
  assert.equal(
    isDeviceAdmin(
      { kind: 'student', userId: adminId },
      `${userId}, ${adminId}`
    ),
    true
  );
});
