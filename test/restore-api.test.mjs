import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/notes/restore.js';

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('복원 API는 검증되지 않은 백업의 복원을 차단한다', async () => {
  const request = { method: 'POST' };
  const response = createResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 503);
  assert.equal(response.body.restored, false);
  assert.equal(response.body.status, 'BLOCKED');
  assert.equal(response.body.reason, 'S10_BACKUP_UNVERIFIED');
});

test('복원 API는 POST 이외의 요청을 거부한다', async () => {
  const request = { method: 'GET' };
  const response = createResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 405);
  assert.equal(response.body.error, 'METHOD_NOT_ALLOWED');
});
