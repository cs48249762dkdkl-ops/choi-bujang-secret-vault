import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeviceApprovalHandler } from '../api/device/approve.js';

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';
const DEVICE_ID = '0123456789abcdef';

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    }
  };
}

function createRequest(method = 'POST', body = {}) {
  return {
    method,
    body,
    headers: { authorization: 'Bearer mock-token', host: 'localhost' },
    url: '/api/device/approve'
  };
}


function makeHandler({
  identity = { kind: 'student', userId: ADMIN_ID },
  allowedUserIds = ADMIN_ID,
  contextError,
  approveResult = {
    status: 200,
    body: {
      approved: true,
      deviceId: DEVICE_ID,
      approvalStatus: 'approved',
      approvedAt: '2026-10-19T01:00:00.000Z'
    }
  }
} = {}) {

  let approvalCalls = 0;

  const handler = createDeviceApprovalHandler({
    getContext: async () => contextError
      ? { errorStatus: contextError.status, error: contextError.error }
      : { identity, supabase: { fake: true } },
    getAllowedUserIds: () => allowedUserIds,
    approveDevice: async ({ supabase, deviceId }) => {
      approvalCalls += 1;
      assert.deepEqual(supabase, { fake: true });
      assert.equal(deviceId, DEVICE_ID);
      return approveResult;
    }
  });

  return {
    handler,
    getApprovalCalls: () => approvalCalls
  };
}

test('관리자 승인 API는 POST만 허용한다', async () => {
  const { handler, getApprovalCalls } = makeHandler();
  const response = createResponse();

  await handler(createRequest('GET'), response);

  assert.equal(response.statusCode, 405);
  assert.equal(response.body.error, 'METHOD_NOT_ALLOWED');
  assert.equal(getApprovalCalls(), 0);
});

test('인증 실패를 그대로 반환하고 승인을 실행하지 않는다', async () => {
  const { handler, getApprovalCalls } = makeHandler({
    contextError: { status: 401, error: 'LOGIN_REQUIRED' }
  });
  const response = createResponse();

  await handler(createRequest(), response);

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.error, 'LOGIN_REQUIRED');
  assert.equal(getApprovalCalls(), 0);
});

test('허용 목록에 없는 사용자는 403으로 거부된다', async () => {
  const { handler, getApprovalCalls } = makeHandler({
    identity: { kind: 'student', userId: OTHER_ID },
    allowedUserIds: ADMIN_ID
  });
  const response = createResponse();

  await handler(createRequest(), response);

  assert.equal(response.statusCode, 403);
  assert.equal(response.body.error, 'DEVICE_ADMIN_REQUIRED');
  assert.equal(getApprovalCalls(), 0);
});

test('허용된 관리자만 승인 함수를 실행한다', async () => {
  const { handler, getApprovalCalls } = makeHandler();
  const response = createResponse();

  await handler(createRequest('POST', { deviceId: DEVICE_ID }), response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.approved, true);
  assert.equal(response.body.deviceId, DEVICE_ID);
  assert.equal(getApprovalCalls(), 1);
});

test('잘못된 JSON은 400으로 거부된다', async () => {
  const { handler, getApprovalCalls } = makeHandler();
  const response = createResponse();

  await handler(createRequest('POST', '{invalid-json'), response);

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.error, 'INVALID_JSON');
  assert.equal(getApprovalCalls(), 0);
});
