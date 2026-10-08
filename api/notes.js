import { randomUUID } from 'node:crypto';
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

  const identity =
    await verifyLogin(request.headers.authorization);

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

  const pathname =
  new URL(request.url, `https://${request.headers.host}`).pathname;

  const parts =
    pathname.split('/').filter(Boolean);

  const memoId =
    parts.length === 3 &&
    parts[0] === 'api' &&
    parts[1] === 'notes'
      ? parts[2]
      : null;

  const UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

  if (memoId && !UUID.test(memoId)) {
    return response.status(400).json({
      error: 'INVALID_ID'
    });
  }

  if (request.method === 'GET') {
    if (memoId) {
      const { data, error } = await supabase
        .from('learning_notes')
        .select('memo_id, title, content')
        .eq('memo_id', memoId)
        .maybeSingle();

      if (error) {
        return response.status(500).json({
          error: 'NOTE_READ_FAILED'
        });
      }

      if (!data) {
        return response.status(404).json({
          error: 'NOTE_NOT_FOUND'
        });
      }

      return response.status(200).json({
        id: data.memo_id,
        title: data.title,
        body: data.content
      });
    }

    const { data, error } = await supabase
      .from('learning_notes')
      .select('memo_id, title, content')
      .eq('owner_id', identity.userId)
      .order('id', { ascending: true });

    if (error) {
      return response.status(500).json({
        error: 'NOTES_READ_FAILED'
      });
    }

    return response.status(200).json({
      notes: data.map(note => ({
        id: note.memo_id,
        title: note.title,
        body: note.content
      }))
    });
  }

  if (request.method === 'POST') {
    let body;

    try {
      const rawBody = await new Promise((resolve, reject) => {
        let raw = '';

        request.on('data', chunk => {
          raw += chunk;
        });

        request.on('end', () => {
          resolve(raw);
        });

        request.on('error', reject);
      });

      body = JSON.parse(rawBody);
    } catch {
      return response.status(400).json({
        error: 'INVALID_JSON'
      });
    }

    const id =
      typeof body.id === 'string' && body.id.trim()
        ? body.id.trim()
        : randomUUID();

    if (!UUID.test(id)) {
      return response.status(400).json({
        error: 'INVALID_ID'
      });
    }

    if (
      typeof body.title !== 'string' ||
      typeof body.body !== 'string'
    ) {
      return response.status(400).json({
        error: 'INVALID_NOTE'
      });
    }

    const { error } = await supabase
      .from('learning_notes')
      .insert({
        memo_id: id,
        title: body.title,
        content: body.body,
        owner_id: identity.userId
      });

    if (error) {
      return response.status(500).json({
        error: 'NOTE_CREATE_FAILED'
      });
    }

    return response.status(201).json({
      id
    });
  }

  if (request.method === 'PUT') {
    if (!memoId) {
      return response.status(400).json({
        error: 'NOTE_ID_REQUIRED'
      });
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return response.status(400).json({
        error: 'INVALID_JSON'
      });
    }

    if (
      typeof body.title !== 'string' ||
      typeof body.body !== 'string'
    ) {
      return response.status(400).json({
        error: 'INVALID_NOTE'
      });
    }

    const { data, error } = await supabase
      .from('learning_notes')
      .update({
        title: body.title,
        content: body.body
      })
      .eq('memo_id', memoId)
      .select('memo_id, title, content')
      .maybeSingle();

    if (error) {
      return response.status(500).json({
        error: 'NOTE_UPDATE_FAILED'
      });
    }

    if (!data) {
      return response.status(404).json({
        error: 'NOTE_NOT_FOUND'
      });
    }

    return response.status(200).json({
      id: data.memo_id,
      title: data.title,
      body: data.content
    });
  }

  if (request.method === 'DELETE') {
    if (!memoId) {
      return response.status(400).json({
        error: 'NOTE_ID_REQUIRED'
      });
    }

    const { data, error } = await supabase
      .from('learning_notes')
      .delete()
      .eq('memo_id', memoId)
      .select('memo_id')
      .maybeSingle();

    if (error) {
      return response.status(500).json({
        error: 'NOTE_DELETE_FAILED'
      });
    }

    if (!data) {
      return response.status(404).json({
        error: 'NOTE_NOT_FOUND'
      });
    }

    return response.status(200).json({
      id: data.memo_id
    });
  }

  return response.status(405).json({
    error: 'METHOD_NOT_ALLOWED'
  });
}
