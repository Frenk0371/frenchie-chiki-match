  'use strict';

  const STORE_KEY = 'music-house-state-v1';
  const DEFAULT_STATE = {
    favoriteTracks: [],
    favoriteAlbums: [],
    playlists: [],
    recent: [],
    currentTrack: null,
    queue: [],
    queueIndex: -1,
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const content = $('#appContent');
  const playerShell = $('#playerShell');
  const nowMeta = $('#nowMeta');
  const toast = $('#toast');

  let state = loadState();
  let view = 'home';
  let searchTab = 'tracks';
  let currentSearch = { query: '', tracks: [], artists: [], albums: [], loading: false, error: '', trackError: '' };
  let pendingPlaylistTrack = null;
  let ytPlayer = null;
  let ytReady = false;
  let ytApiReady = false;
  let toastTimer = null;

  function normalizeSavedState(saved = {}) {
    const next = {
      ...DEFAULT_STATE,
      ...saved,
      favoriteTracks: Array.isArray(saved.favoriteTracks) ? saved.favoriteTracks : [],
      favoriteAlbums: Array.isArray(saved.favoriteAlbums) ? saved.favoriteAlbums : [],
      playlists: Array.isArray(saved.playlists)
        ? saved.playlists.map(playlist => ({ ...playlist, image: typeof playlist.image === 'string' ? playlist.image : '' }))
        : [],
      recent: Array.isArray(saved.recent) ? saved.recent : [],
      queue: Array.isArray(saved.queue) ? saved.queue : [],
    };
    delete next.settings;
    return next;
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      return normalizeSavedState(saved);
    } catch {
      return structuredClone(DEFAULT_STATE);
    }
  }

  function saveState() {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    if (typeof scheduleCloudSave === 'function') scheduleCloudSave();
  }

  saveState();

  function esc(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function toastMessage(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2200);
  }

  function isFavoriteTrack(id) {
    return state.favoriteTracks.some(track => track.id === id);
  }

  function isFavoriteAlbum(id) {
    return state.favoriteAlbums.some(album => album.id === id);
  }

  function normalizeTrack(item) {
    return {
      provider: 'youtube',
      id: item.id?.videoId || item.id || '',
      title: item.snippet?.title || item.title || 'Brano',
      artist: item.snippet?.channelTitle || item.artist || 'YouTube',
      thumb: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.thumb || '',
    };
  }

  function pushRecent(track) {
    state.recent = [track, ...state.recent.filter(item => item.id !== track.id)].slice(0, 20);
    saveState();
  }

  function toggleFavoriteTrack(track) {
    if (isFavoriteTrack(track.id)) {
      state.favoriteTracks = state.favoriteTracks.filter(item => item.id !== track.id);
      toastMessage('Rimosso dai preferiti');
    } else {
      state.favoriteTracks.unshift(track);
      toastMessage('Aggiunto ai preferiti');
    }
    saveState();
    render();
    if (typeof updatePlayerUI === 'function') updatePlayerUI();
  }

  function toggleFavoriteAlbum(album) {
    if (isFavoriteAlbum(album.id)) {
      state.favoriteAlbums = state.favoriteAlbums.filter(item => item.id !== album.id);
      toastMessage('Album rimosso');
    } else {
      state.favoriteAlbums.unshift(album);
      toastMessage('Album salvato');
    }
    saveState();
    render();
  }

  function createPlaylist(name) {
    const clean = String(name || '').trim();
    if (!clean) return null;
    const playlist = { id: crypto.randomUUID(), name: clean, tracks: [], image: '', createdAt: Date.now() };
    state.playlists.unshift(playlist);
    saveState();
    return playlist;
  }

  function addTrackToPlaylist(playlistId, track) {
    const playlist = state.playlists.find(item => item.id === playlistId);
    if (!playlist) return;
    if (!playlist.tracks.some(item => item.id === track.id)) playlist.tracks.push(track);
    saveState();
    toastMessage(`Aggiunto a ${playlist.name}`);
  }

  function navigate(next) {
    view = next;
    $$('.bottom-nav button').forEach(btn => btn.classList.toggle('active', btn.dataset.nav === next));
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function sectionHead(title, subtitle = '', action = '') {
    return `<div class="section-head"><div><h2>${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>${action}</div>`;
  }

  function trackRow(track) {
    const favorite = isFavoriteTrack(track.id);
    return `<article class="track" data-track-id="${esc(track.id)}">
      <img src="${esc(track.thumb)}" alt="" loading="lazy" />
      <div class="track-copy"><strong>${esc(track.title)}</strong><small>${esc(track.artist)}</small></div>
      <div class="track-actions">
        <button class="play" data-play-track="${esc(track.id)}" aria-label="Riproduci">▶</button>
        <button data-fav-track="${esc(track.id)}" aria-label="Preferito">${favorite ? '♥' : '♡'}</button>
        <button data-add-track="${esc(track.id)}" aria-label="Aggiungi a playlist">＋</button>
      </div>
    </article>`;
  }

  function albumCard(album) {
    const favorite = isFavoriteAlbum(album.id);
    return `<article class="card">
      <div class="card-media"><img src="${esc(album.cover)}" alt="Copertina ${esc(album.title)}" loading="lazy" onerror="this.style.display='none'" /></div>
      <button class="heart ${favorite ? 'on' : ''}" data-fav-album="${esc(album.id)}" aria-label="Salva album">${favorite ? '♥' : '♡'}</button>
      <div class="card-copy"><strong>${esc(album.title)}</strong><small>${esc(album.artist)}${album.year ? ` · ${esc(album.year)}` : ''}</small>
        <div class="card-actions"><button class="primary" data-search-album="${esc(album.id)}">Cerca brani</button></div>
      </div>
    </article>`;
  }

  function artistCard(artist) {
    return `<article class="card">
      <div class="card-media" style="display:grid;place-items:center;font-size:54px">♫</div>
      <div class="card-copy"><strong>${esc(artist.name)}</strong><small>${esc(artist.disambiguation || artist.country || 'Artista')}</small>
        <div class="card-actions"><button class="primary" data-open-artist="${esc(artist.id)}">Discografia</button></div>
      </div>
    </article>`;
  }

  function playlistArtwork(playlist, className = 'playlist-art') {
    if (playlist?.image) {
      return `<span class="${className} playlist-art-has-image"><img src="${esc(playlist.image)}" alt="Copertina playlist ${esc(playlist.name)}" /></span>`;
    }
    return `<span class="${className}">♫</span>`;
  }

  function playlistTile(playlist) {
    return `<button class="playlist-tile" data-open-playlist="${esc(playlist.id)}">${playlistArtwork(playlist)}<span><strong>${esc(playlist.name)}</strong><small>${playlist.tracks.length} brani</small></span></button>`;
  }
