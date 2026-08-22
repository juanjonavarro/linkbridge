// Registers the service worker that keeps the web app working offline
//
// This file only exists in the PWA build (see the pwa/ directory and vite.config.js):
// the extension never ships it, and could not use it anyway, because extension pages
// are not allowed to register service workers.
//
// A failed registration is not an error worth shouting about: the app works online
// either way, offline support is the bonus.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        var RELOAD_GUARD = 'linkbridge:sw-reloaded';
        var alreadyReloaded = false;
        try {
            alreadyReloaded = sessionStorage.getItem(RELOAD_GUARD) === 'true';
            sessionStorage.removeItem(RELOAD_GUARD);
        } catch (e) {
            // Private mode or blocked site data: worst case the page reloads twice.
        }

        // A page that was never controlled is not an update, it is the first install
        // claiming it. Nothing changed underneath and there is nothing to reload.
        var hadController = !!navigator.serviceWorker.controller;
        var pending = false;
        var reloading = false;

        // Never reload under an open dialog or the config panel: activate deletes the
        // previous cache, and the lazy image-resize chunk this page may still ask for goes
        // with it. Waiting is free — the page keeps working with what it already loaded,
        // and the new version lands the moment the dialog closes.
        function busy() {
            var app = document.getElementById('app');
            return !!document.querySelector('dialog[open]')
                || !!(app && app.classList.contains('config-mode'));
        }

        function reloadWhenSafe() {
            if (!pending || reloading || alreadyReloaded || busy()) return;
            reloading = true;
            try {
                sessionStorage.setItem(RELOAD_GUARD, 'true');
            } catch (e) {
                // See above: the guard is optional, the reload is not.
            }
            window.location.reload();
        }

        navigator.serviceWorker.addEventListener('controllerchange', function () {
            if (!hadController) return;
            pending = true;
            reloadWhenSafe();
        });

        // The retry: a dialog closing or the config panel folding away is what makes the
        // reload safe, and neither of them fires an event of its own.
        new MutationObserver(reloadWhenSafe).observe(document.body, {
            attributes: true,
            childList: true,
            subtree: true,
            attributeFilter: ['class', 'open']
        });

        // updateViaCache: 'none' keeps the HTTP cache from ever answering for sw.js. An
        // installation pinned to an old worker cannot be rescued from here, so this one is
        // not a nicety.
        navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
            .then(function (registration) {
                return registration.update();
            })
            .catch(function () {});

        // Android resumes an installed app without ever firing load again, so for a phone
        // this is often the only update check that will ever run.
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState !== 'visible') return;
            navigator.serviceWorker.getRegistration()
                .then(function (registration) {
                    if (registration) registration.update();
                })
                .catch(function () {});
        });
    });
}
