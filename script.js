
(() => {
  'use strict';

  let movies = [];
  let featuredIndex = 0;
  let featuredMovie = null;
  let scrollObserver = null;

  const $ = id => document.getElementById(id);

  const escapeHtml = value =>
    String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));

  // =========================
  // ANIMATION SETTINGS
  // =========================

  function setupAnimationStyles() {
    if ($('cinewebAnimationStyles')) return;

    const style = document.createElement('style');
    style.id = 'cinewebAnimationStyles';

    style.textContent = `
      .movie-card {
        opacity: 0;
        transform: translateY(28px) scale(.98);
        transition:
          opacity .55s ease,
          transform .55s cubic-bezier(.2,.7,.2,1),
          box-shadow .3s ease;
        will-change: opacity, transform;
      }

      .movie-card.cw-visible {
        opacity: 1;
        transform: translateY(0) scale(1);
      }

      .movie-card.cw-visible:hover {
        transform: translateY(-7px) scale(1.015);
      }

      .movie-card .poster {
        overflow: hidden;
        position: relative;
        border-radius: inherit;
      }

      .movie-card .poster img {
        transition:
          transform .45s cubic-bezier(.2,.7,.2,1),
          filter .35s ease;
        transform: scale(1);
        backface-visibility: hidden;
      }

      .movie-card:hover .poster img {
        transform: scale(1.075);
        filter: brightness(1.08);
      }

      .movie-card.cw-clicked {
        transform: scale(.96);
        opacity: .8;
        transition: transform .16s ease, opacity .16s ease;
      }

      .movie-card.cw-clicked .poster img {
        transform: scale(1.12);
      }

      .hero-backdrop {
        transition:
          background-image .7s ease,
          opacity .45s ease,
          transform 7s ease;
      }

      .hero-backdrop.cw-changing {
        opacity: .65;
        transform: scale(1.01);
      }

      .hero-content,
      #heroInfo,
      #heroTrailer,
      .detail-content,
      #trailerSection {
        animation: cwFadeUp .7s ease both;
      }

      .detail-poster img,
      #poster {
        transition: transform .4s ease, filter .4s ease;
      }

      .detail-poster:hover img,
      #poster:hover {
        transform: scale(1.025);
        filter: brightness(1.08);
      }

      .chip {
        transition: transform .2s ease, filter .2s ease;
      }

      .chip:hover {
        transform: translateY(-2px);
        filter: brightness(1.15);
      }

      .dot {
        transition: transform .25s ease, opacity .25s ease;
      }

      .dot:hover {
        transform: scale(1.25);
      }

      @keyframes cwFadeUp {
        from {
          opacity: 0;
          transform: translateY(18px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes cwPosterPop {
        0% { transform: scale(.94); opacity: .65; }
        65% { transform: scale(1.025); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }

      .cw-poster-pop {
        animation: cwPosterPop .45s ease both;
      }

      @media (prefers-reduced-motion: reduce) {
        .movie-card,
        .movie-card .poster img,
        .detail-poster img,
        #poster,
        .hero-backdrop,
        .chip,
        .dot {
          animation: none !important;
          transition: none !important;
          transform: none !important;
        }

        .movie-card {
          opacity: 1 !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function setupScrollAnimations(root) {
    if (!root) return;

    if (scrollObserver) scrollObserver.disconnect();

    const cards = root.querySelectorAll('.movie-card');

    if (!('IntersectionObserver' in window)) {
      cards.forEach(card => card.classList.add('cw-visible'));
      return;
    }

    scrollObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add('cw-visible');
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.08,
      rootMargin: '0px 0px 40px 0px'
    });

    cards.forEach((card, index) => {
      card.style.transitionDelay = `${Math.min(index % 6, 5) * 65}ms`;
      scrollObserver.observe(card);
    });
  }

  function animatePosterClick(card) {
    if (!card || card.classList.contains('cw-clicked')) return;

    card.classList.add('cw-clicked');

    window.setTimeout(() => {
      const id = Number(card.dataset.movieId);
      if (Number.isFinite(id) && id > 0) {
        openMovie(id);
      }
    }, 150);
  }

  // =========================
  // FOOTER
  // =========================

  function setInstagramFooter() {
    const config = window.APP_CONFIG || {};
    const raw = String(
      config.INSTAGRAM_USERNAME || 'your_instagram_username'
    ).trim().replace(/^@/, '');

    const link = $('instagramLink');
    const handle = $('instagramHandle');

    if (link) {
      link.href = `https://www.instagram.com/${encodeURIComponent(raw)}/`;
    }

    if (handle) handle.textContent = `@${raw}`;

    if ($('copyrightYear')) {
      $('copyrightYear').textContent = new Date().getFullYear();
    }
  }

  // =========================
  // YOUTUBE TRAILERS
  // =========================

  function getYoutubeId(raw) {
    if (!raw) return null;

    try {
      const url = new URL(raw);
      const host = url.hostname.replace(/^www\./, '').toLowerCase();
      let id = '';

      if (host === 'youtu.be') {
        id = url.pathname.split('/').filter(Boolean)[0] || '';
      } else if (
        host.endsWith('youtube.com') ||
        host === 'youtube-nocookie.com'
      ) {
        if (url.pathname === '/watch') {
          id = url.searchParams.get('v') || '';
        } else if (/^\/(embed|shorts|live)\//.test(url.pathname)) {
          id = url.pathname.split('/')[2] || '';
        }
      }

      return /^[A-Za-z0-9_-]{6,}$/.test(id) ? id : null;
    } catch {
      return null;
    }
  }

  function trailerFrame(raw, title) {
    const id = getYoutubeId(raw);

    if (!id) {
      return `
        <div class="video-placeholder">
          <div>
            <div class="play">▶</div>
            <h3>Trailer unavailable</h3>
            <p>No valid YouTube trailer link has been added yet.</p>
          </div>
        </div>`;
    }

    return `
      <div class="responsive-video">
        <iframe
          src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}"
          title="${escapeHtml(title)} trailer"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen>
        </iframe>
      </div>`;
  }

  // =========================
  // MOVIE CARDS
  // =========================

  function movieCard(movie) {
    return `
      <article
        class="movie-card"
        tabindex="0"
        role="link"
        aria-label="View ${escapeHtml(movie.title)}"
        data-movie-id="${Number(movie.id)}">

        <div class="poster">
          <img
            src="${escapeHtml(movie.poster || '')}"
            alt="${escapeHtml(movie.title)} poster"
            loading="lazy"
            onerror="this.style.opacity='.15'">

          <span class="rating">★ ${escapeHtml(movie.rating)}</span>
          <span class="lang">${escapeHtml(movie.language)}</span>
        </div>

        <div class="card-body">
          <h3>${escapeHtml(movie.title)}</h3>
          <p>${escapeHtml(movie.year)} • ${escapeHtml(movie.genre)}</p>
        </div>
      </article>`;
  }

  function render(list, target) {
    if (!target) return;

    target.innerHTML = list.map(movieCard).join('');

    target.querySelectorAll('[data-movie-id]').forEach(card => {
      card.addEventListener('click', () => animatePosterClick(card));

      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          animatePosterClick(card);
        }
      });
    });

    setupScrollAnimations(target);
  }

  function showEmpty(message) {
    const empty = $('empty');

    if (empty) {
      empty.textContent = message;
      empty.style.display = 'block';
    }
  }

  // =========================
  // GENRE AND LANGUAGE FILTERS
  // =========================

  function renderChips(elementId, field) {
    const target = $(elementId);
    if (!target) return;

    const values = [
      ...new Set(
        movies
          .map(movie => String(movie[field] || '').trim())
          .filter(Boolean)
      )
    ].sort();

    target.innerHTML = values.map(value => `
      <button
        class="chip"
        type="button"
        data-filter-field="${field}"
        data-filter-value="${escapeHtml(value)}">
        ${escapeHtml(value)}
      </button>
    `).join('');

    target.querySelectorAll('button').forEach(button => {
      button.addEventListener('click', () => {
        const value = button.dataset.filterValue;
        const filtered = movies.filter(
          movie => String(movie[field]) === value
        );

        render(filtered, $('movieGrid'));

        if ($('count')) {
          $('count').textContent = `${filtered.length} titles`;
        }

        if ($('empty')) {
          $('empty').style.display = filtered.length ? 'none' : 'block';
        }

        $('trending')?.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  // =========================
  // FEATURED HERO
  // =========================

  function showHero(movie) {
    if (!movie) return;

    featuredMovie = movie;

    if ($('heroTitle')) {
      $('heroTitle').textContent = movie.title;
    }

    if ($('heroMeta')) {
      $('heroMeta').innerHTML = `
        <b>★ ${escapeHtml(movie.rating)}</b>
        <span>•</span>${escapeHtml(movie.year)}
        <span>•</span>${escapeHtml(movie.genre)}
        <span>•</span>${escapeHtml(movie.language)}`;
    }

    if ($('heroDesc')) {
      $('heroDesc').textContent = movie.description || '';
    }

    const backdrop = $('heroBackdrop');

    if (backdrop) {
      backdrop.classList.add('cw-changing');

      const imageUrl = String(movie.backdrop || movie.poster || '')
        .replace(/["\\]/g, '');

      backdrop.style.backgroundImage = imageUrl
        ? `linear-gradient(90deg,#080808 5%,rgba(8,8,8,.7)),url("${imageUrl}")`
        : 'linear-gradient(90deg,#080808 5%,rgba(8,8,8,.7))';

      window.setTimeout(() => {
        backdrop.classList.remove('cw-changing');
      }, 400);
    }

    if ($('heroInfo')) {
      $('heroInfo').disabled = false;
      $('heroInfo').onclick = () => openMovie(movie.id);
    }

    if ($('heroTrailer')) {
      $('heroTrailer').disabled = !getYoutubeId(movie.trailer_url);
      $('heroTrailer').onclick = () => openTrailerModal(movie);
    }

    document.querySelectorAll('.dot').forEach((dot, index) => {
      dot.classList.toggle('active', index === featuredIndex);
    });
  }

  // =========================
  // TRAILER MODAL
  // =========================

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

  // =========================
  // MOVIE DETAILS PAGE
  // =========================

  function renderDetail() {
    if (!$('detailRoot')) return;

    const id = Number(new URLSearchParams(location.search).get('id'));
    const movie = movies.find(item => Number(item.id) === id);

    if (!movie) {
      if ($('title')) $('title').textContent = 'Movie not found';

      if ($('description')) {
        $('description').textContent =
          'This movie may have been removed or is not published.';
      }

      if ($('trailerSection')) {
        $('trailerSection').style.display = 'none';
      }

      return;
    }

    document.title = `${movie.title} | CineWeb`;

    if ($('title')) $('title').textContent = movie.title;

    if ($('poster')) {
      $('poster').src = movie.poster || '';
      $('poster').alt = `${movie.title} poster`;
      $('poster').classList.remove('cw-poster-pop');
      void $('poster').offsetWidth;
      $('poster').classList.add('cw-poster-pop');
    }

    if ($('meta')) {
      $('meta').innerHTML = `
        <b>★ ${escapeHtml(movie.rating)}</b>
        <span>•</span>${escapeHtml(movie.year)}
        <span>•</span>${escapeHtml(movie.genre)}
        <span>•</span>${escapeHtml(movie.language)}`;
    }

    if ($('description')) {
      $('description').textContent = movie.description || '';
    }

    if ($('facts')) {
      $('facts').innerHTML = `
        <p><strong>Director</strong> ${escapeHtml(movie.director || 'Not listed')}</p>
        <p><strong>Cast</strong> ${escapeHtml(movie.cast_members || 'Not listed')}</p>
        <p><strong>Genre</strong> ${escapeHtml(movie.genre)}</p>
        <p><strong>Language</strong> ${escapeHtml(movie.language)}</p>`;
    }

    const detailBackdrop = $('detailBackdrop');

    if (detailBackdrop) {
      const imageUrl = String(movie.backdrop || movie.poster || '')
        .replace(/["\\]/g, '');

      detailBackdrop.style.backgroundImage = imageUrl
        ? `linear-gradient(90deg,#080808 5%,rgba(8,8,8,.7)),url("${imageUrl}")`
        : 'linear-gradient(90deg,#080808 5%,rgba(8,8,8,.7))';
    }

    const telegram = $('telegramButton');

    if (telegram && movie.telegram_url) {
      telegram.href = movie.telegram_url;
      telegram.style.display = 'inline-block';
    } else if (telegram) {
      telegram.style.display = 'none';
    }

    if ($('trailerPlayer')) {
      $('trailerPlayer').innerHTML = trailerFrame(
        movie.trailer_url,
        movie.title
      );
    }

    const related = movies
      .filter(item =>
        Number(item.id) !== Number(movie.id) &&
        (item.genre === movie.genre || item.language === movie.language)
      )
      .slice(0, 4);

    render(related, $('related'));

    const key = 'cineweb-watchlist';
    let list = [];

    try {
      list = JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      list = [];
    }

    const watchlist = $('watchlist');

    if (watchlist) {
      watchlist.textContent = list.includes(Number(movie.id))
        ? '♥ In Watchlist'
        : '♡ Add to Watchlist';

      watchlist.onclick = () => {
        try {
          list = JSON.parse(localStorage.getItem(key) || '[]');
        } catch {
          list = [];
        }

        const movieId = Number(movie.id);

        list = list.includes(movieId)
          ? list.filter(value => Number(value) !== movieId)
          : [...list, movieId];

        localStorage.setItem(key, JSON.stringify(list));

        watchlist.textContent = list.includes(movieId)
          ? '♥ In Watchlist'
          : '♡ Add to Watchlist';
      };
    }
  }

  // =========================
  // INITIALIZATION
  // =========================

  async function init() {
    setupAnimationStyles();
    setInstagramFooter();

    $('closeTrailer')?.addEventListener('click', closeTrailerModal);

    $('trailerModal')?.addEventListener('click', event => {
      if (event.target === $('trailerModal')) closeTrailerModal();
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeTrailerModal();
    });

    $('menuBtn')?.addEventListener('click', () => {
      $('nav')?.classList.toggle('open');
    });

    $('searchBtn')?.addEventListener('click', () => {
      $('searchPanel')?.classList.toggle('open');
      $('searchInput')?.focus();
    });

    $('clearSearch')?.addEventListener('click', () => {
      if ($('searchInput')) $('searchInput').value = '';

      render(movies, $('movieGrid'));

      if ($('empty')) {
        $('empty').style.display = movies.length ? 'none' : 'block';
      }

      if ($('count')) {
        $('count').textContent = `${movies.length} titles`;
      }
    });

    $('searchInput')?.addEventListener('input', event => {
      const query = event.target.value.toLowerCase().trim();

      const filtered = movies.filter(movie =>
        `${movie.title} ${movie.genre} ${movie.language} ${movie.year}`
          .toLowerCase()
          .includes(query)
      );

      render(filtered, $('movieGrid'));

      if ($('empty')) {
        $('empty').style.display = filtered.length ? 'none' : 'block';
        $('empty').textContent = 'No movies match your search.';
      }

      if ($('count')) {
        $('count').textContent = `${filtered.length} results`;
      }
    });

    try {
      const response = await fetch('/api/movies');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Server returned ${response.status}`);
      }

      if (!Array.isArray(result)) {
        throw new Error('The movie API returned an unexpected response.');
      }

      movies = result;

      render(movies, $('movieGrid'));

      render(
        [...movies]
          .sort((a, b) =>
            new Date(b.created_at || 0) - new Date(a.created_at || 0)
          )
          .slice(0, 8),
        $('latestGrid')
      );

      if ($('count')) {
        $('count').textContent = `${movies.length} titles`;
      }

      if ($('empty')) {
        $('empty').style.display = movies.length ? 'none' : 'block';
        $('empty').textContent = movies.length
          ? ''
          : 'No movies have been added yet. Please check back soon.';
      }

      renderChips('languagesList', 'language');
      renderChips('genresList', 'genre');

      if (movies.length) {
        const featured = movies.slice(0, Math.min(5, movies.length));
        const dots = $('heroDots');

        if (dots) {
          dots.innerHTML = featured.map((_, index) => `
            <button
              class="dot${index === 0 ? ' active' : ''}"
              aria-label="Show featured movie ${index + 1}"
              type="button">
            </button>
          `).join('');

          dots.querySelectorAll('button').forEach((dot, index) => {
            dot.addEventListener('click', () => {
              featuredIndex = index;
              showHero(featured[index]);
            });
          });
        }

        showHero(featured[0]);

        if (featured.length > 1) {
          window.setInterval(() => {
            if (!$('trailerModal')?.classList.contains('active')) {
              featuredIndex = (featuredIndex + 1) % featured.length;
              showHero(featured[featuredIndex]);
            }
          }, 7000);
        }
      } else if ($('heroTitle')) {
        $('heroTitle').textContent = 'Your next movie starts here';

        if ($('heroDesc')) {
          $('heroDesc').textContent =
            'Movie listings will appear here after you add them in the admin dashboard.';
        }
      }

      renderDetail();
    } catch (error) {
      console.error('CineWeb loading error:', error);
      showEmpty(
        error.message ||
        'Unable to load movies. Check Supabase and Vercel configuration.'
      );

      if ($('count')) $('count').textContent = '';
    }
  }

  window.openMovie = id => {
    location.href = `movie-details.html?id=${encodeURIComponent(id)}`;
  };

  document.addEventListener('DOMContentLoaded', init);
})();
      
