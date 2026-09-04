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
  let toastTimer = null;

  function normalizeSavedState(saved = {}) {
    const next = {
      ...DEFAULT_STATE,
      ...saved,
      favoriteTracks: Array.isArray(saved.favoriteTracks) ? saved.favoriteTracks : [],
      favoriteAlbums: Array.isArray(saved.favoriteAlbums) ? saved.favoriteAlbums : [],
      playlists: Array.isArray(saved.playlists) ? saved.playlists : [],
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
    const album = item.album || {};
    const artists = Array.isArray(item.artists) ? item.artists.map(a => a.name).filter(Boolean).join(', ') : '';
    const spotifyShape = Boolean(item.uri || item.name || item.external_urls?.spotify || album?.images);
    if (spotifyShape) {
      return {
        provider: 'spotify',
        id: item.id || '',
        uri: item.uri || (item.id ? `spotify:track:${item.id}` : ''),
        title: item.name || item.title || 'Brano',
        artist: artists || item.artist || 'Spotify',
        album: album.name || item.albumName || '',
        thumb: album.images?.[0]?.url || item.images?.[0]?.url || item.thumb || '',
        durationMs: Number(item.duration_ms || item.durationMs || 0),
      };
    }
    return {
      provider: item.provider || 'legacy',
      id: item.id?.videoId || item.id || '',
      uri: item.uri || '',
      title: item.snippet?.title || item.title || 'Brano',
      artist: item.snippet?.channelTitle || item.artist || 'Artista',
      album: item.album || '',
      thumb: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.thumb || '',
      durationMs: Number(item.durationMs || 0),
    };
  }

  function normalizeAlbum(item) {
    const artists = Array.isArray(item.artists) ? item.artists.map(a => a.name).filter(Boolean).join(', ') : (item.artist || 'Artista');
    return {
      provider: 'spotify',
      id: item.id || '',
      uri: item.uri || (item.id ? `spotify:album:${item.id}` : ''),
      title: item.name || item.title || 'Album',
      artist: artists,
      year: String(item.release_date || item.year || '').slice(0, 4),
      type: item.album_type || item.type || '',
      cover: item.images?.[0]?.url || item.cover || '',
      totalTracks: Number(item.total_tracks || item.totalTracks || 0),
    };
  }

  function normalizeArtist(item) {
    return {
      provider: 'spotify',
      id: item.id || '',
      uri: item.uri || (item.id ? `spotify:artist:${item.id}` : ''),
      name: item.name || 'Artista',
      image: item.images?.[0]?.url || item.image || '',
      followers: item.followers?.total || 0,
      genres: Array.isArray(item.genres) ? item.genres : [],
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
    const playlist = { id: crypto.randomUUID(), name: clean, tracks: [], createdAt: Date.now() };
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
      <div class="track-copy"><strong>${esc(track.title)}</strong><small>${esc(track.artist)}${track.album ? ` · ${esc(track.album)}` : ''}</small></div>
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
        <div class="card-actions"><button class="primary" data-search-album="${esc(album.id)}">Apri album</button></div>
      </div>
    </article>`;
  }

  function artistCard(artist) {
    return `<article class="card">
      <div class="card-media artist-media">${artist.image ? `<img src="${esc(artist.image)}" alt="${esc(artist.name)}" loading="lazy" />` : '♫'}</div>
      <div class="card-copy"><strong>${esc(artist.name)}</strong><small>${artist.genres?.length ? esc(artist.genres.slice(0,2).join(' · ')) : 'Artista'}</small>
        <div class="card-actions"><button class="primary" data-open-artist="${esc(artist.id)}">Discografia</button></div>
      </div>
    </article>`;
  }

  function playlistTile(playlist) {
    return `<button class="playlist-tile" data-open-playlist="${esc(playlist.id)}"><span class="playlist-art">♫</span><span><strong>${esc(playlist.name)}</strong><small>${playlist.tracks.length} brani</small></span></button>`;
  }
