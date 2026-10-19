import assert from 'node:assert/strict';
import { verifyAndStoreRegistration } from '../src/webauthn.mjs';

let dbCalls = 0;
const supabase = {
  from() {
    dbCalls += 1;
    throw new Error('DB must not be called for invalid input');
  },
  rpc() {
    dbCalls += 1;
    throw new Error('RPC must not be called for invalid input');
  }
};

await assert.rejects(
  verifyAndStoreRegistration({
    supabase,
    ownerId: '11111111-1111-4111-8111-111111111111',
    deviceId: '0123456789abcdef',
    challengeId: 'invalid-challenge-id',
    response: {}
  }),
  { message: 'INVALID_CHALLENGE_ID' }
);

assert.equal(dbCalls, 0);
console.log('WebAuthn invalid challenge ID test passed.');
