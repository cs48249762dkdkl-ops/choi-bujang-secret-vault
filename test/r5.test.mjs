import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deploymentIdentity } from '../scripts/deployment-identity.mjs';
import { runAttackChecks } from '../src/attack-check.mjs';

const config = {
  step: 3,
  judgeIssuer: 'https://aleph-judge-production.up.railway.app/defense/judge',
  sampleMarker: 'SAMPLE_NOTE_1',
  publicAppUrl: 'https://student-defense.vercel.app',
};
const env = {
  VERCEL_GIT_PROVIDER: 'github',
  VERCEL_GIT_REPO_OWNER: 'Student-A',
  VERCEL_GIT_REPO_SLUG: 'aleph-defense',
  VERCEL_GIT_COMMIT_SHA: 'a'.repeat(40),
  VERCEL_URL: 'student-defense-123.vercel.app',
};

test('build identity uses Vercel Git and deployment metadata', () => {
  assert.deepEqual(deploymentIdentity(env, config), {
    schema: 'aleph.defense.deployment.v1',
    step: 3,
    repoUrl: 'https://github.com/student-a/aleph-defense',
    commit: 'a'.repeat(40),
    publicAppUrl: 'https://student-defense-123.vercel.app',
    judgeIssuer: config.judgeIssuer,
    sampleMarker: config.sampleMarker,
  });
  assert.throws(() => deploymentIdentity({ ...env, VERCEL_GIT_PROVIDER: undefined }, config));
  assert.throws(() => deploymentIdentity({ ...env, VERCEL_GIT_COMMIT_SHA: 'short' }, config));
});

test('attack checks detect anonymous access to static data and notes API', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];

  try {
    globalThis.fetch = async (url, init) => {
      requests.push({ url: String(url), init });
      if (String(url).endsWith('/data.json')) {
        return new Response('Not found', { status: 404 });
      }
      return new Response(JSON.stringify({ error: 'LOGIN_REQUIRED' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    };

    const results = await runAttackChecks(config);

    assert.equal(requests.length, 2);
    assert.equal(requests[0].url, 'https://student-defense.vercel.app/data.json');
    assert.equal(requests[1].url, 'https://student-defense.vercel.app/api/notes');
    assert.equal(results[0].attackId, 'anonymous_static_note_read');
    assert.match(results[0].observed, /HTTP 404/u);
    assert.equal(results[1].attackId, 'anonymous_notes_api_read');
    assert.equal(results[0].observed, 'HTTP 404');
    assert.equal(results[1].observed, 'HTTP 401');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('stage 12 leaves judge-unlinked cases not_run without issuing local probes', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];

  try {
    globalThis.fetch = async url => {
      requests.push(String(url));
      return new Response('', { status: 200 });
    };

    const results = await runAttackChecks({ ...config, step: 12 });

    assert.deepEqual(requests, []);
    assert.deepEqual(results.map(result => result.observed), ['not_run', 'not_run']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
