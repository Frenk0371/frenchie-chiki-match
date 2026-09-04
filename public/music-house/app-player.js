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
    loadYoutubeTrack(track.id);
    updateMediaSession(track);
  }

  function loadYoutubeTrack(videoId) {
    if (!ytApiReady || !window.YT?.Player) return;
    if (!ytPlayer) {
      ytPlayer = new YT.Player('ytPlayer', {
        videoId,
        playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: event => { ytReady = true; event.target.playVideo(); },
          onStateChange: event => {
            $('#playPauseBtn').textContent = event.data === YT.PlayerState.PLAYING ? '❚❚' : '▶';
            if (event.data === YT.PlayerState.ENDED) playNext();
          },
        },
      });
    } else if (ytReady) {
      ytPlayer.loadVideoById(videoId);
    }
  }

  function updatePlayerUI() {
    const track = state.currentTrack;
    if (!track) { playerShell.hidden = true; return; }
    playerShell.hidden = false;
    nowMeta.innerHTML = `<strong>${esc(track.title)}</strong><small>${esc(track.artist)}</small>`;
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
        album: 'Music House',
        artwork: track.thumb ? [{ src: track.thumb, sizes: '480x360' }] : [],
      });
      navigator.mediaSession.setActionHandler('play', () => ytPlayer?.playVideo?.());
      navigator.mediaSession.setActionHandler('pause', () => ytPlayer?.pauseVideo?.());
      navigator.mediaSession.setActionHandler('previoustrack', playPrev);
      navigator.mediaSession.setActionHandler('nexttrack', playNext);
    } catch { /* browser support varies */ }
  }

  window.onYouTubeIframeAPIReady = () => {
    ytApiReady = true;
    if (state.currentTrack) {
      playerShell.hidden = false;
      updatePlayerUI();
      loadYoutubeTrack(state.currentTrack.id);
    }
  };

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
  $('.video-frame').addEventListener('dblclick', () => playerShell.classList.toggle('expanded'));
  $('#playPauseBtn').addEventListener('click', () => {
    if (!ytPlayer || !ytReady) return;
    const playing = ytPlayer.getPlayerState() === YT.PlayerState.PLAYING;
    playing ? ytPlayer.pauseVideo() : ytPlayer.playVideo();
  });
  $('#nextBtn').addEventListener('click', playNext);
  $('#prevBtn').addEventListener('click', playPrev);
  $('#favoriteCurrentBtn').addEventListener('click', () => state.currentTrack && toggleFavoriteTrack(state.currentTrack));
  $('#addCurrentBtn').addEventListener('click', () => state.currentTrack && openPlaylistSheet(state.currentTrack));
  $('#closePlayerBtn').addEventListener('click', () => {
    ytPlayer?.stopVideo?.();
    playerShell.classList.remove('expanded');
    playerShell.hidden = true;
  });

  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));

  render();
  if (state.currentTrack) updatePlayerUI();
