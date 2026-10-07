import { createClient } from '@supabase/supabase-js';

export default async function handler(_request, response) {
  response.setHeader('Cache-Control', 'no-store');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    return response.status(500).json({
      error: 'SUPABASE_SERVER_CONFIG_MISSING'
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
