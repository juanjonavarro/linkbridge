export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export function formatUrl(url) {
    return String(url ?? '').replace(/^(https?:\/\/)/, '');
}

export function esc(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function safeUrl(url) {
    const value = String(url ?? '').trim();
    return /^https?:\/\//i.test(value) ? value : '#';
}

export function safeIconData(data) {
    const value = String(data ?? '');
    return /^data:image\//i.test(value) ? value : '';
}