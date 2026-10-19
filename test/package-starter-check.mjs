import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

const baseline = JSON.parse(await readFile(new URL('../package/baseline-functions.json', import.meta.url)));

test('패키징 함수 기준표는 원본 시작 틀의 API와 일치한다', async () => {
  const actual = [
    ...(await readdir(new URL('../api/', import.meta.url), { recursive: true }))
      .filter(name => /\.(?:m?js|ts)$/u.test(name))
      .map(name => join('api', name).replaceAll('\\', '/')),
  ].sort();

  assert.equal(baseline.version, 1);
  assert.equal(baseline.starter, 'ChoiTimo/aleph-defense-starter');
  assert.deepEqual(baseline.functions, []);
  assert.deepEqual(baseline.allowedNew, ['api/ai.js', 'api/threat-intel.js', 'api/device/webauthn/register-options.js', 'api/device/webauthn/register-verify.js', 'api/device/webauthn/authentication-options.js', 'api/device/webauthn/authentication-verify.js']);

  // 현재 프로젝트의 API와 원본 시작 틀의 기준표는 별도로 검사한다.
   assert.deepEqual(
    actual,
    [
      'api/ai.js',
      'api/device/register.js',
      'api/device/status.js',
      'api/notes.js',
      'api/notes/[id].js',
      'api/notes/restore.js',
      'api/threat-intel.js',
      'api/device/webauthn/register-options.js',
      'api/device/webauthn/register-verify.js',
      'api/device/webauthn/authentication-options.js',
      'api/device/webauthn/authentication-verify.js',
    ].sort(),
 );
});

test('미구현 서버 뼈대는 성공이나 로그인 통과로 가장하지 않는다', async () => {
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

test('P7 시작 틀 안내는 실제 빌드 조건과 새 배포 시험에 맞는다', async () => {
  const readme = await readFile(new URL('../package/README.md', import.meta.url), 'utf8');
  const selfCheck = await readFile(new URL('../package/SELF-CHECK.md', import.meta.url), 'utf8');
  assert.match(readme, /새 Vercel 프로젝트/u);
  assert.match(readme, /Vercel이 제공하는 저장소·커밋·배포 URL 정보/u);
  assert.doesNotMatch(readme, /npm start/u);
  assert.match(selfCheck, /P7-3\.png/u);
});
