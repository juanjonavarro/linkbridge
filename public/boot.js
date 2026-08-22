// Runs while the document is still parsing, before the first paint, so the page never
// paints untethemed. It must be a separate file: the default MV3 content security
// policy blocks inline scripts in extension pages.

window.LINKBRIDGE_SURFACE =
    location.protocol === 'chrome-extension:' ||
    location.protocol === 'moz-extension:' ||
    location.protocol === 'safari-web-extension:'
        ? 'extension'
        : 'web';

// This is a CACHE, never a source of truth. StorageService owns the real values
// (chrome.storage in the extension, IndexedDB in the web app) and overwrites whatever
// this sets a few milliseconds later. If the keys are missing, stale or unreadable,
// the only consequence is the theme flash we had before.
//
// What the cache holds is the CLASS LIST the app will end up producing, not the stored
// configuration. That is why the style is in there even though ConfigService derives it
// from APP_CONFIG.THEMES and never stores it: the point is for this first paint to match
// the final one, including any meaning the style class may gain later (see B-11).
//
// The class names below are duplicated from ConfigService.changeTheme(), and the keys
// from StorageService.setBootCache(). Keep them in sync.
try {
    var cachedTheme = (localStorage.getItem('linkbridge:theme-cached') || '').split(' ');
    var theme = cachedTheme[0];
    var style = cachedTheme[1];

    if (theme) {
        document.body.classList.add('theme-' + theme);
        if (style) {
            document.body.classList.add('theme-style-' + style);
        }
    }

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
        meta.content = 'rgb(' + getComputedStyle(document.body).getPropertyValue('--background-color').trim() + ')';
    }

    var title = localStorage.getItem('linkbridge:title-cached');
    if (title) {
        document.title = title;
    }
} catch (e) {
    // Private mode, blocked site data, quota: the defaults in the HTML stand.
}
