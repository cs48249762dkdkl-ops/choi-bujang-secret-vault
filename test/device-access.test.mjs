import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { checkDeviceAccess } from '../src/device-access.mjs';
import { createDeviceSessionToken } from '../src/device-session.mjs';

const ownerId = '11111111-1111-4111-8111-111111111111';
const otherOwnerId = '22222222-2222-4222-8222-222222222222';
const deviceId = '0123456789abcdef';

function mockSupabase(record) {
  let reads = 0;

  return {
    get reads() { return reads; },
    from(table) {
      assert.equal(table, 'registered_devices');
      reads += 1;
      return {
        select() { return this; },
        eq() { return this; },
        async maybeSingle() { return { data: record, error: null }; }
      };
    }
  };
}

async function validCookie() {
  process.env.DEVICE_SESSION_SECRET = randomBytes(32).toString('base64url');
  const token = await createDeviceSessionToken({ ownerId, deviceId });
  return `device_session=${token}`;
}

test('기기 세션이 없으면 승인 자료 조회 없이 거부한다', async () => {
  const supabase = mockSupabase(null);
  const access = await checkDeviceAccess({ cookieHeader: '', ownerId, supabase });

  assert.deepEqual(access, {
    allowed: false,
    error: 'DEVICE_SESSION_REQUIRED'
  });
  assert.equal(supabase.reads, 0);
});

test('서버 승인과 기기 세션의 소유자가 맞을 때만 허용한다', async () => {
  const cookieHeader = await validCookie();
  const record = {
    owner_id: ownerId,
    device_id: deviceId,
    approval_status: 'approved',
    approved_at: '2026-10-16T08:00:00.000Z'
  };
  const supabase = mockSupabase(record);

  assert.deepEqual(
    await checkDeviceAccess({ cookieHeader, ownerId, supabase }),
    { allowed: true, approvalStatus: 'approved' }
  );
  assert.equal(supabase.reads, 1);

  assert.deepEqual(
    await checkDeviceAccess({
      cookieHeader,
      ownerId: otherOwnerId,
      supabase
    }),
    { allowed: false, error: 'DEVICE_SESSION_USER_MISMATCH' }
  );
  assert.equal(supabase.reads, 1);
});

test('승인이 철회되면 유효한 세션에도 자료 접근을 거부한다', async () => {
  const cookieHeader = await validCookie();
  const supabase = mockSupabase({
    owner_id: ownerId,
    device_id: deviceId,
    approval_status: 'pending',
    approved_at: null
  });

  assert.deepEqual(
    await checkDeviceAccess({ cookieHeader, ownerId, supabase }),
    {
      allowed: false,
      error: 'DEVICE_APPROVAL_REQUIRED',
      approvalStatus: 'pending'
    }
  );
});
