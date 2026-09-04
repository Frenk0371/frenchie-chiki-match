  async function runSearch(query) {
    currentSearch = { query, tracks: [], artists: [], albums: [], loading: true, error: '' };
    renderSearchResults();
    try {
      const tasks = [searchMusicBrainzArtists(query), searchMusicBrainzAlbums(query)];
      if (state.settings.youtubeKey) tasks.push(searchYouTube(query));
      const results = await Promise.allSettled(tasks);
      currentSearch.artists = results[0].status === 'fulfilled' ? results[0].value : [];
      currentSearch.albums = results[1].status === 'fulfilled' ? results[1].value : [];
      if (state.settings.youtubeKey) currentSearch.tracks = results[2]?.status === 'fulfilled' ? results[2].value : [];
      currentSearch.loading = false;
      currentSearch.error = '';
    } catch (error) {
      currentSearch.loading = false;
      currentSearch.error = error?.message || 'Riprova tra poco.';
    }
    renderSearchResults();
  }

  async function searchYouTube(query) {
    const params = new URLSearchParams({ part: 'snippet', type: 'video', videoCategoryId: '10', maxResults: '20', q: query, key: state.settings.youtubeKey });
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || 'Errore YouTube API');
    return (data.items || []).map(normalizeTrack).filter(track => track.id);
  }

  async function searchMusicBrainzArtists(query) {
    const response = await fetch(`https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(query)}&fmt=json&limit=12`);
    if (!response.ok) return [];
    const data = await response.json();
    return (data.artists || []).map(item => ({ id: item.id, name: item.name, country: item.country || '', disambiguation: item.disambiguation || '' }));
  }

  async function searchMusicBrainzAlbums(query) {
    const response = await fetch(`https://musicbrainz.org/ws/2/release-group/?query=${encodeURIComponent(query)}&fmt=json&limit=18`);
    if (!response.ok) return [];
    const data = await response.json();
    return (data['release-groups'] || []).map(item => ({
      id: item.id,
      title: item.title,
      artist: item['artist-credit']?.map(a => a.name).join(', ') || 'Artista',
      year: item['first-release-date']?.slice(0,4) || '',
      type: item['primary-type'] || '',
      cover: `https://coverartarchive.org/release-group/${item.id}/front-250`,
    }));
  }

  async function openArtist(id) {
    const artist = currentSearch.artists.find(item => item.id === id) || { id, name: 'Artista' };
    content.innerHTML = `<div class="back-row"><button id="backToSearch">‹ Torna alla ricerca</button></div><section class="artist-hero"><div class="artist-avatar">♫</div><div><h1>${esc(artist.name)}</h1><p>Discografia</p></div></section><div class="track-list"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>`;
    $('#backToSearch').addEventListener('click', renderSearch);
    try {
      const response = await fetch(`https://musicbrainz.org/ws/2/release-group?artist=${encodeURIComponent(id)}&fmt=json&limit=100`);
      const data = await response.json();
      const albums = (data['release-groups'] || []).map(item => ({
        id: item.id,
        title: item.title,
        artist: artist.name,
        year: item['first-release-date']?.slice(0,4) || '',
        type: item['primary-type'] || '',
        cover: `https://coverartarchive.org/release-group/${item.id}/front-250`,
      })).sort((a,b) => String(b.year).localeCompare(String(a.year)));
      content.innerHTML = `<div class="back-row"><button id="backToSearch">‹ Torna alla ricerca</button></div><section class="artist-hero"><div class="artist-avatar">♫</div><div><h1>${esc(artist.name)}</h1><p>${albums.length} pubblicazioni trovate</p></div></section>${albums.length ? `<div class="grid">${albums.map(albumCard).join('')}</div>` : `<div class="empty"><b>Nessuna pubblicazione trovata</b></div>`}`;
      $('#backToSearch').addEventListener('click', renderSearch);
      wireDynamicActions(content);
    } catch {
      content.innerHTML += `<div class="empty"><b>Discografia non disponibile</b>Riprova tra poco.</div>`;
    }
  }

  function searchAlbumOnYouTube(albumId) {
    const album = [...currentSearch.albums, ...state.favoriteAlbums].find(item => item.id === albumId);
    if (!album) return;
    navigate('search');
    searchTab = 'tracks';
    $('#searchInput') && ($('#searchInput').value = `${album.artist} ${album.title}`);
    runSearch(`${album.artist} ${album.title}`);
  }
