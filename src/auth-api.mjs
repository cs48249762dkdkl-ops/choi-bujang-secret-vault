import { createClient } from '@supabase/supabase-js';
import { clearAuthSession, setAuthSession, verifyRequestLogin } from './auth-session.mjs';

function allowedOrigin(config) {
  try {
    return new URL(config.publicAppUrl).origin;
  } catch {
    return null;
  }
}

function readBody(request) {
  if (typeof request.body === 'object' && request.body !== null) {
    return Promise.resolve(request.body);
  }

  if (typeof request.body === 'string') {
    try {
      return Promise.resolve(JSON.parse(request.body));
    } catch {
      return Promise.reject(new Error('INVALID_JSON'));
    }
  }

  return new Promise((resolve, reject) => {
    let raw = '';
    request.on('data', chunk => { raw += chunk; });
    request.on('end', () => {
      try { resolve(JSON.parse(raw)); } catch { reject(new Error('INVALID_JSON')); }
    });
    request.on('error', reject);
  });
}

export async function handleAuthRequest(request, response, {
  action, config, supabaseUrl, supabaseSecretKey, verifyLogin
}) {
  if (action === 'logout') {
    response.setHeader('Allow', 'POST');
    if (request.method !== 'POST') {
      return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    }
    if (request.headers.origin !== allowedOrigin(config)) {
      return response.status(403).json({ error: 'CSRF_ORIGIN_REJECTED' });
    }
    clearAuthSession(response);
    return response.status(204).end();
  }

  response.setHeader('Allow', 'GET, POST');
  if (request.method === 'GET') {
    const login = await verifyRequestLogin(request, verifyLogin);
    return response.status(200).json({
      authenticated: login?.identity?.kind === 'student'
    });
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  if (request.headers.origin !== allowedOrigin(config)) {
    return response.status(403).json({ error: 'CSRF_ORIGIN_REJECTED' });
  }

  let credentials;
  try {
    credentials = await readBody(request);
  } catch {
    return response.status(400).json({ error: 'INVALID_JSON' });
  }

  const email = typeof credentials?.email === 'string' ? credentials.email.trim() : '';
  const password = typeof credentials?.password === 'string' ? credentials.password : '';
  if (!email || email.length > 320 || !password || password.length > 1024) {
    return response.status(400).json({ error: 'INVALID_CREDENTIALS' });
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  const accessToken = data?.session?.access_token;
  const identity = accessToken
    ? await verifyLogin(`Bearer ${accessToken}`)
    : null;

  if (error || !identity || identity.kind !== 'student') {
    return response.status(401).json({ error: 'LOGIN_FAILED' });
  }

  setAuthSession(response, accessToken);
  return response.status(200).json({ authenticated: true });
}
