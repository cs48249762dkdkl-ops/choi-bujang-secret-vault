import assert from 'node:assert/strict';
import { verifyAndStoreRegistration } from '../src/webauthn.mjs';

const challengeId = '22222222-2222-4222-8222-222222222222';
const ownerId = '11111111-1111-4111-8111-111111111111';
const deviceId = '0123456789abcdef';
const calls = [];

const challenge = {
  challenge_id: challengeId,
  challenge: 'test-challenge-value',
  owner_id: ownerId,
  device_id: deviceId,
  purpose: 'registration',
  expires_at: new Date(Date.now() + 60_000).toISOString(),
  consumed_at: null
};

const supabase = {
  from(table) {
    const builder = {
      select() { return builder; },
      eq() { return builder; },
      maybeSingle: async () => ({ data: challenge, error: null }),
      insert: async (row) => {
        calls.push(['insert', table, row]);
        return { error: null };
      }
    };
    return builder;
  },
  rpc: async (name, args) => {
    calls.push(['rpc', name, args]);
    return { data: true, error: null };
  }
};

const result = await verifyAndStoreRegistration({
  supabase,
  ownerId,
  deviceId,
  challengeId,
  response: { id: 'mock-response' },
  registrationVerifier: async (options) => {
    assert.equal(options.expectedChallenge, challenge.challenge);
    assert.equal(options.expectedOrigin, 'https://choi-bujang-secret-vault-rust.vercel.app');
    assert.equal(options.expectedRPID, 'choi-bujang-secret-vault-rust.vercel.app');
    assert.equal(options.requireUserVerification, true);

    return {
      verified: true,
      registrationInfo: {
        userVerified: true,
        credential: {
          id: 'mock-credential-id',
          publicKey: new Uint8Array([1, 2, 3, 4]),
          counter: 7,
          transports: ['internal']
        }
      }
    };
  }
});

assert.equal(result.verified, true);
assert.equal(result.credentialId, 'mock-credential-id');

const saved = calls.find(([kind, table]) =>
  kind === 'insert' && table === 'webauthn_credentials'
);
assert.ok(saved, 'credential must be saved after successful verification');
assert.equal(saved[2].credential_id, 'mock-credential-id');
assert.equal(saved[2].public_key, Buffer.from([1, 2, 3, 4]).toString('base64'));
assert.equal(saved[2].sign_count, 7);
assert.deepEqual(saved[2].transports, ['internal']);

console.log('WebAuthn registration-success mock test passed.');
