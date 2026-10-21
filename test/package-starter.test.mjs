import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

const baseline = JSON.parse(await readFile(new URL('../package/baseline-functions.json', import.meta.url)));

test('?⑦궎吏??⑥닔 湲곗??쒕뒗 ?먮낯 ?쒖옉 ???API? ?쇱튂?쒕떎', async () => {
  const actual = [
    ...(await readdir(new URL('../api/', import.meta.url), { recursive: true }))
      .filter(name => /\.(?:m?js|ts)$/u.test(name))
      .map(name => join('api', name).replaceAll('\\', '/')),
  ].sort();

  assert.equal(baseline.version, 1);
  assert.equal(baseline.starter, 'ChoiTimo/aleph-defense-starter');
  assert.deepEqual(baseline.functions, []);
  assert.deepEqual(baseline.allowedNew, ['api/ai.js', 'api/threat-intel.js', 'api/device/webauthn/register-options.js', 'api/device/webauthn/register-verify.js', 'api/device/webauthn/authentication-options.js', 'api/device/webauthn/authentication-verify.js']);

  // ?꾩옱 ?꾨줈?앺듃??API? ?먮낯 ?쒖옉 ???湲곗??쒕뒗 蹂꾨룄濡?寃?ы븳??
   assert.deepEqual(
    actual,
    [
      'api/ai.js',
      'api/device/approve.js',
      'api/device/register.js',
      'api/device/status.js',
      'api/notes.js',
      'api/notes/restore.js',
      'api/operations.js',
      'api/threat-intel.js',
      'api/device/webauthn/register-options.js',
      'api/device/webauthn/register-verify.js',
      'api/device/webauthn/authentication-options.js',
      'api/device/webauthn/authentication-verify.js',
    ].sort(),
 );
  assert.ok(actual.length <= 12, 'Vercel Hobby 서버 함수 12개 제한');
});

test('인증 경로는 메모 서버 함수 한곳으로 연결된다', async () => {
  const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url)));
  assert.ok(vercel.rewrites.some(route =>
    route.source === '/api/auth/session' && route.destination === '/api/notes?authAction=session'
  ));
  assert.ok(vercel.rewrites.some(route =>
    route.source === '/api/auth/logout' && route.destination === '/api/notes?authAction=logout'
  ));
});

test("unimplemented endpoints return 501 with no-store headers", async () => {
  for (const name of ['ai', 'threat-intel']) {
    const { default: handler } = await import(`../api/${name}.js`);
    const headers = new Map();
    let status;
    let body;
    handler({}, {
      setHeader: (key, value) => headers.set(key.toLowerCase(), value),
      status: value => { status = value; return { json: value => { body = value; } }; },
    });
    assert.equal(status, 501);
    assert.equal(headers.get('cache-control'), 'no-store');
    assert.match(body.error, /NOT_IMPLEMENTED$/u);
  }
});

test("P7 build and deployment conditions match the release test", async () => {
  const readme = await readFile(new URL('../package/README.md', import.meta.url), 'utf8');
  const selfCheck = await readFile(new URL('../package/SELF-CHECK.md', import.meta.url), 'utf8');
  assert.match(readme, /Vercel/u);
  assert.match(readme, /새 프로젝트에 배포/u);
  assert.doesNotMatch(readme, /npm start/u);
  assert.match(selfCheck, /P7-3\.png/u);
});

