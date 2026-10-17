import { createClient } from '@supabase/supabase-js';
import { createLoginVerifier } from './verify-login.mjs';

export async function createDeviceApiContext(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    return { errorStatus: 500, error: 'SUPABASE_SERVER_CONFIG_MISSING' };
  }

  let config;

  try {
    config = (await import('../aleph.config.json', {
      with: { type: 'json' }
    })).default;
  } catch {
    return { errorStatus: 500, error: 'IDENTITY_PROVIDER_CONFIG_MISSING' };
  }

  let verifyLogin;

  try {
    verifyLogin = createLoginVerifier({
      config,
      supabaseSecretKey
    });
  } catch {
    return { errorStatus: 500, error: 'LOGIN_VERIFIER_CONFIG_INVALID' };
  }

  const identity = await verifyLogin(request.headers.authorization);

  if (!identity || identity.kind !== 'student') {
    return { errorStatus: 401, error: 'LOGIN_REQUIRED' };
  }

  const supabase = createClient(
    supabaseUrl,
    supabaseSecretKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );

  return { identity, supabase };
}
