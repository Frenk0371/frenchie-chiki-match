  function renderLibrary() {
    content.innerHTML = `
      <section class="hero"><h1>La tua libreria</h1><p>Preferiti e album salvati.</p></section>
      ${sectionHead('Brani preferiti', state.favoriteTracks.length ? `${state.favoriteTracks.length} brani` : '')}
      ${state.favoriteTracks.length ? `<div class="track-list">${state.favoriteTracks.map(track => trackRow(track, state.favoriteTracks)).join('')}</div>` : `<div class="empty"><b>Nessun brano preferito</b>Tocca ♡ accanto a una canzone.</div>`}
      ${sectionHead('Album preferiti', state.favoriteAlbums.length ? `${state.favoriteAlbums.length} album` : '')}
      ${state.favoriteAlbums.length ? `<div class="grid">${state.favoriteAlbums.map(albumCard).join('')}</div>` : `<div class="empty"><b>Nessun album preferito</b>Salva gli album che vuoi ritrovare velocemente.</div>`}
    `;
    wireDynamicActions(content);
  }

  function renderPlaylists() {
    content.innerHTML = `
      <section class="hero"><h1>Playlist</h1><p>Crea le tue raccolte personali.</p></section>
      <button class="primary-btn" id="createPlaylistBtn">＋ Crea nuova playlist</button>
      ${sectionHead('Le tue playlist', state.playlists.length ? `${state.playlists.length} create` : '')}
      ${state.playlists.length ? `<div class="playlist-list">${state.playlists.map(playlistTile).join('')}</div>` : `<div class="empty"><b>Ancora nessuna playlist</b>Creane una e aggiungi i tuoi brani.</div>`}
    `;
    $('#createPlaylistBtn').addEventListener('click', () => {
      const name = prompt('Nome della playlist');
      if (createPlaylist(name)) { toastMessage('Playlist creata'); renderPlaylists(); }
    });
    $$('[data-open-playlist]', content).forEach(btn => btn.addEventListener('click', () => openPlaylist(btn.dataset.openPlaylist)));
  }

  function openPlaylist(id) {
    const playlist = state.playlists.find(item => item.id === id);
    if (!playlist) return;
    content.innerHTML = `
      <div class="back-row"><button id="backPlaylists">‹ Playlist</button></div>
      <section class="artist-hero"><div class="playlist-art" style="width:96px;height:96px;border-radius:28px;font-size:38px">♫</div><div><h1>${esc(playlist.name)}</h1><p>${playlist.tracks.length} brani</p></div></section>
      ${playlist.tracks.length ? `<button class="primary-btn" id="playPlaylistBtn">▶ Riproduci playlist</button><div class="track-list" style="margin-top:15px">${playlist.tracks.map(track => trackRow(track, playlist.tracks)).join('')}</div>` : `<div class="empty"><b>Playlist vuota</b>Aggiungi brani dalla ricerca.</div>`}
    `;
    $('#backPlaylists').addEventListener('click', renderPlaylists);
    $('#playPlaylistBtn')?.addEventListener('click', () => playTrack(playlist.tracks[0], playlist.tracks, 0));
    wireDynamicActions(content, playlist.tracks);
  }

  function render() {
    if (view === 'home') renderHome();
    else if (view === 'search') renderSearch();
    else if (view === 'library') renderLibrary();
    else if (view === 'playlists') renderPlaylists();
    wireDynamicActions(content);
  }

  function findTrackById(id) {
    const sources = [currentSearch.tracks, state.favoriteTracks, state.recent, ...state.playlists.map(p => p.tracks), state.queue];
    for (const source of sources) {
      const match = source.find?.(item => item.id === id);
      if (match) return match;
    }
    return null;
  }

  function wireDynamicActions(root = document, queue = null) {
    $$('[data-nav]', root).forEach(btn => {
      if (btn.dataset.wiredNav) return;
      btn.dataset.wiredNav = '1';
      btn.addEventListener('click', () => navigate(btn.dataset.nav));
    });
    $$('[data-play-track]', root).forEach(btn => {
      if (btn.dataset.wired) return; btn.dataset.wired = '1';
      btn.addEventListener('click', () => {
        const track = findTrackById(btn.dataset.playTrack);
        if (!track) return;
        const activeQueue = queue || (currentSearch.tracks.some(t => t.id === track.id) ? currentSearch.tracks : state.favoriteTracks.some(t => t.id === track.id) ? state.favoriteTracks : [track]);
        const idx = activeQueue.findIndex(t => t.id === track.id);
        playTrack(track, activeQueue, Math.max(0, idx));
      });
    });
    $$('[data-fav-track]', root).forEach(btn => {
      if (btn.dataset.wired) return; btn.dataset.wired = '1';
      btn.addEventListener('click', () => { const track = findTrackById(btn.dataset.favTrack); if (track) toggleFavoriteTrack(track); });
    });
    $$('[data-add-track]', root).forEach(btn => {
      if (btn.dataset.wired) return; btn.dataset.wired = '1';
      btn.addEventListener('click', () => { const track = findTrackById(btn.dataset.addTrack); if (track) openPlaylistSheet(track); });
    });
    $$('[data-fav-album]', root).forEach(btn => {
      if (btn.dataset.wired) return; btn.dataset.wired = '1';
      btn.addEventListener('click', () => {
        const album = [...currentSearch.albums, ...state.favoriteAlbums].find(item => item.id === btn.dataset.favAlbum);
        if (album) toggleFavoriteAlbum(album);
      });
    });
    $$('[data-open-artist]', root).forEach(btn => {
      if (btn.dataset.wired) return; btn.dataset.wired = '1';
      btn.addEventListener('click', () => openArtist(btn.dataset.openArtist));
    });
    $$('[data-search-album]', root).forEach(btn => {
      if (btn.dataset.wired) return; btn.dataset.wired = '1';
      btn.addEventListener('click', () => searchAlbumOnYouTube(btn.dataset.searchAlbum));
    });
    $$('[data-open-playlist]', root).forEach(btn => {
      if (btn.dataset.wired) return; btn.dataset.wired = '1';
      btn.addEventListener('click', () => openPlaylist(btn.dataset.openPlaylist));
    });
  }

  function openSettings() {
    $('#youtubeKey').value = state.settings.youtubeKey || '';
    $('#settingsModal').hidden = false;
  }

  function openPlaylistSheet(track) {
    pendingPlaylistTrack = track;
    const choices = $('#playlistChoices');
    choices.innerHTML = state.playlists.length ? state.playlists.map(p => `<button class="playlist-choice" data-choose-playlist="${esc(p.id)}"><span><b>${esc(p.name)}</b><small>${p.tracks.length} brani</small></span><span>＋</span></button>`).join('') : `<div class="empty"><b>Nessuna playlist</b>Creane una qui sotto.</div>`;
    $('#playlistModal').hidden = false;
    $$('[data-choose-playlist]', choices).forEach(btn => btn.addEventListener('click', () => {
      addTrackToPlaylist(btn.dataset.choosePlaylist, pendingPlaylistTrack);
      $('#playlistModal').hidden = true;
    }));
  }
