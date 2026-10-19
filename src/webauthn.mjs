import { randomUUID } from 'node:crypto';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';

const RP_NAME = 'BYTE BACK';
const RP_ID = 'choi-bujang-secret-vault-rust.vercel.app';
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const DEVICE_ID_PATTERN = /^[0-9a-f]{16}$/u;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

function validateContext({ ownerId, deviceId }) {
  if (typeof ownerId !== 'string' || !UUID_PATTERN.test(ownerId)) {
    throw new TypeError('INVALID_OWNER_ID');
  }

  if (typeof deviceId !== 'string' || !DEVICE_ID_PATTERN.test(deviceId)) {
    throw new TypeError('INVALID_DEVICE_ID');
  }
}

export async function createRegistrationOptions({
  supabase,
  ownerId,
  deviceId,
  userName,
}) {
  validateContext({ ownerId, deviceId });

  if (typeof userName !== 'string' || userName.length > 254) {
    throw new TypeError('INVALID_USER_NAME');
  }

  const { data: credentials, error: credentialError } = await supabase
    .from('webauthn_credentials')
    .select('credential_id')
    .eq('owner_id', ownerId)
    .eq('device_id', deviceId);

  if (credentialError) {
    throw new Error('WEBAUTHN_CREDENTIAL_LOOKUP_FAILED');
  }

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName,
    userID: new TextEncoder().encode(ownerId),
    attestationType: 'none',
    excludeCredentials: (credentials ?? []).map(({ credential_id }) => ({
      id: credential_id,
      transports: [],
    })),
      authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
    },
    timeout: 60_000,
  });

  const challengeId = randomUUID();
  const now = Date.now();
  const expiresAt = new Date(now + CHALLENGE_TTL_MS).toISOString();

  const { error: challengeError } = await supabase
    .from('webauthn_challenges')
    .insert({
      challenge_id: challengeId,
      challenge: options.challenge,
      owner_id: ownerId,
      device_id: deviceId,
      purpose: 'registration',
      created_at: new Date(now).toISOString(),
      expires_at: expiresAt,
      consumed_at: null,
    });

  if (challengeError) {
    throw new Error('WEBAUTHN_CHALLENGE_CREATE_FAILED');
  }

  return {
    challengeId,
    options,
    expiresAt,
  };
}

const EXPECTED_ORIGIN = 'https://choi-bujang-secret-vault-rust.vercel.app';

