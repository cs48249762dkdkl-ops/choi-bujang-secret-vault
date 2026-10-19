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

await assert.rejects(
  verifyAndStoreRegistration({
    supabase,
    ownerId,
    deviceId,
    challengeId,
    response: {}
  }),
  { message: 'WEBAUTHN_REGISTRATION_VERIFICATION_FAILED' }
);

assert.equal(calls.filter(([kind]) => kind === 'rpc').length, 1);
assert.equal(calls.filter(([kind, table]) =>
  kind === 'insert' && table === 'webauthn_credentials'
).length, 0);

console.log('WebAuthn registration-verification failure test passed.');
