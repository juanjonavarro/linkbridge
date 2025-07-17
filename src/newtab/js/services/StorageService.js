export function StorageService() {
    
    return {
        set, get, remove
    }

    async function set(keys, callback) {
        chrome.storage.local.set(keys, callback);
    }

    async function get(keys, callback) {
        chrome.storage.local.get(keys, callback);
    }

    async function remove(keys, callback) {
        chrome.storage.local.remove(keys, callback);
    }
}