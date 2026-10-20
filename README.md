# CineWeb: Vercel + Supabase

Movie discovery website with an admin dashboard, embedded YouTube trailers, and links to authorized Telegram movie posts. Full-length videos are not uploaded to this website, which avoids using the site's storage for video files.

## Files

- `index.html`: public movie catalog, search, language/genre filters, featured movies
- `movie-details.html`: movie information, embedded trailer, Telegram post link
- `admin.html`: sign-in, add/edit/delete movie records
- `config.js`: public Supabase URL/publishable key and Instagram username
- `api/movies.js`: public published-movie API
- `api/admin-movies.js`: protected admin API
- `supabase/schema.sql`: database table and read-only public RLS policy

## 1. Create Supabase project

1. Create a new project in the Supabase dashboard.
2. Open SQL Editor, paste all of `supabase/schema.sql`, and run it.
3. Open Project Settings / API Keys and copy the project URL and publishable key.
4. Edit `config.js` and replace `YOUR_PROJECT_ID` and `YOUR_SUPABASE_PUBLISHABLE_KEY`. The publishable key is intended for browser use. Never put a `sb_secret_...` key or service-role key in `config.js`.
5. Replace `your_instagram_username` in `config.js` with your username without the `@`.

## 2. Create the admin login

1. In Supabase, open Authentication > Users and add a user with your admin email and a strong password.
2. Copy that user's UUID.
3. Do not enable public admin registration on the website. Only the user UUID configured on Vercel is allowed to manage movies.

## 3. Deploy to Vercel

1. Push the contents of this folder to a GitHub repository (the folder contents, not a nested folder).
2. Import the repository into Vercel. Framework preset: Other; build command: leave empty; output directory: `.`.
3. In Vercel Project Settings > Environment Variables, add the following for Production (and Preview if you want):
   - `SUPABASE_URL`: Supabase project URL
   - `SUPABASE_PUBLISHABLE_KEY`: Supabase publishable key (or legacy anon key)
   - `SUPABASE_SECRET_KEY`: Supabase secret key, kept server-side only
   - `ADMIN_USER_ID`: UUID from Authentication > Users for your admin account
4. Redeploy after adding/changing environment variables.
5. Open `/admin.html` on the deployed site and sign in with the admin email/password created in Supabase.

## 4. Add a movie

Enter the title, year, genre, language, rating, director, cast, description, poster image URL and backdrop image URL. Add a YouTube trailer URL (the trailer is embedded and plays on the website) and a Telegram post URL for a movie you own or are authorized to distribute. Click Add Movie. The website's public API only lists published movies.

## 5. Important notes

- Only use posters, trailers and full-length movie links you own or have permission to distribute.
- Vercel and Supabase free plans have usage limits; they are not unlimited streaming plans.
- If movie records do not load, check the Supabase URL/key, that `schema.sql` ran successfully, and the Vercel function logs.
- The browser config contains only the publishable key. Never expose `SUPABASE_SECRET_KEY` or a service-role key to frontend code or GitHub.
