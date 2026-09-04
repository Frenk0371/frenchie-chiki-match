  const backgroundAudio = $('#backgroundAudio');
  let playbackEngine = 'youtube';
  let pendingYoutubeVideoId = '';

  function hasDirectAudio(track) {
    return Boolean(track?.audioUrl && String(track.audioUrl).trim());
  }

  function setPlayButton(playing) {
    $('#playPauseBtn').textContent = playing ? '❚❚' : '▶';
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

    if (hasDirectAudio(track)) {
      if (playbackEngine === 'youtube') ytPlayer?.stopVideo?.();
      playbackEngine = 'audio';
      loadDirectAudio(track);
    } else {
      if (playbackEngine === 'audio') stopDirectAudio();
      playbackEngine = 'youtube';
      loadYoutubeTrack(track.id);
    }

    updateMediaSession(track);
  }

  async function loadDirectAudio(track) {
    const source = String(track.audioUrl || '').trim();
    if (!source || !backgroundAudio) return;

    const resolvedSource = new URL(source, window.location.href).href;
    if (backgroundAudio.src !== resolvedSource) {
      backgroundAudio.src = source;
      backgroundAudio.load();
    }

    try {
      await backgroundAudio.play();
    } catch {
      setPlayButton(false);
      toastMessage('Tocca di nuovo Play per avviare l’audio');
    }
  }

  function stopDirectAudio() {
    if (!backgroundAudio) return;
    backgroundAudio.pause();
    if (backgroundAudio.getAttribute('src')) {
      backgroundAudio.removeAttribute('src');
      backgroundAudio.load();
    }
  }

  function loadYoutubeTrack(videoId) {
    if (!videoId) return;
    pendingYoutubeVideoId = videoId;

    if (!ytApiReady || !window.YT?.Player) return;

    if (!ytPlayer) {
      const initialVideoId = pendingYoutubeVideoId;
      ytPlayer = new YT.Player('ytPlayer', {
        videoId: initialVideoId,
        playerVars: {
          autoplay: 1,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: event => {
            ytReady = true;
            if (playbackEngine !== 'youtube') return;
            const wantedVideoId = pendingYoutubeVideoId || initialVideoId;
            const currentVideoId = event.target.getVideoData?.().video_id || initialVideoId;
            if (wantedVideoId && wantedVideoId !== currentVideoId) {
              event.target.loadVideoById(wantedVideoId);
            } else {
              event.target.playVideo();
            }
          },
          onStateChange: event => {
            if (playbackEngine !== 'youtube') return;
            setPlayButton(event.data === YT.PlayerState.PLAYING);
            if (event.data === YT.PlayerState.ENDED) playNext();
          },
          onError: () => {
            if (playbackEngine === 'youtube') {
              setPlayButton(false);
              toastMessage('Questo video YouTube non è riproducibile. Prova un altro risultato.');
            }
          },
        },
      });
      return;
    }

    if (ytReady) ytPlayer.loadVideoById(videoId);
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

  function mediaPlay() {
    if (playbackEngine === 'audio') return backgroundAudio?.play?.();
    return ytPlayer?.playVideo?.();
  }

  function mediaPause() {
    if (playbackEngine === 'audio') return backgroundAudio?.pause?.();
    return ytPlayer?.pauseVideo?.();
  }

  function updateMediaSession(track) {
    if (!('mediaSession' in navigator) || !window.MediaMetadata) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: 'Music House',
        artwork: track.thumb ? [{ src: track.thumb }] : [],
      });
      navigator.mediaSession.setActionHandler('play', mediaPlay);
      navigator.mediaSession.setActionHandler('pause', mediaPause);
      navigator.mediaSession.setActionHandler('previoustrack', playPrev);
      navigator.mediaSession.setActionHandler('nexttrack', playNext);
      navigator.mediaSession.setActionHandler('seekbackward', details => {
        if (playbackEngine !== 'audio' || !backgroundAudio) return;
        const amount = details.seekOffset || 10;
        backgroundAudio.currentTime = Math.max(0, backgroundAudio.currentTime - amount);
      });
      navigator.mediaSession.setActionHandler('seekforward', details => {
        if (playbackEngine !== 'audio' || !backgroundAudio) return;
        const amount = details.seekOffset || 10;
        backgroundAudio.currentTime = Math.min(backgroundAudio.duration || Infinity, backgroundAudio.currentTime + amount);
      });
    } catch { /* browser support varies */ }
  }

  backgroundAudio?.addEventListener('play', () => {
    if (playbackEngine === 'audio') setPlayButton(true);
  });
  backgroundAudio?.addEventListener('pause', () => {
    if (playbackEngine === 'audio') setPlayButton(false);
  });
  backgroundAudio?.addEventListener('ended', () => {
    if (playbackEngine === 'audio') playNext();
  });

  window.onYouTubeIframeAPIReady = () => {
    ytApiReady = true;
    if (state.currentTrack) {
      playerShell.hidden = false;
      updatePlayerUI();
      if (hasDirectAudio(state.currentTrack)) {
        playbackEngine = 'audio';
        updateMediaSession(state.currentTrack);
      } else {
        playbackEngine = 'youtube';
        loadYoutubeTrack(state.currentTrack.id);
      }
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
    if (playbackEngine === 'audio') {
      backgroundAudio.paused ? backgroundAudio.play() : backgroundAudio.pause();
      return;
    }
    if (!ytPlayer || !ytReady) {
      if (state.currentTrack?.id) loadYoutubeTrack(state.currentTrack.id);
      return;
    }
    const playing = ytPlayer.getPlayerState() === YT.PlayerState.PLAYING;
    playing ? ytPlayer.pauseVideo() : ytPlayer.playVideo();
  });
  $('#nextBtn').addEventListener('click', playNext);
  $('#prevBtn').addEventListener('click', playPrev);
  $('#favoriteCurrentBtn').addEventListener('click', () => state.currentTrack && toggleFavoriteTrack(state.currentTrack));
  $('#addCurrentBtn').addEventListener('click', () => state.currentTrack && openPlaylistSheet(state.currentTrack));
  $('#closePlayerBtn').addEventListener('click', () => {
    ytPlayer?.stopVideo?.();
    if (playbackEngine === 'audio') stopDirectAudio();
    playerShell.classList.remove('expanded');
    playerShell.hidden = true;
  });

  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));

  render();
  if (state.currentTrack) updatePlayerUI();
