import assert from 'node:assert/strict';
import { verifyAndUpdateAuthentication } from '../src/webauthn.mjs';

const challengeId = '22222222-2222-4222-8222-222222222222';
const ownerId = '11111111-1111-4111-8111-111111111111';
const deviceId = '0123456789abcdef';
const calls = [];

const challenge = {
  challenge_id: challengeId,
  challenge: 'test-authentication-challenge',
  expires_at: new Date(Date.now() + 60_000).toISOString(),
  consumed_at: null,
};

const credential = {
  credential_id: 'mock-credential-id',
  public_key: Buffer.from([1, 2, 3, 4]).toString('base64'),
  sign_count: 7,
  transports: ['internal'],
};

const supabase = {
  from(table) {
    const builder = {
      select() { return builder; },
      update(values) {
        calls.push(['update-values', table, values]);
        return builder;
      },
      eq(column, value) {
        calls.push(['eq', table, column, value]);
        return builder;
      },
      maybeSingle: async () => ({
        data: table === 'webauthn_challenges' ? challenge : credential,
        error: null,
      }),
      then(resolve, reject) {
        return Promise.resolve({
          data: [{ credential_id: credential.credential_id }],
          error: null,
        }).then(resolve, reject);
      },
    };
    return builder;
  },
  rpc: async (name, args) => {
    calls.push(['rpc', name, args]);
    return { data: true, error: null };
  },
};

const result = await verifyAndUpdateAuthentication({
  supabase,
  ownerId,
  deviceId,
  challengeId,
  response: { id: credential.credential_id },
  authenticationVerifier: async (options) => {
    assert.equal(options.expectedChallenge, challenge.challenge);
    assert.equal(
      options.expectedOrigin,
      'https://choi-bujang-secret-vault-rust.vercel.app'
    );
    assert.equal(
      options.expectedRPID,
      'choi-bujang-secret-vault-rust.vercel.app'
    );
    assert.equal(options.requireUserVerification, true);
    assert.equal(options.credential.counter, 7);
    assert.deepEqual(
      [...options.credential.publicKey],
      [1, 2, 3, 4]
    );

    return {
      verified: true,
      authenticationInfo: {
        userVerified: true,
        newCounter: 8,
      },
    };
  },
});

assert.equal(result.verified, true);
assert.equal(result.credentialId, credential.credential_id);
assert.ok(
  calls.some(([kind, name]) =>
    kind === 'rpc' && name === 'consume_webauthn_challenge'
  ),
  'authentication challenge must be consumed'
);
assert.ok(
  calls.some(([kind, table]) =>
    kind === 'update-values' &&
    table === 'webauthn_credentials'
  ),
  'credential counter and last-used timestamp must be updated'
);

console.log('WebAuthn authentication-success mock test passed.');
