// Registers the service worker that keeps the web app working offline.
//
// This file only exists in the PWA build (see the pwa/ directory and vite.config.js):
// the extension never ships it, and could not use it anyway, because extension pages
// are not allowed to register service workers.
//
// A failed registration is not an error worth shouting about: the app works online
// either way, offline support is the bonus.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('./sw.js').catch(function () {});
    });
}
