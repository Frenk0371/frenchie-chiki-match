  const MUSIC_HOUSE_SUPABASE_URL = 'https://xrkqeelwutjzyqxgvxmm.supabase.co';
  const MUSIC_HOUSE_SUPABASE_KEY = 'sb_publishable_vQVI5HTbjy6lrDZLmoJfkw_ulzJMIkO';

  const accountBtn = $('#accountBtn');
  const accountModal = $('#accountModal');
  const accountGuestView = $('#accountGuestView');
  const accountUserView = $('#accountUserView');
  const accountError = $('#accountError');
  const accountLabel = $('#accountLabel');
  const accountGlyph = $('#accountGlyph');

  let mhSupabase = null;
  let mhUser = null;
  let cloudSaveTimer = null;
  let suppressCloudSave = false;

  function cloudStatePayload() {
    return {
      favoriteTracks: state.favoriteTracks,
      favoriteAlbums: state.favoriteAlbums,
      playlists: state.playlists,
      recent: state.recent,
    };
  }

  function setAccountError(message = '') {
    if (!accountError) return;
    accountError.textContent = message;
    accountError.hidden = !message;
  }

  function displayNameFor(user) {
    return user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Utente';
  }

  function refreshAccountUI() {
    if (!accountBtn) return;
    if (mhUser) {
      const name = displayNameFor(mhUser);
      accountGlyph.textContent = name.slice(0, 1).toUpperCase();
      accountLabel.textContent = name;
      accountGuestView.hidden = true;
      accountUserView.hidden = false;
      $('#accountAvatar').textContent = name.slice(0, 1).toUpperCase();
      $('#accountName').textContent = name;
      $('#accountEmailCurrent').textContent = mhUser.email || '';
    } else {
      accountGlyph.textContent = '👤';
      accountLabel.textContent = 'Account';
      accountGuestView.hidden = false;
      accountUserView.hidden = true;
    }
  }

  async function ensureProfile(user, requestedName = '') {
    if (!mhSupabase || !user) return;
    const displayName = requestedName.trim() || displayNameFor(user);
    await mhSupabase.from('music_house_profiles').upsert({
      user_id: user.id,
      display_name: displayName,
      updated_at: new Date().toISOString(),
    });
  }

  async function loadCloudState(user) {
    if (!mhSupabase || !user) return;
    suppressCloudSave = true;
    try {
      const { data, error } = await mhSupabase
        .from('music_house_user_state')
        .select('state')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data?.state && typeof data.state === 'object') {
        const remote = data.state;
        state = normalizeSavedState({
          ...state,
          favoriteTracks: Array.isArray(remote.favoriteTracks) ? remote.favoriteTracks : [],
          favoriteAlbums: Array.isArray(remote.favoriteAlbums) ? remote.favoriteAlbums : [],
          playlists: Array.isArray(remote.playlists) ? remote.playlists : [],
          recent: Array.isArray(remote.recent) ? remote.recent : [],
        });
        localStorage.setItem(STORE_KEY, JSON.stringify(state));
      } else {
        await mhSupabase.from('music_house_user_state').upsert({
          user_id: user.id,
          state: cloudStatePayload(),
          updated_at: new Date().toISOString(),
        });
      }
    } finally {
      suppressCloudSave = false;
    }
    render();
    if (typeof updatePlayerUI === 'function') updatePlayerUI();
  }

  async function saveCloudState() {
    if (!mhSupabase || !mhUser || suppressCloudSave) return;
    await mhSupabase.from('music_house_user_state').upsert({
      user_id: mhUser.id,
      state: cloudStatePayload(),
      updated_at: new Date().toISOString(),
    });
  }

  function scheduleCloudSave() {
    if (!mhUser || suppressCloudSave) return;
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(() => saveCloudState().catch(() => {}), 700);
  }

  async function signInMusicHouse() {
    if (!mhSupabase) return;
    setAccountError();
    const email = $('#accountEmail').value.trim();
    const password = $('#accountPassword').value;
    if (!email || !password) {
      setAccountError('Inserisci email e password.');
      return;
    }

    $('#signInBtn').disabled = true;
    try {
      const { data, error } = await mhSupabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      mhUser = data.user;
      await ensureProfile(mhUser);
      await loadCloudState(mhUser);
      refreshAccountUI();
      accountModal.hidden = true;
      toastMessage(`Ciao ${displayNameFor(mhUser)}`);
    } catch (error) {
      setAccountError(error?.message === 'Invalid login credentials' ? 'Email o password non corretti.' : (error?.message || 'Accesso non riuscito.'));
    } finally {
      $('#signInBtn').disabled = false;
    }
  }

  async function signUpMusicHouse() {
    if (!mhSupabase) return;
    setAccountError();
    const name = $('#displayName').value.trim();
    const email = $('#accountEmail').value.trim();
    const password = $('#accountPassword').value;
    if (!name || !email || password.length < 6) {
      setAccountError('Inserisci nome, email e una password di almeno 6 caratteri.');
      return;
    }

    $('#signUpBtn').disabled = true;
    try {
      const { data, error } = await mhSupabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name } },
      });
      if (error) throw error;

      if (data.session && data.user) {
        mhUser = data.user;
        await ensureProfile(mhUser, name);
        await loadCloudState(mhUser);
        refreshAccountUI();
        accountModal.hidden = true;
        toastMessage('Account creato');
      } else {
        setAccountError('Account creato. Controlla la tua email per confermare l’indirizzo, poi accedi.');
      }
    } catch (error) {
      setAccountError(error?.message || 'Creazione account non riuscita.');
    } finally {
      $('#signUpBtn').disabled = false;
    }
  }

  async function signOutMusicHouse() {
    if (!mhSupabase) return;
    await saveCloudState().catch(() => {});
    await mhSupabase.auth.signOut();
    mhUser = null;
    suppressCloudSave = true;
    state = structuredClone(DEFAULT_STATE);
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    suppressCloudSave = false;
    refreshAccountUI();
    accountModal.hidden = true;
    render();
    if (typeof updatePlayerUI === 'function') updatePlayerUI();
    toastMessage('Disconnesso');
  }

  function openAccountModal() {
    setAccountError();
    refreshAccountUI();
    accountModal.hidden = false;
  }

  async function initMusicHouseAuth() {
    if (!window.supabase?.createClient) {
      accountBtn?.setAttribute('disabled', '');
      return;
    }

    mhSupabase = window.supabase.createClient(MUSIC_HOUSE_SUPABASE_URL, MUSIC_HOUSE_SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });

    const { data } = await mhSupabase.auth.getSession();
    mhUser = data.session?.user || null;
    refreshAccountUI();

    if (mhUser) {
      await ensureProfile(mhUser);
      await loadCloudState(mhUser).catch(() => {});
    }

    mhSupabase.auth.onAuthStateChange(async (event, session) => {
      const nextUser = session?.user || null;
      if (nextUser?.id === mhUser?.id) return;
      mhUser = nextUser;
      refreshAccountUI();
      if (mhUser && event === 'SIGNED_IN') {
        await ensureProfile(mhUser);
        await loadCloudState(mhUser).catch(() => {});
      }
    });
  }

  accountBtn?.addEventListener('click', openAccountModal);
  $('#signInBtn')?.addEventListener('click', signInMusicHouse);
  $('#signUpBtn')?.addEventListener('click', signUpMusicHouse);
  $('#signOutBtn')?.addEventListener('click', signOutMusicHouse);
  $('#accountPassword')?.addEventListener('keydown', event => {
    if (event.key === 'Enter') signInMusicHouse();
  });

  initMusicHouseAuth().catch(() => {});
