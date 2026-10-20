const { createClient } = require('@supabase/supabase-js');

function cleanMovie(input = {}) {
  return {
    title: String(input.title || '').trim(),
    year: Number(input.year),
    genre: String(input.genre || '').trim(),
    language: String(input.language || '').trim(),
    rating: Number(input.rating || 0),
    director: String(input.director || '').trim(),
    cast_members: String(input.cast_members || '').trim(),
    description: String(input.description || '').trim(),
    poster: String(input.poster || '').trim(),
    backdrop: String(input.backdrop || '').trim(),
    trailer_url: String(input.trailer_url || '').trim() || null,
    telegram_url: String(input.telegram_url || '').trim() || null,
    is_published: input.is_published !== false
  };
}

function validHttpUrl(value, label, required = false) {
  if (!value && !required) return null;
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) return `${label} must use http or https.`;
    return null;
  } catch { return `${label} must be a valid URL.`; }
}

function validate(movie) {
  for (const field of ['title', 'year', 'genre', 'language', 'director', 'cast_members', 'description', 'poster', 'backdrop']) {
    if (movie[field] === '' || movie[field] === null || movie[field] === undefined || (typeof movie[field] === 'number' && !Number.isFinite(movie[field]))) return `Please provide a valid ${field.replace('_', ' ')}.`;
  }
  if (!Number.isInteger(movie.year) || movie.year < 1888 || movie.year > 2100) return 'Release year must be between 1888 and 2100.';
  if (!Number.isFinite(movie.rating) || movie.rating < 0 || movie.rating > 10) return 'Rating must be between 0 and 10.';
  for (const [field, label, required] of [['poster','Poster URL',true],['backdrop','Backdrop URL',true],['trailer_url','Trailer URL',false],['telegram_url','Telegram post URL',false]]) {
    const issue = validHttpUrl(movie[field], label, required);
    if (issue) return issue;
  }
  if (movie.trailer_url && !/(youtube\.com|youtu\.be)/i.test(movie.trailer_url)) return 'Use a YouTube trailer URL so it can play embedded on the website.';
  if (movie.telegram_url && !/(t\.me|telegram\.me)/i.test(movie.telegram_url)) return 'Telegram link must be a t.me or telegram.me URL.';
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminUserId = process.env.ADMIN_USER_ID;
  if (!url || !secret || !adminUserId) return res.status(500).json({ error: 'Admin API environment variables are incomplete in Vercel.' });

  const bearer = String(req.headers.authorization || '');
  const token = bearer.startsWith('Bearer ') ? bearer.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Please sign in as the admin.' });

  try {
    const authClient = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData?.user) return res.status(401).json({ error: 'Your session is invalid or expired. Please sign in again.' });
    if (authData.user.id !== adminUserId) return res.status(403).json({ error: 'This account is not authorized to manage movies.' });

    if (req.method === 'GET') {
      const { data, error } = await authClient.from('movies').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    if (req.method === 'POST' || req.method === 'PATCH') {
      const movie = cleanMovie(body);
      const issue = validate(movie);
      if (issue) return res.status(400).json({ error: issue });
      if (req.method === 'POST') {
        const { data, error } = await authClient.from('movies').insert(movie).select().single();
        if (error) throw error;
        return res.status(201).json({ success: true, movie: data });
      }
      const id = Number(body.id);
      if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'A valid movie ID is required.' });
      const { data, error } = await authClient.from('movies').update(movie).eq('id', id).select().maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Movie not found.' });
      return res.status(200).json({ success: true, movie: data });
    }

    const id = Number(body.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'A valid movie ID is required.' });
    const { data, error } = await authClient.from('movies').delete().eq('id', id).select('id').maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Movie not found.' });
    return res.status(200).json({ success: true, deletedId: data.id });
  } catch (error) {
    console.error('Admin movie API error:', error.message || error);
    return res.status(500).json({ error: 'The request failed. Check the Supabase table and Vercel environment variables.' });
  }
};
