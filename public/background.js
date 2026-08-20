// tabs.create needs no permission — only reading other tabs' URLs would — so the
// manifest still asks for `storage` and nothing else.
chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
});
