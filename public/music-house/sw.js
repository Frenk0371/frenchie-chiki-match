const CACHE = 'music-house-v6';
const SHELL = ['./','./index.html','./styles.css','./auth.css','./app-core.js','./app-search-ui.js','./app-search-api.js','./app-library.js','./app-auth.js','./app-player.js','./manifest.webmanifest','./music-house-192.png'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/music-house/') || event.request.url.includes('googleapis.com') || event.request.url.includes('musicbrainz.org') || event.request.url.includes('youtube.com') || event.request.url.includes('supabase.co') || event.request.url.includes('jsdelivr.net')) return;
  event.respondWith(fetch(event.request).then(response => { const copy=response.clone(); caches.open(CACHE).then(c=>c.put(event.request,copy)); return response; }).catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html'))));
});
