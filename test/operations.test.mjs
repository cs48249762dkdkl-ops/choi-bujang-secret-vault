import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createOperationsHandler } from '../api/operations.js';
import { RULE_IDS } from '../src/decider.mjs';

const REQUEST_ID = '11111111-1111-4111-8111-111111111111';
const CHECKED_AT = '2026-10-20T00:00:00.000Z';

function response() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; }
  };
}

function setup({ contextError, access = { allowed: true }, log = () => {} } = {}) {
  let accessChecks = 0;
  const handler = createOperationsHandler({
    getContext: async () => contextError || {
      identity: { kind: 'student', userId: 'owner' },
      supabase: { fake: true }
    },
    checkAccess: async ({ ownerId }) => {
      accessChecks += 1;
      assert.equal(ownerId, 'owner');
      return access;
    },
    now: () => CHECKED_AT,
    newRequestId: () => REQUEST_ID,
    log
  });
  return { handler, accessChecks: () => accessChecks };
}

test('작전실 API는 읽기만 허용한다', async () => {
  const { handler, accessChecks } = setup();
  const res = response();
  await handler({ method: 'POST', headers: {} }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(accessChecks(), 0);
});

test('로그인 또는 기기 증명이 없으면 요약을 주지 않는다', async () => {
  const noLogin = setup({ contextError: { errorStatus: 401, error: 'LOGIN_REQUIRED' } });
  const loginResponse = response();
  await noLogin.handler({ method: 'GET', headers: {} }, loginResponse);
  assert.equal(loginResponse.statusCode, 401);
  assert.equal(loginResponse.body.decision, undefined);
  assert.equal(noLogin.accessChecks(), 0);

  const noDevice = setup({ access: { allowed: false, error: 'DEVICE_SESSION_REQUIRED' } });
  const deviceResponse = response();
  await noDevice.handler({ method: 'GET', headers: {} }, deviceResponse);
  assert.equal(deviceResponse.statusCode, 403);
  assert.equal(deviceResponse.body.decision, undefined);
});

test('승인 기기 응답과 가린 서버 기록의 수치가 일치한다', async () => {
  const lines = [];
  const { handler } = setup({ log: line => lines.push(JSON.parse(line)) });
  const res = response();
  await handler({ method: 'GET', headers: { cookie: 'device_session=mock' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['X-Request-Id'], res.body.requestId);
  assert.deepEqual(res.body.decision.ruleIds, RULE_IDS);
  assert.equal(res.body.decision.ruleCount, RULE_IDS.length);
  assert.equal(res.body.decision.execution, 'not_run');
  assert.equal(res.body.detection.eventCount, null);
  assert.equal(res.body.revocation.execution, 'not_run');
  assert.equal(res.body.restore.version, null);
  assert.equal(res.body.finalAssault.confirmedPassed, null);
  assert.equal(lines[0].requestId, res.body.requestId);
  assert.equal(lines[0].ruleCount, res.body.decision.ruleCount);
  assert.equal(lines[0].eventCount, res.body.detection.eventCount);
  assert.equal(lines[0].confirmedPassed, res.body.finalAssault.confirmedPassed);
  assert.doesNotMatch(JSON.stringify(res.body) + JSON.stringify(lines), /memoBody|noteBody|access_token|secret_key/u);
});

test('작전실 화면은 승인된 자료실 뒤에만 나타난다', async () => {
  const page = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(page, /<section id="operations-panel"[^>]* hidden>/u);
  assert.ok(page.indexOf('memoPanel.hidden = false;') < page.indexOf('operationsPanel.hidden = false;'));
  assert.match(page, /fetch\('\/api\/operations',\s*\{/u);
  assert.match(page, /41종 운영 시험 결과 미수집/u);
});
