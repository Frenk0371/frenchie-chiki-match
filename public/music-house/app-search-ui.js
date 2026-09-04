  function renderHome() {
    content.innerHTML = `
      <section class="hero"><h1>La tua <span class="gradient-text">Music House</span>.</h1><p>Brani, artisti, album e playlist in un unico posto.</p></section>
      ${sectionHead('Ascoltati di recente', state.recent.length ? 'Riparti da dove eri rimasto' : '')}
      ${state.recent.length ? `<div class="h-scroll">${state.recent.slice(0, 10).map(track => `<div class="mini-card" data-play-track="${esc(track.id)}"><img src="${esc(track.thumb)}" alt="" /><strong>${esc(track.title)}</strong><small>${esc(track.artist)}</small></div>`).join('')}</div>` : `<div class="empty"><b>Ancora nessun ascolto</b>Cerca una canzone e premi play.</div>`}
      ${sectionHead('Album preferiti', state.favoriteAlbums.length ? `${state.favoriteAlbums.length} salvati` : '')}
      ${state.favoriteAlbums.length ? `<div class="h-scroll">${state.favoriteAlbums.slice(0, 10).map(album => `<div class="mini-card" data-search-album="${esc(album.id)}"><img src="${esc(album.cover)}" alt="" onerror="this.style.display='none'"/><strong>${esc(album.title)}</strong><small>${esc(album.artist)}</small></div>`).join('')}</div>` : `<div class="empty"><b>Nessun album salvato</b>Gli album che ami compariranno qui.</div>`}
      ${sectionHead('Le tue playlist', state.playlists.length ? `${state.playlists.length} playlist` : '', `<button class="link-btn" data-nav="playlists">Vedi tutte</button>`)}
      ${state.playlists.length ? `<div class="playlist-list">${state.playlists.slice(0,3).map(playlistTile).join('')}</div>` : `<div class="empty"><b>Crea la prima playlist</b>Raccogli i brani che vuoi ascoltare insieme.</div>`}
    `;
  }

  function renderSearch() {
    const query = esc(currentSearch.query);
    content.innerHTML = `
      <section class="hero"><h1>Cerca</h1><p>Canzoni singole, artisti e album.</p></section>
      <form class="search-box" id="searchForm"><input id="searchInput" value="${query}" placeholder="Canzone, artista o album…" autocomplete="off" /><button>Cerca</button></form>
      <div class="search-tabs">
        <button data-search-tab="tracks" class="${searchTab === 'tracks' ? 'active' : ''}">Brani</button>
        <button data-search-tab="artists" class="${searchTab === 'artists' ? 'active' : ''}">Artisti</button>
        <button data-search-tab="albums" class="${searchTab === 'albums' ? 'active' : ''}">Album</button>
      </div>
      <div id="searchResults"></div>
    `;
    $('#searchForm').addEventListener('submit', event => {
      event.preventDefault();
      const q = $('#searchInput').value.trim();
      if (q) runSearch(q);
    });
    $$('[data-search-tab]').forEach(btn => btn.addEventListener('click', () => { searchTab = btn.dataset.searchTab; renderSearchResults(); }));
    renderSearchResults();
  }

  function renderSearchResults() {
    const host = $('#searchResults');
    if (!host) return;
    $$('[data-search-tab]').forEach(btn => btn.classList.toggle('active', btn.dataset.searchTab === searchTab));
    if (currentSearch.loading) {
      host.innerHTML = `<div class="track-list" style="margin-top:18px"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>`;
      return;
    }
    if (currentSearch.error) {
      host.innerHTML = `<div class="empty" style="margin-top:18px"><b>Ricerca non disponibile</b>${esc(currentSearch.error)}</div>`;
      return;
    }
    if (!currentSearch.query) {
      host.innerHTML = `<div class="empty" style="margin-top:18px"><b>Cosa vuoi ascoltare?</b>Scrivi il titolo di una canzone, il nome di un artista o un album.</div>`;
      return;
    }
    if (searchTab === 'tracks') {
      if (currentSearch.trackError) {
        host.innerHTML = `<div class="empty" style="margin-top:18px"><b>Brani temporaneamente non disponibili</b>${esc(currentSearch.trackError)}</div>`;
        return;
      }
      host.innerHTML = currentSearch.tracks.length ? `${sectionHead('Brani', `${currentSearch.tracks.length} risultati`)}<div class="track-list">${currentSearch.tracks.map(track => trackRow(track, currentSearch.tracks)).join('')}</div>` : `<div class="empty"><b>Nessun brano trovato</b>Prova con un titolo o un artista diverso.</div>`;
    } else if (searchTab === 'artists') {
      host.innerHTML = currentSearch.artists.length ? `${sectionHead('Artisti', `${currentSearch.artists.length} risultati`)}<div class="grid">${currentSearch.artists.map(artistCard).join('')}</div>` : `<div class="empty"><b>Nessun artista trovato</b>Prova con un nome diverso.</div>`;
    } else {
      host.innerHTML = currentSearch.albums.length ? `${sectionHead('Album', `${currentSearch.albums.length} risultati`)}<div class="grid">${currentSearch.albums.map(albumCard).join('')}</div>` : `<div class="empty"><b>Nessun album trovato</b>Prova con un altro titolo.</div>`;
    }
    wireDynamicActions(host);
  }

