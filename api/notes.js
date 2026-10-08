import { createLoginVerifier } from '../src/verify-login.mjs';
import { createClient } from '@supabase/supabase-js';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    return response.status(500).json({
      error: 'SUPABASE_SERVER_CONFIG_MISSING'
    });
  }

  let config;

  try {
    config = (await import('../aleph.config.json', {
      with: { type: 'json' }
    })).default;
  } catch {
    return response.status(500).json({
      error: 'IDENTITY_PROVIDER_CONFIG_MISSING'
    });
  }

  let verifyLogin;

  try {
    verifyLogin = createLoginVerifier({
      config,
      supabaseSecretKey
    });
  } catch {
    return response.status(500).json({
      error: 'LOGIN_VERIFIER_CONFIG_INVALID'
    });
  }

  const authorization =
    request.headers.authorization;

  const identity =
    await verifyLogin(authorization);

  if (!identity || identity.kind !== 'student') {
    return response.status(401).json({
      error: 'LOGIN_REQUIRED'
    });
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

  const { data, error } = await supabase
    .from('learning_notes')
    .select('title, content')
    .order('id', { ascending: true });

  if (error) {
    return response.status(500).json({
      error: 'NOTES_READ_FAILED'
    });
  }

  return response.status(200).json({
    notes: data
  });
}
