  async function runSearch(query) {
    currentSearch = { query, tracks: [], artists: [], albums: [], loading: true, error: '', trackError: '' };
    renderSearchResults();

    if (!mhUser) {
      currentSearch.loading = false;
      currentSearch.error = 'Accedi al tuo account Music House per cercare e ascoltare musica.';
      renderSearchResults();
      return;
    }

    try {
      if (!spotifyConnection?.connected) {
        await refreshSpotifyConnectionUI().catch(() => {});
      }
      if (!spotifyConnection?.configured) throw new Error('Spotify è pronto nell’app, ma manca ancora la configurazione iniziale del Client ID.');
      if (!spotifyConnection?.connected) throw new Error('Collega il tuo account Spotify da Account per cercare e ascoltare musica.');

      const params = new URLSearchParams({
        q: query,
        type: 'track,artist,album',
        limit: '20',
      });
      const data = await spotifyApi(`/search?${params}`);

      currentSearch.tracks = (data?.tracks?.items || []).map(normalizeTrack).filter(track => track.id);
      currentSearch.artists = (data?.artists?.items || []).map(normalizeArtist).filter(artist => artist.id);
      currentSearch.albums = (data?.albums?.items || []).map(normalizeAlbum).filter(album => album.id);
      currentSearch.loading = false;
      currentSearch.error = '';
      currentSearch.trackError = '';
    } catch (error) {
      currentSearch.loading = false;
      currentSearch.error = error?.message || 'Ricerca Spotify non disponibile. Riprova tra poco.';
    }
    renderSearchResults();
  }

  async function openArtist(id) {
    const artist = currentSearch.artists.find(item => item.id === id) || { id, name: 'Artista', image: '' };
    const avatar = artist.image
      ? `<img src="${esc(artist.image)}" alt="${esc(artist.name)}" />`
      : '♫';

    content.innerHTML = `<div class="back-row"><button id="backToSearch">‹ Torna alla ricerca</button></div><section class="artist-hero"><div class="artist-avatar">${avatar}</div><div><h1>${esc(artist.name)}</h1><p>Discografia Spotify</p></div></section><div class="track-list"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>`;
    $('#backToSearch').addEventListener('click', renderSearch);

    try {
      let url = `/artists/${encodeURIComponent(id)}/albums?include_groups=album,single&limit=50`;
      const all = [];
      let pages = 0;
      while (url && pages < 4) {
        const data = await spotifyApi(url);
        all.push(...(data?.items || []));
        url = data?.next || '';
        pages++;
      }

      const seen = new Set();
      const albums = all
        .map(normalizeAlbum)
        .filter(album => {
          const key = `${album.title.toLowerCase()}|${album.year}|${album.type}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => String(b.year).localeCompare(String(a.year)));

      content.innerHTML = `<div class="back-row"><button id="backToSearch">‹ Torna alla ricerca</button></div><section class="artist-hero"><div class="artist-avatar">${avatar}</div><div><h1>${esc(artist.name)}</h1><p>${albums.length} pubblicazioni</p></div></section>${albums.length ? `<div class="grid">${albums.map(albumCard).join('')}</div>` : `<div class="empty"><b>Nessuna pubblicazione trovata</b></div>`}`;
      $('#backToSearch').addEventListener('click', renderSearch);
      wireDynamicActions(content);
    } catch (error) {
      content.innerHTML += `<div class="empty"><b>Discografia non disponibile</b>${esc(error?.message || 'Riprova tra poco.')}</div>`;
    }
  }

  async function openAlbum(albumId) {
    const known = [...currentSearch.albums, ...state.favoriteAlbums].find(item => item.id === albumId);
    content.innerHTML = `<div class="back-row"><button id="backToSearch">‹ Torna indietro</button></div><div class="track-list"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>`;
    $('#backToSearch').addEventListener('click', renderSearch);

    try {
      const data = await spotifyApi(`/albums/${encodeURIComponent(albumId)}`);
      const album = normalizeAlbum(data);
      const tracks = (data?.tracks?.items || []).map(track => normalizeTrack({
        ...track,
        album: {
          name: data.name,
          images: data.images,
        },
      })).filter(track => track.id);

      content.innerHTML = `
        <div class="back-row"><button id="backToSearch">‹ Torna alla ricerca</button></div>
        <section class="album-hero">
          <img src="${esc(album.cover)}" alt="Copertina ${esc(album.title)}" />
          <div><small>ALBUM</small><h1>${esc(album.title)}</h1><p>${esc(album.artist)}${album.year ? ` · ${esc(album.year)}` : ''} · ${tracks.length} brani</p></div>
        </section>
        ${tracks.length ? `<button class="primary-btn" id="playAlbumBtn">▶ Riproduci album</button><div class="track-list album-tracks">${tracks.map(track => trackRow(track)).join('')}</div>` : `<div class="empty"><b>Nessun brano disponibile</b></div>`}
      `;
      $('#backToSearch').addEventListener('click', renderSearch);
      $('#playAlbumBtn')?.addEventListener('click', () => playTrack(tracks[0], tracks, 0));
      wireDynamicActions(content, tracks);
    } catch (error) {
      content.innerHTML = `<div class="back-row"><button id="backToSearch">‹ Torna alla ricerca</button></div><div class="empty"><b>Album non disponibile</b>${esc(error?.message || known?.title || 'Riprova tra poco.')}</div>`;
      $('#backToSearch').addEventListener('click', renderSearch);
    }
  }

  function searchAlbumOnYouTube(albumId) {
    return openAlbum(albumId);
  }
