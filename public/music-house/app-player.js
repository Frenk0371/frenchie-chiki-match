  let spotifyPlayer = null;
  let spotifyDeviceId = '';
  let spotifyPlayerReadyResolve = null;
  let spotifyPlayerReadyPromise = null;
  let spotifyIsPlaying = false;

  function waitForSpotifySdk(timeoutMs = 8000) {
    if (window.Spotify?.Player) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const timer = setInterval(() => {
        if (window.Spotify?.Player) {
          clearInterval(timer);
          resolve();
        } else if (Date.now() - started > timeoutMs) {
          clearInterval(timer);
          reject(new Error('Player Spotify non disponibile. Riprova.'));
        }
      }, 100);
    });
  }

  async function ensureSpotifyPlayer() {
    if (!mhUser) throw new Error('Accedi prima a Music House.');
    if (!spotifyConnection?.connected) throw new Error('Collega Spotify dal tuo Account.');
    if (spotifyPlayer && spotifyDeviceId) return spotifyPlayer;

    await waitForSpotifySdk();
    if (!spotifyPlayer) {
      spotifyPlayerReadyPromise = new Promise(resolve => { spotifyPlayerReadyResolve = resolve; });
      spotifyPlayer = new Spotify.Player({
        name: 'Music House',
        volume: 0.8,
        getOAuthToken: callback => {
          getSpotifyAccessToken().then(callback).catch(() => {});
        },
      });

      spotifyPlayer.addListener('ready', ({ device_id }) => {
        spotifyDeviceId = device_id;
        spotifyPlayerReadyResolve?.(device_id);
      });
      spotifyPlayer.addListener('not_ready', ({ device_id }) => {
        if (spotifyDeviceId === device_id) spotifyDeviceId = '';
      });
      spotifyPlayer.addListener('initialization_error', ({ message }) => toastMessage(`Spotify: ${message}`));
      spotifyPlayer.addListener('authentication_error', ({ message }) => toastMessage(`Spotify: ${message}`));
      spotifyPlayer.addListener('account_error', () => toastMessage('Per ascoltare in Music House serve Spotify Premium.'));
      spotifyPlayer.addListener('playback_error', ({ message }) => toastMessage(`Riproduzione Spotify: ${message}`));
      spotifyPlayer.addListener('player_state_changed', playerState => {
        if (!playerState) return;
        spotifyIsPlaying = !playerState.paused;
        $('#playPauseBtn').textContent = spotifyIsPlaying ? '❚❚' : '▶';
        const uri = playerState.track_window?.current_track?.uri || '';
        const idx = state.queue.findIndex(item => item.uri === uri);
        if (idx >= 0 && idx !== state.queueIndex) {
          state.queueIndex = idx;
          state.currentTrack = state.queue[idx];
          saveState();
          updatePlayerUI();
        }
      });
      const connected = await spotifyPlayer.connect();
      if (!connected) throw new Error('Impossibile avviare il player Spotify.');
    }

    if (!spotifyDeviceId) await spotifyPlayerReadyPromise;
    return spotifyPlayer;
  }

  async function startSpotifyPlayback(track) {
    if (!track?.uri) throw new Error('Questo vecchio brano non è ancora collegato al catalogo Spotify. Cercalo di nuovo.');
    const player = await ensureSpotifyPlayer();
    await player.activateElement?.();

    if (!spotifyDeviceId) await spotifyPlayerReadyPromise;

    await spotifyApi('/me/player', {
      method: 'PUT',
      body: JSON.stringify({ device_ids: [spotifyDeviceId], play: false }),
    });

    const queueUris = state.queue
      .slice(state.queueIndex, state.queueIndex + 50)
      .map(item => item.uri)
      .filter(Boolean);
    const uris = queueUris.length ? queueUris : [track.uri];

    await spotifyApi(`/me/player/play?device_id=${encodeURIComponent(spotifyDeviceId)}`, {
      method: 'PUT',
      body: JSON.stringify({ uris }),
    });
  }

  function playTrack(track, queue = [track], queueIndex = 0) {
    if (!track?.id) return;
    state.currentTrack = track;
    state.queue = queue.length ? queue : [track];
    state.queueIndex = queueIndex >= 0 ? queueIndex : state.queue.findIndex(item => item.id === track.id);
    if (state.queueIndex < 0) state.queueIndex = 0;
    saveState();
    pushRecent(track);
    playerShell.hidden = false;
    updatePlayerUI();
    updateMediaSession(track);
    startSpotifyPlayback(track).catch(error => toastMessage(error?.message || 'Riproduzione Spotify non disponibile'));
  }

  function updatePlayerUI() {
    const track = state.currentTrack;
    if (!track) {
      playerShell.hidden = true;
      return;
    }
    playerShell.hidden = false;
    nowMeta.innerHTML = `<strong>${esc(track.title)}</strong><small>${esc(track.artist)}${track.album ? ` · ${esc(track.album)}` : ''}</small>`;
    const cover = $('#currentCover');
    if (cover) cover.src = track.thumb || './music-house-192.png';
    $('#favoriteCurrentBtn').textContent = `${isFavoriteTrack(track.id) ? '♥' : '♡'} Preferito`;
  }

  function playNext() {
    if (!state.queue.length) return;
    const nextIndex = (state.queueIndex + 1) % state.queue.length;
    playTrack(state.queue[nextIndex], state.queue, nextIndex);
  }

  function playPrev() {
    if (!state.queue.length) return;
    const prevIndex = (state.queueIndex - 1 + state.queue.length) % state.queue.length;
    playTrack(state.queue[prevIndex], state.queue, prevIndex);
  }

  function updateMediaSession(track) {
    if (!('mediaSession' in navigator) || !window.MediaMetadata) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album || 'Music House',
        artwork: track.thumb ? [{ src: track.thumb }] : [],
      });
      navigator.mediaSession.setActionHandler('play', () => spotifyPlayer?.resume?.());
      navigator.mediaSession.setActionHandler('pause', () => spotifyPlayer?.pause?.());
      navigator.mediaSession.setActionHandler('previoustrack', playPrev);
      navigator.mediaSession.setActionHandler('nexttrack', playNext);
    } catch { /* supporto variabile tra browser */ }
  }

  function disconnectSpotifyPlayer() {
    try { spotifyPlayer?.disconnect?.(); } catch { /* no-op */ }
    spotifyPlayer = null;
    spotifyDeviceId = '';
    spotifyPlayerReadyPromise = null;
    spotifyPlayerReadyResolve = null;
    spotifyIsPlaying = false;
  }

  window.onSpotifyWebPlaybackSDKReady = () => {
    if (spotifyConnection?.connected && mhUser) ensureSpotifyPlayer().catch(() => {});
  };

  window.addEventListener('music-house-spotify-change', event => {
    if (event.detail?.connected) ensureSpotifyPlayer().catch(() => {});
    else disconnectSpotifyPlayer();
  });

  $$('.bottom-nav [data-nav], .brand[data-nav]').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.nav)));
  $$('[data-close-modal]').forEach(btn => btn.addEventListener('click', () => { document.getElementById(btn.dataset.closeModal).hidden = true; }));
  $$('.modal-backdrop').forEach(modal => modal.addEventListener('click', event => { if (event.target === modal) modal.hidden = true; }));
  $('#newPlaylistFromSheet').addEventListener('click', () => {
    const name = prompt('Nome della nuova playlist');
    const playlist = createPlaylist(name);
    if (!playlist) return;
    if (pendingPlaylistTrack) addTrackToPlaylist(playlist.id, pendingPlaylistTrack);
    $('#playlistModal').hidden = true;
  });
  $('#expandPlayer').addEventListener('click', () => playerShell.classList.remove('expanded'));
  nowMeta.addEventListener('click', () => playerShell.classList.add('expanded'));
  $('.player-cover').addEventListener('dblclick', () => playerShell.classList.toggle('expanded'));
  $('#playPauseBtn').addEventListener('click', async () => {
    try {
      const player = await ensureSpotifyPlayer();
      await player.activateElement?.();
      await player.togglePlay();
    } catch (error) {
      toastMessage(error?.message || 'Spotify non disponibile');
    }
  });
  $('#nextBtn').addEventListener('click', playNext);
  $('#prevBtn').addEventListener('click', playPrev);
  $('#favoriteCurrentBtn').addEventListener('click', () => state.currentTrack && toggleFavoriteTrack(state.currentTrack));
  $('#addCurrentBtn').addEventListener('click', () => state.currentTrack && openPlaylistSheet(state.currentTrack));
  $('#closePlayerBtn').addEventListener('click', () => {
    spotifyPlayer?.pause?.().catch?.(() => {});
    playerShell.classList.remove('expanded');
    playerShell.hidden = true;
  });

  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));

  render();
  if (state.currentTrack) updatePlayerUI();
