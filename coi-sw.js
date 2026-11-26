/*
 * PharmAI (version web) : isolation « cross-origin » sur un hébergement sans en-têtes réglables
 * (GitHub Pages). La base SQLite du navigateur (expo-sqlite, WebAssembly) a besoin de
 * SharedArrayBuffer, qui n'est disponible qu'avec les en-têtes COOP/COEP. Ce fichier sert à la fois :
 *  - de script de page : il installe le service worker puis recharge la page une fois ;
 *  - de service worker : il ajoute les deux en-têtes à chaque réponse.
 */
/* eslint-disable no-restricted-globals */
if (typeof window === 'undefined') {
  // Safari ne connaît pas « credentialless » : « require-corp » à la place
  const ua = self.navigator.userAgent;
  const safari = /Safari\//.test(ua) && !/Chrome\/|Chromium\/|Edg\//.test(ua);
  const coep = safari ? 'require-corp' : 'credentialless';

  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
  self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return;
    // Ressources d'autres sites : laissées telles quelles (le navigateur applique ses règles)
    if (new URL(request.url).origin !== self.location.origin) return;
    event.respondWith(
      fetch(request).then((response) => {
        if (response.status === 0) return response;
        const headers = new Headers(response.headers);
        headers.set('Cross-Origin-Embedder-Policy', coep);
        headers.set('Cross-Origin-Opener-Policy', 'same-origin');
        headers.set('Cross-Origin-Resource-Policy', 'same-origin');
        return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
      }),
    );
  });
} else if (!window.crossOriginIsolated && 'serviceWorker' in navigator) {
  const script = document.currentScript && document.currentScript.src;
  navigator.serviceWorker.register(script).then(
    (registration) => {
      // Un seul rechargement automatique, pour éviter une boucle si le navigateur refuse l'isolation
      if (sessionStorage.getItem('pharmai-coi-reload')) return;
      const reload = () => {
        sessionStorage.setItem('pharmai-coi-reload', '1');
        window.location.reload();
      };
      if (registration.active && !navigator.serviceWorker.controller) reload();
      else navigator.serviceWorker.addEventListener('controllerchange', reload);
    },
    (err) => console.warn('PharmAI : service worker non installé', err),
  );
}
