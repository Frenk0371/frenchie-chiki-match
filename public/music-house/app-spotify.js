  const SPOTIFY_PKCE_VERIFIER = 'music-house-spotify-verifier';
  const SPOTIFY_OAUTH_STATE = 'music-house-spotify-state';
  const SPOTIFY_SCOPES = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-read-playback-state',
    'user-modify-playback-state',
  ].join(' ');

  let spotifyConnection = {
    configured: false,
    connected: false,
    clientId: '',
    redirectUri: 'https://frenchie-chiki-match.vercel.app/music-house/',
    displayName: '',
  };
  let spotifyStatusLoading = false;

  const base64url = bytes => btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');

  async function spotifyInvoke(action, payload = {}) {
    if (!mhSupabase || !mhUser) throw new Error('Accedi a Music House prima di collegare Spotify.');
    const { data, error } = await mhSupabase.functions.invoke('music-house-spotify', {
      body: { action, ...payload },
    });
    if (error) {
      const message = data?.error || error?.message || 'Spotify non disponibile.';
      throw new Error(message);
    }
    if (data?.error) throw new Error(data.error);
    return data || {};
  }

  async function refreshSpotifyConnectionUI() {
    const statusEl = $('#spotifyStatus');
    const connectBtn = $('#spotifyConnectBtn');
    const disconnectBtn = $('#spotifyDisconnectBtn');
    const help = $('#spotifyHelp');
    if (!statusEl || !connectBtn || !disconnectBtn) return;

    if (!mhUser || !mhSupabase) {
      spotifyConnection = { ...spotifyConnection, connected: false };
      statusEl.textContent = 'Accedi prima a Music House';
      connectBtn.disabled = true;
      connectBtn.hidden = false;
      disconnectBtn.hidden = true;
      return;
    }

    if (spotifyStatusLoading) return;
    spotifyStatusLoading = true;
    statusEl.textContent = 'Verifica collegamento…';
    connectBtn.disabled = true;

    try {
      const status = await spotifyInvoke('status');
      spotifyConnection = { ...spotifyConnection, ...status };
      if (!status.configured) {
        statusEl.textContent = 'Configurazione Spotify da completare';
        help.textContent = 'Music House è già predisposta. Manca solo il Client ID dell’app Spotify, una sola volta per tutta la famiglia.';
        connectBtn.hidden = false;
        connectBtn.disabled = true;
        disconnectBtn.hidden = true;
      } else if (status.connected) {
        statusEl.textContent = status.displayName ? `Collegato a ${status.displayName}` : 'Spotify collegato';
        help.textContent = 'Questo collegamento appartiene solo al tuo account Music House.';
        connectBtn.hidden = true;
        disconnectBtn.hidden = false;
      } else {
        statusEl.textContent = 'Non collegato';
        help.textContent = 'Collega una volta il tuo Spotify Premium. Playlist e preferiti restano personali in Music House.';
        connectBtn.hidden = false;
        connectBtn.disabled = false;
        disconnectBtn.hidden = true;
      }
    } catch (error) {
      statusEl.textContent = 'Spotify non disponibile';
      connectBtn.hidden = false;
      connectBtn.disabled = true;
      disconnectBtn.hidden = true;
      help.textContent = error?.message || 'Riprova tra poco.';
    } finally {
      spotifyStatusLoading = false;
    }
  }

  async function connectSpotify() {
    if (!mhUser) {
      toastMessage('Accedi prima a Music House');
      return;
    }
    const status = await spotifyInvoke('status');
    if (!status.configured || !status.clientId) {
      toastMessage('Spotify deve essere configurato una sola volta nell’app');
      return;
    }

    const verifierBytes = crypto.getRandomValues(new Uint8Array(64));
    const verifier = base64url(verifierBytes);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    const challenge = base64url(new Uint8Array(digest));
    const oauthState = base64url(crypto.getRandomValues(new Uint8Array(24)));

    sessionStorage.setItem(SPOTIFY_PKCE_VERIFIER, verifier);
    sessionStorage.setItem(SPOTIFY_OAUTH_STATE, oauthState);

    const params = new URLSearchParams({
      client_id: status.clientId,
      response_type: 'code',
      redirect_uri: status.redirectUri,
      scope: SPOTIFY_SCOPES,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      state: oauthState,
      show_dialog: 'true',
    });
    window.location.assign(`https://accounts.spotify.com/authorize?${params}`);
  }

  async function handleSpotifyCallback() {
    if (!mhUser || !mhSupabase) return;
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const returnedState = url.searchParams.get('state');
    const oauthError = url.searchParams.get('error');
    if (!code && !oauthError) return;

    const cleanUrl = `${url.origin}${url.pathname}${url.hash}`;
    if (oauthError) {
      history.replaceState({}, '', cleanUrl);
      toastMessage('Collegamento Spotify annullato');
      return;
    }

    const verifier = sessionStorage.getItem(SPOTIFY_PKCE_VERIFIER) || '';
    const expectedState = sessionStorage.getItem(SPOTIFY_OAUTH_STATE) || '';
    if (!verifier || !expectedState || returnedState !== expectedState) {
      history.replaceState({}, '', cleanUrl);
      toastMessage('Collegamento Spotify non valido. Riprova.');
      return;
    }

    try {
      await spotifyInvoke('exchange', { code, codeVerifier: verifier });
      sessionStorage.removeItem(SPOTIFY_PKCE_VERIFIER);
      sessionStorage.removeItem(SPOTIFY_OAUTH_STATE);
      history.replaceState({}, '', cleanUrl);
      await refreshSpotifyConnectionUI();
      toastMessage('Spotify collegato');
      window.dispatchEvent(new CustomEvent('music-house-spotify-change', { detail: { connected: true } }));
    } catch (error) {
      history.replaceState({}, '', cleanUrl);
      toastMessage(error?.message || 'Collegamento Spotify non riuscito');
    }
  }

  async function disconnectSpotify() {
    try {
      await spotifyInvoke('disconnect');
      spotifyConnection = { ...spotifyConnection, connected: false, displayName: '' };
      await refreshSpotifyConnectionUI();
      if (typeof disconnectSpotifyPlayer === 'function') disconnectSpotifyPlayer();
      toastMessage('Spotify scollegato');
      window.dispatchEvent(new CustomEvent('music-house-spotify-change', { detail: { connected: false } }));
    } catch (error) {
      toastMessage(error?.message || 'Impossibile scollegare Spotify');
    }
  }

  async function getSpotifyAccessToken() {
    const data = await spotifyInvoke('token');
    if (!data.accessToken) throw new Error('Spotify non collegato');
    return data.accessToken;
  }

  async function spotifyApi(path, options = {}, retry = true) {
    const token = await getSpotifyAccessToken();
    const response = await fetch(path.startsWith('http') ? path : `https://api.spotify.com/v1${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
    if (response.status === 401 && retry) return spotifyApi(path, options, false);
    if (response.status === 204) return null;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message || `Errore Spotify (${response.status})`);
    return data;
  }

  $('#spotifyConnectBtn')?.addEventListener('click', () => connectSpotify().catch(error => toastMessage(error?.message || 'Spotify non disponibile')));
  $('#spotifyDisconnectBtn')?.addEventListener('click', disconnectSpotify);

  window.addEventListener('music-house-auth-change', () => {
    refreshSpotifyConnectionUI().then(handleSpotifyCallback).catch(() => {});
  });

  window.addEventListener('load', () => {
    window.setTimeout(() => refreshSpotifyConnectionUI().then(handleSpotifyCallback).catch(() => {}), 250);
  });
