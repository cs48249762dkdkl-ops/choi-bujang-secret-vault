import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import {
  createDeviceSessionToken,
  verifyDeviceSessionToken
} from '../src/device-session.mjs';

const ownerId = '123e4567-e89b-42d3-a456-426614174000';
const deviceId = '0123456789abcdef';

test('유효한 세션 토큰을 발급하고 검증한다', async () => {
  process.env.DEVICE_SESSION_SECRET =
    randomBytes(32).toString('base64url');

  const token = await createDeviceSessionToken({
    ownerId,
    deviceId
  });

  const session = await verifyDeviceSessionToken(token);

  assert.equal(session.ownerId, ownerId);
  assert.equal(session.deviceId, deviceId);
  assert.ok(session.expiresAt > Math.floor(Date.now() / 1000));
});

test('위조된 토큰을 거부한다', async () => {
  process.env.DEVICE_SESSION_SECRET =
    randomBytes(32).toString('base64url');

  await assert.rejects(
    verifyDeviceSessionToken('not.a.valid.token'),
    { message: 'DEVICE_SESSION_INVALID' }
  );
});

test('만료된 토큰을 거부한다', async () => {
  process.env.DEVICE_SESSION_SECRET =
    randomBytes(32).toString('base64url');

  const now = Date.now();
  const token = await createDeviceSessionToken({
    ownerId,
    deviceId,
    now: now - 16 * 60 * 1000
  });

  await assert.rejects(
    verifyDeviceSessionToken(token, { now }),
    { message: 'DEVICE_SESSION_INVALID' }
  );
});

test('잘못된 기기 ID로 세션 발급을 거부한다', async () => {
  process.env.DEVICE_SESSION_SECRET =
    randomBytes(32).toString('base64url');

  await assert.rejects(
    createDeviceSessionToken({
      ownerId,
      deviceId: 'invalid'
    }),
    { message: 'INVALID_DEVICE_ID' }
  );
});
