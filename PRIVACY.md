# Privacy Policy

**Last updated: 2026-08-19** — applies to LinkBridge 1.5 and later.

LinkBridge does not collect, transmit, or sell any of your data. There is no server, no
account, and no analytics. Everything you create stays on your device.

The rest of this document explains exactly what that means, and where the boundaries are.

## What LinkBridge stores

Everything LinkBridge saves is data you typed or chose yourself:

- **Your links** — name, URL, and the group each one belongs to
- **Your icons** — images you upload for a link, stored as data URLs
- **Your settings** — selected theme, page title, and whether links open in a new tab

## Where it is stored

- **As a browser extension:** in `chrome.storage.local`, the browser's local storage area
  for the extension. LinkBridge does **not** use `chrome.storage.sync`, so your data is
  never uploaded to a browser vendor's sync servers.
- **As a web app:** in your browser's IndexedDB, under the origin serving the app.
- **In both cases**, LinkBridge also mirrors two values — the current theme and the page
  title — into `localStorage`. This is a paint cache that lets the page render with your
  theme before the main script loads. It is disposable and holds nothing beyond those two
  values.

All three are local browser storage. Nothing is sent anywhere.

## What LinkBridge does not do

- No user accounts, sign-ups, or logins
- No analytics, telemetry, crash reporting, or usage tracking
- No advertising, and no advertising or tracking cookies
- No reading of your browsing history, bookmarks, tabs, or the content of pages you visit
- No sharing, selling, or transferring of data to anyone — there is nobody to share it with

## Permissions

LinkBridge requests exactly one permission: **`storage`**, which is what lets it save your
links and settings on your device. It replaces the new tab page, which is declared through
`chrome_url_overrides` and is not a permission that grants access to any data.

It requests no host permissions, so it cannot read or modify any website you visit.

## Network access

LinkBridge makes no network requests. Fonts, interface icons, and the starter link set are
all bundled inside the extension package and loaded from it.

There is one place where a third-party site is involved, and it is worth stating plainly:
the **"find icon"** link in the link editor opens
[dashboardicons.com](https://dashboardicons.com) in a new tab, passing the link name you
typed as a search term in the URL. This happens only when you click that link, it is an
ordinary browser navigation that you can see, and LinkBridge sends nothing in the
background. Once you are on that site, its own privacy policy applies. If you would rather
not involve it, don't use the link — you can upload an icon file directly instead.

## Export and import

The export features write a JSON or HTML file through your browser's normal download flow.
The file is produced entirely on your device and goes wherever you choose to save it.
LinkBridge does not upload it, and has no copy of it. What happens to that file afterwards
is up to you.

Importing reads a file you select and writes its contents into local storage. Nothing
leaves your device.

## Deleting your data

Uninstalling the extension removes its local storage, and with it everything LinkBridge
saved. For the web app, clearing site data for the origin has the same effect. You can also
delete individual links and groups from within the app at any time.

Since no data ever leaves your device, there is nothing to request, download, or delete
anywhere else.

## Children

LinkBridge is a bookmark dashboard that collects no personal data from anyone, of any age.

## Changes to this policy

This file lives in the LinkBridge source repository alongside the code it describes, so any
change to it is visible in the project's public history. If the policy ever changes
materially, the date at the top of this document changes with it.

## Contact

Questions about this policy: [Juanjo Navarro](https://www.juanjonavarro.com), or open an
issue at [github.com/juanjonavarro/linkbridge](https://github.com/juanjonavarro/linkbridge/issues).
