const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return res.status(500).json({ error: 'Supabase public environment variables are not configured in Vercel.' });

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await supabase.from('movies')
      .select('id,title,year,genre,language,rating,director,cast_members,description,poster,backdrop,trailer_url,telegram_url,created_at')
      .eq('is_published', true).order('created_at', { ascending: false });
    if (error) {
      console.error('Public movie query failed:', error.message);
      return res.status(502).json({ error: 'Could not load movies. Check the Supabase schema and public read policy.' });
    }
    return res.status(200).json(data || []);
  } catch (error) {
    console.error('Public movie API failed:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