export async function verifyAndStoreRegistration({
  supabase,
  ownerId,
  deviceId,
  challengeId,
  response,
  registrationVerifier = verifyRegistrationResponse,
}) {
  validateContext({ ownerId, deviceId });

  if (typeof challengeId !== 'string' || !UUID_PATTERN.test(challengeId)) {
    throw new TypeError('INVALID_CHALLENGE_ID');
  }

  if (!response || typeof response !== 'object') {
    throw new TypeError('INVALID_REGISTRATION_RESPONSE');
  }

  const { data: challenge, error: challengeLookupError } = await supabase
    .from('webauthn_challenges')
    .select('challenge_id, challenge, owner_id, device_id, purpose, expires_at, consumed_at')
    .eq('challenge_id', challengeId)
    .eq('owner_id', ownerId)
    .eq('device_id', deviceId)
    .eq('purpose', 'registration')
    .maybeSingle();

  if (challengeLookupError) {
    throw new Error('WEBAUTHN_CHALLENGE_LOOKUP_FAILED');
  }

  const challengeExpiresAt = Date.parse(challenge?.expires_at ?? '');
  if (
    !challenge ||
    challenge.consumed_at !== null ||
    !Number.isFinite(challengeExpiresAt) ||
    challengeExpiresAt <= Date.now()
  ) {
    throw new Error('WEBAUTHN_CHALLENGE_INVALID_OR_EXPIRED');
  }

  const { data: consumed, error: consumeError } = await supabase.rpc(
    'consume_webauthn_challenge',
    {
      p_challenge_id: challenge.challenge_id,
      p_challenge: challenge.challenge,
      p_owner_id: ownerId,
      p_device_id: deviceId,
      p_purpose: 'registration',
    }
  );

  if (consumeError) {
    throw new Error('WEBAUTHN_CHALLENGE_CONSUME_FAILED');
  }

  if (consumed !== true) {
    throw new Error('WEBAUTHN_CHALLENGE_ALREADY_CONSUMED');
  }

  let verification;
  try {
    verification = await registrationVerifier({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: EXPECTED_ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
    });
  } catch {
    throw new Error('WEBAUTHN_REGISTRATION_VERIFICATION_FAILED');
  }

  if (
    verification.verified !== true ||
    !verification.registrationInfo ||
    verification.registrationInfo.userVerified !== true
  ) {
    throw new Error('WEBAUTHN_REGISTRATION_NOT_VERIFIED');
  }

  const credential = verification.registrationInfo.credential;

  if (
    !credential ||
    typeof credential.id !== 'string' ||
    !(credential.publicKey instanceof Uint8Array) ||
    !Number.isSafeInteger(credential.counter) ||
    credential.counter < 0
  ) {
    throw new Error('WEBAUTHN_CREDENTIAL_DATA_INVALID');
  }

  const publicKey = Buffer.from(credential.publicKey).toString('base64');
  const transports = Array.isArray(credential.transports)
    ? credential.transports.filter((item) => typeof item === 'string')
    : [];

  const { error: saveError } = await supabase
    .from('webauthn_credentials')
    .insert({
      credential_id: credential.id,
      owner_id: ownerId,
      device_id: deviceId,
      public_key: publicKey,
      sign_count: credential.counter,
      transports,
      created_at: new Date().toISOString(),
      last_used_at: null,
    });

  if (saveError) {
    throw new Error('WEBAUTHN_CREDENTIAL_SAVE_FAILED');
  }

  return {
    verified: true,
    credentialId: credential.id,
  };
}

export async function createAuthenticationOptions({
  supabase,
  ownerId,
  deviceId,
}) {
  validateContext({ ownerId, deviceId });

  const { data: credentials, error } = await supabase
    .from('webauthn_credentials')
    .select('credential_id, transports')
    .eq('owner_id', ownerId)
    .eq('device_id', deviceId);

  if (error) {
    throw new Error('WEBAUTHN_CREDENTIAL_LOOKUP_FAILED');
  }

  if (!Array.isArray(credentials) || credentials.length === 0) {
    throw new Error('WEBAUTHN_CREDENTIAL_NOT_FOUND');
  }

  const { generateAuthenticationOptions } = await import('@simplewebauthn/server');

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: credentials.map(({ credential_id, transports }) => ({
      id: credential_id,
      transports: Array.isArray(transports) ? transports : [],
    })),
    userVerification: 'required',
    timeout: 60_000,
  });

  const challengeId = randomUUID();
  const now = Date.now();

  const { error: challengeError } = await supabase
    .from('webauthn_challenges')
    .insert({
      challenge_id: challengeId,
      challenge: options.challenge,
      owner_id: ownerId,
      device_id: deviceId,
      purpose: 'authentication',
      created_at: new Date(now).toISOString(),
      expires_at: new Date(now + CHALLENGE_TTL_MS).toISOString(),
      consumed_at: null,
    });

  if (challengeError) {
    throw new Error('WEBAUTHN_CHALLENGE_CREATE_FAILED');
  }

  return {
    challengeId,
    options,
    expiresAt: new Date(now + CHALLENGE_TTL_MS).toISOString(),
  };
}

