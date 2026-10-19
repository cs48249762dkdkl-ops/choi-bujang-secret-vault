import assert from 'node:assert/strict';
import { verifyAndUpdateAuthentication } from '../src/webauthn.mjs';

const challengeId = '22222222-2222-4222-8222-222222222222';
const ownerId = '11111111-1111-4111-8111-111111111111';
const deviceId = '0123456789abcdef';

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

function createSupabase({ consumed = true, expired = false } = {}) {
  const selectedChallenge = {
    ...challenge,
    expires_at: expired
      ? new Date(Date.now() - 1000).toISOString()
      : challenge.expires_at,
  };

  return {
    from(table) {
      const builder = {
        select() { return builder; },
        eq() { return builder; },
        maybeSingle: async () => ({
          data: table === 'webauthn_challenges'
            ? selectedChallenge
            : credential,
          error: null,
        }),
      };
      return builder;
    },
    rpc: async () => ({ data: consumed, error: null }),
  };
}

await assert.rejects(
  verifyAndUpdateAuthentication({
    supabase: createSupabase(),
    ownerId,
    deviceId,
    challengeId,
    response: { id: credential.credential_id },
    authenticationVerifier: async () => ({
      verified: false,
      authenticationInfo: { userVerified: false, newCounter: 7 },
    }),
  }),
  /WEBAUTHN_AUTHENTICATION_NOT_VERIFIED/
);

await assert.rejects(
  verifyAndUpdateAuthentication({
    supabase: createSupabase({ expired: true }),
    ownerId,
    deviceId,
    challengeId,
    response: { id: credential.credential_id },
    authenticationVerifier: async () => {
      throw new Error('should not be called');
    },
  }),
  /WEBAUTHN_CHALLENGE_INVALID_OR_EXPIRED/
);

await assert.rejects(
  verifyAndUpdateAuthentication({
    supabase: createSupabase({ consumed: false }),
    ownerId,
    deviceId,
    challengeId,
    response: { id: credential.credential_id },
    authenticationVerifier: async () => {
      throw new Error('should not be called');
    },
  }),
  /WEBAUTHN_CHALLENGE_ALREADY_CONSUMED/
);

console.log('WebAuthn authentication-failure mock tests passed.');
