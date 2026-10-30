// neoECCO offline copy. Upload next to index.html.
// Online: always fetches the latest page (and keeps a copy). Offline or very slow network: serves the copy.
// Notes themselves are never stored here; they live in the browser's storage and in Google Drive.
const CACHE = 'neoecco-v1';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './index.html'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return; // Google sign-in and Drive go straight to the network
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = () => cache.match(req, { ignoreSearch: true }).then(m => m || cache.match('./index.html'));
    // no-cache: ask GitHub whether the page changed, so a refresh right after an upload shows the new version
    const net = fetch(new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' })).then(res => { if (res.ok) cache.put(req, res.clone()); return res; });
    net.catch(() => {});
    try {
      return await Promise.race([net, new Promise((_, reject) => setTimeout(() => reject(new Error('slow')), 5000))]);
    } catch (err) {
      const m = await cached();
      return m || net; // nothing saved yet: keep waiting for the network
    }
  })());
});
