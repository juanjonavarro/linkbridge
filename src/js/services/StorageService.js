export function StorageService() {
    const native = detectNativeStorage();

    let idb = null;
    const getIdb = () => (idb ??= createIdbStorage("linkbridge", "kv"));

    return { set, get, remove, setBootCache };

    // Synchronous mirror of a couple of values for public/boot.js, which runs before
    // this bundle exists and cannot wait for an async read. Write-only from here and
    // disposable by design: localStorage is site data and the user can wipe it without
    // touching the real storage above. Never read it back as a source of truth.
    // Pass a null value to drop a key. Keys are also spelled out in public/boot.js.
    function setBootCache(key, value) {
        try {
            if (value == null) {
                localStorage.removeItem(`linkbridge:${key}`);
            } else {
                localStorage.setItem(`linkbridge:${key}`, value);
            }
        } catch (e) {
            // Private mode, blocked site data or quota: the cache is optional.
        }
    }

    function set(keys, callback) {
        const p = native ? native.set(keys) : getIdb().set(keys);
        return withCallback(p, callback);
    }

    function get(keys, callback) {
        const p = native ? native.get(keys) : getIdb().get(keys);
        return withCallback(p, callback);
    }

    function remove(keys, callback) {
        const p = native ? native.remove(keys) : getIdb().remove(keys);
        return withCallback(p, callback);
    }

    function withCallback(promise, callback) {
        if (typeof callback === "function") {
            promise.then((res) => callback(res)).catch((err) => callback(undefined, err));
            return;
        }
        return promise;
    }
}

function detectNativeStorage() {
    if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.local &&
        typeof chrome.storage.local.get === "function"
    ) {
        return {
            set: (keys) =>
                new Promise((resolve, reject) => {
                    chrome.storage.local.set(keys, () => {
                        const err = chrome.runtime?.lastError;
                        if (err) return reject(err);
                        resolve();
                    });
                }),
            get: (keys) =>
                new Promise((resolve, reject) => {
                    chrome.storage.local.get(keys, (res) => {
                        const err = chrome.runtime?.lastError;
                        if (err) return reject(err);
                        resolve(res);
                    });
                }),
            remove: (keys) =>
                new Promise((resolve, reject) => {
                    chrome.storage.local.remove(keys, () => {
                        const err = chrome.runtime?.lastError;
                        if (err) return reject(err);
                        resolve();
                    });
                }),
        };
    }

    return null;
}

/* -------------------- IndexedDB fallback (web normal) -------------------- */

function createIdbStorage(dbName, storeName) {
    const DB_VERSION = 1;

    function openDb() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(dbName, DB_VERSION);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    function reqToPromise(req) {
        return new Promise((resolve, reject) => {
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function tx(mode, fn) {
        const db = await openDb();
        try {
            const t = db.transaction(storeName, mode);
            const store = t.objectStore(storeName);
            const result = await fn(store);

            await new Promise((resolve, reject) => {
                t.oncomplete = () => resolve();
                t.onerror = () => reject(t.error);
                t.onabort = () => reject(t.error);
            });

            return result;
        } finally {
            db.close();
        }
    }

    function normalizeKeysArg(keys) {
        if (keys == null) return { type: "all" };

        if (typeof keys === "string") return { type: "list", list: [keys] };
        if (Array.isArray(keys)) return { type: "list", list: keys.slice() };
        if (typeof keys === "object") return { type: "defaults", defaults: { ...keys } };

        return { type: "list", list: [String(keys)] };
    }

    async function get(keys) {
        const nk = normalizeKeysArg(keys);

        return tx("readonly", async (store) => {
            if (nk.type === "all") {
                // getAllKeys + get por clave (compatible y simple)
                const allKeys = await reqToPromise(store.getAllKeys());
                const out = {};
                for (const k of allKeys) out[k] = await reqToPromise(store.get(k));
                return out;
            }

            if (nk.type === "list") {
                const out = {};
                for (const k of nk.list) out[k] = await reqToPromise(store.get(k));
                return out;
            }

            const out = { ...nk.defaults };
            for (const k of Object.keys(nk.defaults)) {
                const v = await reqToPromise(store.get(k));
                if (v !== undefined) out[k] = v;
            }
            return out;
        });
    }

    async function set(obj) {
        if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
            throw new TypeError("set(keys) expects an object { key: value }");
        }

        return tx("readwrite", async (store) => {
            const entries = Object.entries(obj);
            for (const [k, v] of entries) {
                await reqToPromise(store.put(v, k));
            }
        });
    }

    async function remove(keys) {
        const nk = normalizeKeysArg(keys);

        return tx("readwrite", async (store) => {
            if (nk.type === "all") {
                const allKeys = await reqToPromise(store.getAllKeys());
                for (const k of allKeys) await reqToPromise(store.delete(k));
                return;
            }

            const list =
                nk.type === "list" ? nk.list : Object.keys(nk.defaults);

            for (const k of list) await reqToPromise(store.delete(k));
        });
    }

    return { get, set, remove };
}