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

  function shuffleTracks(tracks) {
    const shuffled = [...tracks];
    for (let index = shuffled.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    if (shuffled.length > 1 && shuffled.every((track, index) => track.id === tracks[index]?.id)) {
      [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
    }
    return shuffled;
  }

  function resizePlaylistImage(file) {
    return new Promise((resolve, reject) => {
      if (!file?.type?.startsWith('image/')) {
        reject(new Error('Scegli un file immagine.'));
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        reject(new Error('L’immagine è troppo grande. Usa un file sotto i 10 MB.'));
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Impossibile leggere l’immagine.'));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error('Formato immagine non supportato.'));
        image.onload = () => {
          const size = 512;
          const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
          const sourceX = Math.max(0, (image.naturalWidth - sourceSize) / 2);
          const sourceY = Math.max(0, (image.naturalHeight - sourceSize) / 2);
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const context = canvas.getContext('2d');
          if (!context) {
            reject(new Error('Impossibile elaborare l’immagine.'));
            return;
          }
          context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
          let dataUrl = canvas.toDataURL('image/webp', 0.82);
          if (!dataUrl.startsWith('data:image/webp')) dataUrl = canvas.toDataURL('image/jpeg', 0.84);
          resolve(dataUrl);
        };
        image.src = String(reader.result || '');
      };
      reader.readAsDataURL(file);
    });
  }

  function openPlaylist(id) {
    const playlist = state.playlists.find(item => item.id === id);
    if (!playlist) return;
    content.innerHTML = `
      <div class="back-row"><button id="backPlaylists">‹ Playlist</button></div>
      <section class="playlist-hero">
        <div class="playlist-cover-wrap">
          ${playlistArtwork(playlist, 'playlist-art playlist-hero-art')}
          <button class="playlist-image-btn" id="changePlaylistImageBtn">📷 ${playlist.image ? 'Cambia immagine' : 'Carica immagine'}</button>
          <input id="playlistImageInput" type="file" accept="image/*" hidden />
        </div>
        <div class="playlist-hero-copy"><h1>${esc(playlist.name)}</h1><p>${playlist.tracks.length} brani</p></div>
      </section>
      ${playlist.image ? `<button class="playlist-remove-image" id="removePlaylistImageBtn">Rimuovi immagine</button>` : ''}
      ${playlist.tracks.length ? `
        <div class="playlist-play-actions">
          <button class="primary-btn" id="playPlaylistBtn">▶ Riproduci</button>
          <button class="shuffle-btn" id="shufflePlaylistBtn">🔀 Shuffle</button>
        </div>
        <div class="track-list" style="margin-top:15px">${playlist.tracks.map(track => trackRow(track, playlist.tracks)).join('')}</div>
      ` : `<div class="empty"><b>Playlist vuota</b>Aggiungi brani dalla ricerca.</div>`}
    `;

    $('#backPlaylists').addEventListener('click', renderPlaylists);
    $('#playPlaylistBtn')?.addEventListener('click', () => playTrack(playlist.tracks[0], playlist.tracks, 0));
    $('#shufflePlaylistBtn')?.addEventListener('click', () => {
      const shuffled = shuffleTracks(playlist.tracks);
      if (!shuffled.length) return;
      playTrack(shuffled[0], shuffled, 0);
      toastMessage('Playlist in modalità shuffle');
    });

    const imageInput = $('#playlistImageInput');
    $('#changePlaylistImageBtn')?.addEventListener('click', () => imageInput?.click());
    imageInput?.addEventListener('change', async () => {
      const file = imageInput.files?.[0];
      if (!file) return;
      try {
        $('#changePlaylistImageBtn').disabled = true;
        playlist.image = await resizePlaylistImage(file);
        saveState();
        toastMessage('Immagine playlist aggiornata');
        openPlaylist(playlist.id);
      } catch (error) {
        toastMessage(error?.message || 'Impossibile caricare l’immagine');
        $('#changePlaylistImageBtn').disabled = false;
      }
    });
    $('#removePlaylistImageBtn')?.addEventListener('click', () => {
      playlist.image = '';
      saveState();
      toastMessage('Immagine rimossa');
      openPlaylist(playlist.id);
    });

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
