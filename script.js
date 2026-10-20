(() => {
  'use strict';
  let movies = [];
  let featuredIndex = 0;
  let featuredMovie = null;
  const $ = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function setInstagramFooter() {
    const config = window.APP_CONFIG || {};
    const raw = String(config.INSTAGRAM_USERNAME || 'your_instagram_username').trim().replace(/^@/, '');
    const link = $('instagramLink');
    const handle = $('instagramHandle');
    if (link) link.href = `https://www.instagram.com/${encodeURIComponent(raw)}/`;
    if (handle) handle.textContent = `@${raw}`;
    if ($('copyrightYear')) $('copyrightYear').textContent = new Date().getFullYear();
  }

  function getYoutubeId(raw) {
    if (!raw) return null;
    try {
      const url = new URL(raw);
      const host = url.hostname.replace(/^www\./, '').toLowerCase();
      let id = '';
      if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] || '';
      else if (host.endsWith('youtube.com') || host === 'youtube-nocookie.com') {
        if (url.pathname === '/watch') id = url.searchParams.get('v') || '';
        else if (/^\/(embed|shorts|live)\//.test(url.pathname)) id = url.pathname.split('/')[2] || '';
      }
      return /^[A-Za-z0-9_-]{6,}$/.test(id) ? id : null;
    } catch { return null; }
  }

  function trailerFrame(raw, title) {
    const id = getYoutubeId(raw);
    if (!id) return '<div class="video-placeholder"><div><div class="play">▶</div><h3>Trailer unavailable</h3><p>No valid YouTube trailer link has been added yet.</p></div></div>';
    return `<div class="responsive-video"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}" title="${escapeHtml(title)} trailer" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>`;
  }

  function movieCard(movie) {
    return `<article class="movie-card show" tabindex="0" role="link" aria-label="View ${escapeHtml(movie.title)}" data-movie-id="${Number(movie.id)}"><div class="poster"><img src="${escapeHtml(movie.poster)}" alt="${escapeHtml(movie.title)} poster" loading="lazy" onerror="this.style.opacity='.15'"><span class="rating">★ ${escapeHtml(movie.rating)}</span><span class="lang">${escapeHtml(movie.language)}</span></div><div class="card-body"><h3>${escapeHtml(movie.title)}</h3><p>${escapeHtml(movie.year)} • ${escapeHtml(movie.genre)}</p></div></article>`;
  }

  function render(list, target) {
    if (!target) return;
    target.innerHTML = list.map(movieCard).join('');
    target.querySelectorAll('[data-movie-id]').forEach(card => {
      const open = () => openMovie(Number(card.dataset.movieId));
      card.addEventListener('click', open);
      card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
    });
  }

  function showEmpty(message) {
    const empty = $('empty');
    if (empty) { empty.textContent = message; empty.style.display = 'block'; }
  }

  function renderChips(elementId, field) {
    const target = $(elementId);
    if (!target) return;
    const values = [...new Set(movies.map(movie => String(movie[field] || '').trim()).filter(Boolean))].sort();
    target.innerHTML = values.map(value => `<button class="chip" type="button" data-filter-field="${field}" data-filter-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join('');
    target.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
      const value = button.dataset.filterValue;
      render(movies.filter(movie => String(movie[field]) === value), $('movieGrid'));
      if ($('count')) $('count').textContent = `${movies.filter(movie => String(movie[field]) === value).length} titles`;
      if ($('empty')) $('empty').style.display = 'none';
      $('trending')?.scrollIntoView({ behavior: 'smooth' });
    }));
  }

  function showHero(movie) {
    if (!movie) return;
    featuredMovie = movie;
    if ($('heroTitle')) $('heroTitle').textContent = movie.title;
    if ($('heroMeta')) $('heroMeta').innerHTML = `<b>★ ${escapeHtml(movie.rating)}</b><span>•</span>${escapeHtml(movie.year)}<span>•</span>${escapeHtml(movie.genre)}<span>•</span>${escapeHtml(movie.language)}`;
    if ($('heroDesc')) $('heroDesc').textContent = movie.description || '';
    if ($('heroBackdrop')) $('heroBackdrop').style.backgroundImage = `linear-gradient(90deg,#080808 5%,rgba(8,8,8,.7)),url("${String(movie.backdrop || '').replace(/["\\]/g, '')}")`;
    if ($('heroInfo')) { $('heroInfo').disabled = false; $('heroInfo').onclick = () => openMovie(movie.id); }
    if ($('heroTrailer')) { $('heroTrailer').disabled = !getYoutubeId(movie.trailer_url); $('heroTrailer').onclick = () => openTrailerModal(movie); }
    document.querySelectorAll('.dot').forEach((dot, index) => dot.classList.toggle('active', index === featuredIndex));
  }

  function openTrailerModal(movie) {
    const modal = $('trailerModal');
    const content = $('trailerModalContent');
    if (!modal || !content) return;
    content.innerHTML = trailerFrame(movie.trailer_url, movie.title);
    modal.classList.add('active');
  }

  function closeTrailerModal() {
    const modal = $('trailerModal');
    const content = $('trailerModalContent');
    if (modal) modal.classList.remove('active');
    if (content) content.innerHTML = '';
  }

  function renderDetail() {
    if (!$('detailRoot')) return;
    const id = Number(new URLSearchParams(location.search).get('id'));
    const movie = movies.find(item => Number(item.id) === id);
    if (!movie) {
      if ($('title')) $('title').textContent = 'Movie not found';
      if ($('description')) $('description').textContent = 'This movie may have been removed or is not published.';
      if ($('trailerSection')) $('trailerSection').style.display = 'none';
      return;
    }
    document.title = `${movie.title} | CineWeb`;
    $('title').textContent = movie.title;
    $('poster').src = movie.poster || '';
    $('poster').alt = `${movie.title} poster`;
    $('meta').innerHTML = `<b>★ ${escapeHtml(movie.rating)}</b><span>•</span>${escapeHtml(movie.year)}<span>•</span>${escapeHtml(movie.genre)}<span>•</span>${escapeHtml(movie.language)}`;
    $('description').textContent = movie.description || '';
    $('facts').innerHTML = `<p><strong>Director</strong> ${escapeHtml(movie.director || 'Not listed')}</p><p><strong>Cast</strong> ${escapeHtml(movie.cast_members || 'Not listed')}</p><p><strong>Genre</strong> ${escapeHtml(movie.genre)}</p><p><strong>Language</strong> ${escapeHtml(movie.language)}</p>`;
    if ($('detailBackdrop')) $('detailBackdrop').style.backgroundImage = `linear-gradient(90deg,#080808 5%,rgba(8,8,8,.7)),url("${String(movie.backdrop || '').replace(/["\\]/g, '')}")`;
    const telegram = $('telegramButton');
    if (telegram && movie.telegram_url) { telegram.href = movie.telegram_url; telegram.style.display = 'inline-block'; } else if (telegram) telegram.style.display = 'none';
    if ($('trailerPlayer')) $('trailerPlayer').innerHTML = trailerFrame(movie.trailer_url, movie.title);
    const related = movies.filter(item => Number(item.id) !== Number(movie.id) && (item.genre === movie.genre || item.language === movie.language)).slice(0, 4);
    render(related, $('related'));
    const key = 'cineweb-watchlist';
    let list = [];
    try { list = JSON.parse(localStorage.getItem(key) || '[]'); } catch { list = []; }
    const watchlist = $('watchlist');
    if (watchlist) {
      watchlist.textContent = list.includes(Number(movie.id)) ? '♥ In Watchlist' : '♡ Add to Watchlist';
      watchlist.onclick = () => {
        try { list = JSON.parse(localStorage.getItem(key) || '[]'); } catch { list = []; }
        const movieId = Number(movie.id);
        list = list.includes(movieId) ? list.filter(value => Number(value) !== movieId) : [...list, movieId];
        localStorage.setItem(key, JSON.stringify(list));
        watchlist.textContent = list.includes(movieId) ? '♥ In Watchlist' : '♡ Add to Watchlist';
      };
    }
  }

  async function init() {
    setInstagramFooter();
    $('closeTrailer')?.addEventListener('click', closeTrailerModal);
    $('trailerModal')?.addEventListener('click', event => { if (event.target === $('trailerModal')) closeTrailerModal(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeTrailerModal(); });
    $('menuBtn')?.addEventListener('click', () => $('nav')?.classList.toggle('open'));
    $('searchBtn')?.addEventListener('click', () => { $('searchPanel')?.classList.toggle('open'); $('searchInput')?.focus(); });
    $('clearSearch')?.addEventListener('click', () => { if ($('searchInput')) $('searchInput').value = ''; render(movies, $('movieGrid')); if ($('empty')) $('empty').style.display = movies.length ? 'none' : 'block'; if ($('count')) $('count').textContent = `${movies.length} titles`; });
    $('searchInput')?.addEventListener('input', event => {
      const query = event.target.value.toLowerCase().trim();
      const filtered = movies.filter(movie => `${movie.title} ${movie.genre} ${movie.language} ${movie.year}`.toLowerCase().includes(query));
      render(filtered, $('movieGrid'));
      if ($('empty')) { $('empty').style.display = filtered.length ? 'none' : 'block'; $('empty').textContent = 'No movies match your search.'; }
      if ($('count')) $('count').textContent = `${filtered.length} results`;
    });

    try {
      const response = await fetch('/api/movies');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Server returned ${response.status}`);
      if (!Array.isArray(result)) throw new Error('The movie API returned an unexpected response.');
      movies = result;
      render(movies, $('movieGrid'));
      render([...movies].sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0,8), $('latestGrid'));
      if ($('count')) $('count').textContent = `${movies.length} titles`;
      if ($('empty')) { $('empty').style.display = movies.length ? 'none' : 'block'; $('empty').textContent = movies.length ? '' : 'No movies have been added yet. Please check back soon.'; }
      renderChips('languagesList', 'language');
      renderChips('genresList', 'genre');
      if (movies.length) {
        const featured = movies.slice(0, Math.min(5, movies.length));
        const dots = $('heroDots');
        if (dots) {
          dots.innerHTML = featured.map((_, index) => `<button class="dot${index === 0 ? ' active' : ''}" aria-label="Show featured movie ${index + 1}" type="button"></button>`).join('');
          dots.querySelectorAll('button').forEach((dot, index) => dot.addEventListener('click', () => { featuredIndex = index; showHero(featured[index]); }));
        }
        showHero(featured[0]);
        if (featured.length > 1) window.setInterval(() => { if (!$('trailerModal')?.classList.contains('active')) { featuredIndex = (featuredIndex + 1) % featured.length; showHero(featured[featuredIndex]); } }, 7000);
      } else if ($('heroTitle')) {
        $('heroTitle').textContent = 'Your next movie starts here';
        if ($('heroDesc')) $('heroDesc').textContent = 'Movie listings will appear here after you add them in the admin dashboard.';
      }
      renderDetail();
    } catch (error) {
      console.error('CineWeb loading error:', error);
      showEmpty(error.message || 'Unable to load movies. Check Supabase and Vercel configuration.');
      if ($('count')) $('count').textContent = '';
    }
  }

  window.openMovie = id => { location.href = `movie-details.html?id=${encodeURIComponent(id)}`; };
  document.addEventListener('DOMContentLoaded', init);
})();
