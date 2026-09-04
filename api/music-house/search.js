const json = (res, status, body) => {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
  res.end(JSON.stringify(body));
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Metodo non consentito' });
  }

  const query = String(req.query?.q || '').trim().slice(0, 140);
  if (!query) return json(res, 400, { error: 'Ricerca mancante' });

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return json(res, 503, {
      code: 'SEARCH_NOT_CONFIGURED',
      error: 'Ricerca musicale non ancora configurata',
    });
  }

  try {
    const params = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      videoCategoryId: '10',
      videoEmbeddable: 'true',
      maxResults: '20',
      regionCode: 'IT',
      relevanceLanguage: 'it',
      safeSearch: 'moderate',
      q: query,
      key: apiKey,
    });

    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    const data = await response.json();

    if (!response.ok) {
      const reason = data?.error?.errors?.[0]?.reason || 'youtube_error';
      console.error('Music House YouTube search failed:', reason);
      return json(res, response.status >= 500 ? 502 : 400, {
        code: 'YOUTUBE_SEARCH_ERROR',
        error: 'Ricerca YouTube non disponibile',
      });
    }

    const tracks = (data.items || [])
      .map((item) => ({
        id: item.id?.videoId || '',
        title: item.snippet?.title || 'Brano',
        artist: item.snippet?.channelTitle || 'YouTube',
        thumb:
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url ||
          '',
      }))
      .filter((track) => track.id);

    return json(res, 200, { tracks });
  } catch (error) {
    console.error('Music House search exception:', error);
    return json(res, 502, {
      code: 'SEARCH_UPSTREAM_ERROR',
      error: 'Servizio di ricerca temporaneamente non disponibile',
    });
  }
}
