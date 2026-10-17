import test from 'node:test';
import assert from 'node:assert/strict';
import { isDeviceApproved } from '../src/device-approval.mjs';

const ownerId = '11111111-1111-4111-8111-111111111111';
const deviceId = '0123456789abcdef';

const approvedRecord = {
  owner_id: ownerId,
  device_id: deviceId,
  approval_status: 'approved',
  approved_at: '2026-10-16T08:00:00.000Z',
};

test('소유자와 기기 ID가 일치하고 승인된 기록은 허용한다', () => {
  assert.equal(isDeviceApproved(approvedRecord, ownerId, deviceId), true);
});

test('승인 대기 중인 기기는 거부한다', () => {
  assert.equal(
    isDeviceApproved(
      { ...approvedRecord, approval_status: 'pending', approved_at: null },
      ownerId,
      deviceId
    ),
    false
  );
});

test('다른 소유자 또는 기기 ID는 거부한다', () => {
  assert.equal(
    isDeviceApproved(
      approvedRecord,
      '22222222-2222-4222-8222-222222222222',
      deviceId
    ),
    false
  );
  assert.equal(
    isDeviceApproved(approvedRecord, ownerId, 'ffffffffffffffff'),
    false
  );
});

test('승인 시각이 없거나 유효하지 않으면 거부한다', () => {
  assert.equal(
    isDeviceApproved({ ...approvedRecord, approved_at: null }, ownerId, deviceId),
    false
  );
  assert.equal(
    isDeviceApproved({ ...approvedRecord, approved_at: 'invalid' }, ownerId, deviceId),
    false
  );
});

test('기기 등록 기록이 없으면 접근을 거부한다', async () => {
  const result = await (await import('../src/device-approval.mjs'))
    .checkDeviceApproval({
      supabase: {
        from() {
          return {
            select() { return this; },
            eq() { return this; },
            maybeSingle: async () => ({ data: null, error: null })
          };
        }
      },
      ownerId,
      deviceId
    });

  assert.deepEqual(result, {
    approved: false,
    status: 'not_registered'
  });
});

test('승인 상태 조회 오류가 발생하면 접근을 거부한다', async () => {
  const result = await (await import('../src/device-approval.mjs'))
    .checkDeviceApproval({
      supabase: {
        from() {
          return {
            select() { return this; },
            eq() { return this; },
            maybeSingle: async () => ({
              data: null,
              error: { message: 'database unavailable' }
            })
          };
        }
      },
      ownerId,
      deviceId
    });

  assert.deepEqual(result, {
    approved: false,
    status: 'verification_error'
  });
});
