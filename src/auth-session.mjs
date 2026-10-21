const AUTH_SESSION_COOKIE = 'byteback_auth';
const JWT = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u;

function readCookies(cookieHeader) {
  if (typeof cookieHeader !== 'string' || cookieHeader.length > 8192) {
    return new Map();
  }

  return new Map(
    cookieHeader.split(';').map(part => {
      const separator = part.indexOf('=');
      if (separator < 1) return [part.trim(), ''];
      return [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
    })
  );
}

export function readAuthSessionToken(cookieHeader) {
  const token = readCookies(cookieHeader).get(AUTH_SESSION_COOKIE);
  return typeof token === 'string' && JWT.test(token) ? token : null;
}

export async function verifyRequestLogin(request, verifyLogin) {
  const authorization = request?.headers?.authorization;
  if (authorization) {
    const bearerIdentity = await verifyLogin(authorization);
    return bearerIdentity
      ? { identity: bearerIdentity, source: 'bearer' }
      : null;
  }

  const token = readAuthSessionToken(request?.headers?.cookie);
  if (!token) return null;

  const identity = await verifyLogin(`Bearer ${token}`);
  if (!identity || identity.kind !== 'student') return null;

  return { identity, source: 'cookie' };
}

export function setAuthSession(response, token) {
  if (typeof token !== 'string' || !JWT.test(token)) {
    throw new TypeError('invalid_auth_session');
  }

  response.setHeader(
    'Set-Cookie',
    `${AUTH_SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`
  );
}

export function clearAuthSession(response) {
  response.setHeader(
    'Set-Cookie',
    `${AUTH_SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
  );
}
