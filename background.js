// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openSidePanel' && message.url) {
    if (sender.tab && sender.tab.id) {
      // 1. Open the side panel immediately to preserve user gesture context
      chrome.sidePanel.open({ tabId: sender.tab.id })
        .then(() => {
          // 2. Store the target URL in local storage once sidePanel.open is initiated
          chrome.storage.local.set({ activeArticleUrl: message.url });
        })
        .catch((error) => {
          console.error("Failed to open side panel:", error);
        });
    }
  }
});
