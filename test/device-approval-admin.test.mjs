import test from 'node:test';
import assert from 'node:assert/strict';
import { approvePendingDevice } from '../src/device-approval-admin.mjs';

const DEVICE_ID = '0123456789abcdef';
const OWNER_ID = '11111111-1111-4111-8111-111111111111';

function createSupabase({
  device = {
    device_id: DEVICE_ID,
    owner_id: OWNER_ID,
    approval_status: 'pending'
  },
  updated = {
    device_id: DEVICE_ID,
    owner_id: OWNER_ID,
    approval_status: 'approved',
    approved_at: '2026-10-19T01:00:00.000Z'
  },
  lookupError = null,
  updateError = null
} = {}) {
  const calls = [];
  const query = {
    table: '',
    operation: '',
    filters: [],
    select(columns) {
      calls.push(['select', columns]);
      return this;
    },
    eq(column, value) {
      this.filters.push([column, value]);
      return this;
    },
    update(values) {
      this.operation = 'update';
      calls.push(['update', values]);
      return this;
    },
    maybeSingle() {
      if (this.operation === 'update') {
        return Promise.resolve({ data: updated, error: updateError });
      }
      return Promise.resolve({ data: device, error: lookupError });
    }
  };

  return {
    calls,
    from(table) {
      query.table = table;
      calls.push(['from', table]);
      return query;
    }
  };
}

test('pending 기기를 승인하고 서버 승인 시각을 기록한다', async () => {
  const supabase = createSupabase();
  const approvedAt = '2026-10-19T01:00:00.000Z';

  const result = await approvePendingDevice({
    supabase,
    deviceId: DEVICE_ID,
    now: () => approvedAt
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.approved, true);
  assert.equal(result.body.approvedAt, approvedAt);
  assert.ok(supabase.calls.some(([kind, values]) =>
    kind === 'update'
    && values.approval_status === 'approved'
    && values.approved_at === approvedAt
  ));
});

test('잘못된 기기 ID를 거부한다', async () => {
  const result = await approvePendingDevice({
    supabase: createSupabase(),
    deviceId: '../invalid'
  });

  assert.equal(result.status, 400);
  assert.equal(result.body.error, 'INVALID_DEVICE_ID');
});

test('등록되지 않은 기기를 거부한다', async () => {
  const result = await approvePendingDevice({
    supabase: createSupabase({ device: null }),
    deviceId: DEVICE_ID
  });

  assert.equal(result.status, 404);
  assert.equal(result.body.error, 'DEVICE_NOT_FOUND');
});

test('pending이 아닌 기기를 다시 승인하지 않는다', async () => {
  const supabase = createSupabase({
    device: {
      device_id: DEVICE_ID,
      owner_id: OWNER_ID,
      approval_status: 'approved'
    }
  });

  const result = await approvePendingDevice({
    supabase,
    deviceId: DEVICE_ID
  });

  assert.equal(result.status, 409);
  assert.equal(result.body.error, 'DEVICE_NOT_PENDING');
  assert.equal(supabase.calls.some(([kind]) => kind === 'update'), false);
});

test('조회 오류를 성공으로 처리하지 않는다', async () => {
  const result = await approvePendingDevice({
    supabase: createSupabase({ lookupError: new Error('mock lookup error') }),
    deviceId: DEVICE_ID
  });

  assert.equal(result.status, 500);
  assert.equal(result.body.error, 'DEVICE_LOOKUP_FAILED');
});

test('조건부 갱신 결과가 없으면 상태 변경 충돌로 처리한다', async () => {
  const result = await approvePendingDevice({
    supabase: createSupabase({ updated: null }),
    deviceId: DEVICE_ID
  });

  assert.equal(result.status, 409);
  assert.equal(result.body.error, 'DEVICE_STATE_CHANGED');
});

