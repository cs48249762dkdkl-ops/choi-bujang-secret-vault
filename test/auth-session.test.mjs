import assert from 'node:assert/strict';
import test from 'node:test';
import { handleAuthRequest } from '../src/auth-api.mjs';
import {
  clearAuthSession,
  readAuthSessionToken,
  setAuthSession,
  verifyRequestLogin
} from '../src/auth-session.mjs';

const token = 'header.payload.signature';

function response() {
  return {
    headers: new Map(),
    setHeader(name, value) { this.headers.set(name, value); }
  };
}

test('HttpOnly 인증 쿠키는 JWT 형식만 읽고 안전한 속성으로 설정한다', () => {
  assert.equal(readAuthSessionToken(`other=value; byteback_auth=${token}`), token);
  assert.equal(readAuthSessionToken('byteback_auth=not-a-jwt'), null);

  const result = response();
  setAuthSession(result, token);
  const cookie = result.headers.get('Set-Cookie');
  assert.match(cookie, /^byteback_auth=/u);
  assert.match(cookie, /HttpOnly/u);
  assert.match(cookie, /Secure/u);
  assert.match(cookie, /SameSite=Strict/u);

  clearAuthSession(result);
  assert.match(result.headers.get('Set-Cookie'), /Max-Age=0/u);
});

test('요청은 기존 Bearer 검증을 유지하고 학생 HttpOnly 쿠키만 대체 경로로 쓴다', async () => {
  const calls = [];
  const verifyLogin = async authorization => {
    calls.push(authorization);
    if (authorization === `Bearer ${token}`) return { kind: 'student', userId: 'user-id' };
    return null;
  };

  const fromBearer = await verifyRequestLogin({
    headers: { authorization: `Bearer ${token}`, cookie: '' }
  }, verifyLogin);
  assert.deepEqual(fromBearer, {
    identity: { kind: 'student', userId: 'user-id' }, source: 'bearer'
  });

  const fromCookie = await verifyRequestLogin({
    headers: { cookie: `byteback_auth=${token}` }
  }, verifyLogin);
  assert.deepEqual(fromCookie, {
    identity: { kind: 'student', userId: 'user-id' }, source: 'cookie'
  });
  assert.equal(calls.length, 2);

  const invalidBearer = await verifyRequestLogin({
    headers: { authorization: 'Bearer invalid', cookie: `byteback_auth=${token}` }
  }, verifyLogin);
  assert.equal(invalidBearer, null);
  assert.equal(calls.length, 3);
});

test('묶인 인증 경로는 세션 확인과 같은 출처 로그아웃을 구분한다', async () => {
  const config = { publicAppUrl: 'https://example.test' };
  const verifyLogin = async authorization =>
    authorization === `Bearer ${token}` ? { kind: 'student', userId: 'user-id' } : null;
  const makeResponse = () => ({
    headers: new Map(),
    setHeader(name, value) { this.headers.set(name, value); },
    status(code) { this.code = code; return this; },
    json(value) { this.body = value; return this; },
    end() { this.ended = true; return this; }
  });
  const context = {
    config, supabaseUrl: 'https://example.test', supabaseSecretKey: 'unused', verifyLogin
  };

  const session = makeResponse();
  await handleAuthRequest({ method: 'GET', headers: { cookie: `byteback_auth=${token}` } },
    session, { ...context, action: 'session' });
  assert.equal(session.code, 200);
  assert.deepEqual(session.body, { authenticated: true });

  const crossOrigin = makeResponse();
  await handleAuthRequest({ method: 'POST', headers: { origin: 'https://other.test' } },
    crossOrigin, { ...context, action: 'logout' });
  assert.equal(crossOrigin.code, 403);

  const logout = makeResponse();
  await handleAuthRequest({ method: 'POST', headers: { origin: 'https://example.test' } },
    logout, { ...context, action: 'logout' });
  assert.equal(logout.code, 204);
  assert.match(logout.headers.get('Set-Cookie'), /Max-Age=0/u);
});