export async function verifyAndUpdateAuthentication({
  supabase,
  ownerId,
  deviceId,
  challengeId,
  response,
  authenticationVerifier,
}) {
  validateContext({ ownerId, deviceId });

  if (typeof challengeId !== 'string' || !UUID_PATTERN.test(challengeId)) {
    throw new TypeError('INVALID_CHALLENGE_ID');
  }

  if (
    !response ||
    typeof response !== 'object' ||
    typeof response.id !== 'string' ||
    response.id.length === 0
  ) {
    throw new TypeError('INVALID_AUTHENTICATION_RESPONSE');
  }

  const { data: challenge, error: challengeLookupError } = await supabase
    .from('webauthn_challenges')
    .select('challenge_id, challenge, expires_at, consumed_at')
    .eq('challenge_id', challengeId)
    .eq('owner_id', ownerId)
    .eq('device_id', deviceId)
    .eq('purpose', 'authentication')
    .maybeSingle();

  if (challengeLookupError) {
    throw new Error('WEBAUTHN_CHALLENGE_LOOKUP_FAILED');
  }

  if (
    !challenge ||
    challenge.consumed_at !== null ||
    !Number.isFinite(Date.parse(challenge.expires_at)) ||
    Date.parse(challenge.expires_at) <= Date.now()
  ) {
    throw new Error('WEBAUTHN_CHALLENGE_INVALID_OR_EXPIRED');
  }

  const { data: consumed, error: consumeError } = await supabase.rpc(
    'consume_webauthn_challenge',
    {
      p_challenge_id: challenge.challenge_id,
      p_challenge: challenge.challenge,
      p_owner_id: ownerId,
      p_device_id: deviceId,
      p_purpose: 'authentication',
    }
  );

  if (consumeError) {
    throw new Error('WEBAUTHN_CHALLENGE_CONSUME_FAILED');
  }

  if (consumed !== true) {
    throw new Error('WEBAUTHN_CHALLENGE_ALREADY_CONSUMED');
  }

  const { data: credential, error: credentialError } = await supabase
    .from('webauthn_credentials')
    .select('credential_id, public_key, sign_count, transports')
    .eq('credential_id', response.id)
    .eq('owner_id', ownerId)
    .eq('device_id', deviceId)
    .maybeSingle();

  if (credentialError) {
    throw new Error('WEBAUTHN_CREDENTIAL_LOOKUP_FAILED');
  }

  if (!credential) {
    throw new Error('WEBAUTHN_CREDENTIAL_NOT_FOUND');
  }

  const oldCounter = Number(credential.sign_count);

  if (
    typeof credential.public_key !== 'string' ||
    !Number.isSafeInteger(oldCounter) ||
    oldCounter < 0
  ) {
    throw new Error('WEBAUTHN_CREDENTIAL_DATA_INVALID');
  }

  const verifier = authenticationVerifier ??
    (await import('@simplewebauthn/server')).verifyAuthenticationResponse;

  let verification;

  try {
    verification = await verifier({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: EXPECTED_ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
      credential: {
        id: credential.credential_id,
        publicKey: new Uint8Array(
          Buffer.from(credential.public_key, 'base64')
        ),
        counter: oldCounter,
        transports: Array.isArray(credential.transports)
          ? credential.transports
          : [],
      },
    });
  } catch {
    throw new Error('WEBAUTHN_AUTHENTICATION_VERIFICATION_FAILED');
  }

  if (
    verification?.verified !== true ||
    verification.authenticationInfo?.userVerified !== true
  ) {
    throw new Error('WEBAUTHN_AUTHENTICATION_NOT_VERIFIED');
  }

  const newCounter = verification.authenticationInfo.newCounter;

  if (!Number.isSafeInteger(newCounter) || newCounter < 0) {
    throw new Error('WEBAUTHN_COUNTER_INVALID');
  }

  const { data: updated, error: updateError } = await supabase
    .from('webauthn_credentials')
    .update({
      sign_count: newCounter,
      last_used_at: new Date().toISOString(),
    })
    .eq('credential_id', credential.credential_id)
    .eq('owner_id', ownerId)
    .eq('device_id', deviceId)
    .eq('sign_count', oldCounter)
    .select('credential_id');

  if (updateError) {
    throw new Error('WEBAUTHN_CREDENTIAL_UPDATE_FAILED');
  }

  if (!Array.isArray(updated) || updated.length !== 1) {
    throw new Error('WEBAUTHN_CREDENTIAL_UPDATE_CONFLICT');
  }

  return {
    verified: true,
    credentialId: credential.credential_id,
  };
}
