import { randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';

const ISSUER = 'byte-back-device-session';
const AUDIENCE = 'byte-back-notes-api';
const DEVICE_ID = /^[0-9a-f]{16}$/u;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SESSION_TTL_SECONDS = 15 * 60;

function getSecret() {
  const value = process.env.DEVICE_SESSION_SECRET;

  if (typeof value !== 'string' || value.length < 32) {
    throw new Error('DEVICE_SESSION_SECRET_MISSING_OR_INVALID');
  }

  return new TextEncoder().encode(value);
}

function validateIdentity(ownerId, deviceId) {
  if (typeof ownerId !== 'string' || !UUID.test(ownerId)) {
    throw new Error('INVALID_OWNER_ID');
  }

  if (typeof deviceId !== 'string' || !DEVICE_ID.test(deviceId)) {
    throw new Error('INVALID_DEVICE_ID');
  }
}

export async function createDeviceSessionToken({
  ownerId,
  deviceId,
  now = Date.now()
}) {
  validateIdentity(ownerId, deviceId);

  if (!Number.isFinite(now)) {
    throw new Error('INVALID_SESSION_TIME');
  }

  const issuedAt = Math.floor(now / 1000);

  return new SignJWT({ deviceId })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(ownerId)
    .setJti(randomUUID())
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + SESSION_TTL_SECONDS)
    .sign(getSecret());
}

export async function verifyDeviceSessionToken(token, { now = Date.now() } = {}) {
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error('DEVICE_SESSION_INVALID');
  }

  if (!Number.isFinite(now)) {
    throw new Error('INVALID_SESSION_TIME');
  }

  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ['HS256'],
      issuer: ISSUER,
      audience: AUDIENCE,
      currentDate: new Date(now)
    });

    validateIdentity(payload.sub, payload.deviceId);

    if (
      typeof payload.jti !== 'string' ||
      !Number.isSafeInteger(payload.iat) ||
      !Number.isSafeInteger(payload.exp) ||
      payload.exp <= payload.iat ||
      payload.exp - payload.iat > SESSION_TTL_SECONDS
    ) {
      throw new Error('DEVICE_SESSION_INVALID');
    }

    return {
      ownerId: payload.sub,
      deviceId: payload.deviceId,
      expiresAt: payload.exp
    };
  } catch {
    throw new Error('DEVICE_SESSION_INVALID');
  }
}
