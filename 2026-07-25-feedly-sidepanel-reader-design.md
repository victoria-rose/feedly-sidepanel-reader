# Feedly Sidepanel Reader Design Specification

This specification outlines the architecture, file structure, and implementation details for a Manifest V3 browser extension (compatible with Google Chrome and Microsoft Edge) that intercepts article click events in Feedly and displays the corresponding direct website URL inside the native browser Side Panel.

## 1. Overview & Goals

- **Objective:** Improve the Feedly reading experience by replacing Feedly's slide-over RSS preview drawer with the actual article website rendered inside the browser's native Side Panel.
- **Workflow:** 
  1. A user left-clicks an article container or link in Feedly.
  2. The extension intercepts the click, prevents the default Feedly preview, and extracts the article's direct URL.
  3. The extension opens/updates the browser's native Side Panel and loads the direct URL in an iframe.
  4. Security headers (`X-Frame-Options` and `Content-Security-Policy` framing rules) are stripped dynamically from target sites to guarantee they render correctly inside the sidebar iframe.

> **Security trade-off:** The `declarativeNetRequest` rules strip `X-Frame-Options` and `Content-Security-Policy` headers globally for all sub-frame requests in the browser — not just those in the side panel. This is an inherent limitation of static rule files (which cannot be scoped to a specific tab or panel at install time). For a personal-use extension this is an acceptable trade-off, but it should be documented and understood.

---

## 1a. Verified DOM Context (Feedly Cards View)

This extension targets **Feedly cards view only**. The following DOM facts were verified against the live Feedly interface and should be treated as ground truth when implementing `content.js`.

**Article card element:**
```html
<article id="<hash>_main" class="entry cards">
  ...
  <a class="... EntryTitleLink ..." href="https://example.com/article" target="_blank" rel="noopener noreferrer">Title</a>
  <a class="... EntryMetadataSource ..." href="https://feedly.com/i/subscription/...">Source Name</a>
  ...
</article>
```

- Each card is an `<article>` with class `entry cards`. The stable selector is `.entry`.
- There are exactly **two `<a>` tags** per card: the external article link (class includes `EntryTitleLink`) and the internal Feedly source link (hostname is `feedly.com`). The hostname check (`!== window.location.hostname`) reliably distinguishes them.
- The article element has no `data-entryid`, `data-id`, or other data attributes — only `id` (a hash) and `class`.
- The card image area is **not wrapped in an anchor** — clicks on the image area will fall through to the `.entry` fallback path.

**Feedly is a React SPA:**
- The content script's `document` click listener (capture phase) is attached once at page load and covers all dynamically rendered cards — no `MutationObserver` is needed for click interception.
- However, if any future logic needs to query the DOM on startup (not currently needed), it must account for the fact that article cards render asynchronously after `document_end`.

---

## 2. Directory Structure

```text
feedly-sidepanel-reader/
├── manifest.json       # Extension configurations, permissions, content and background scripts
├── rules.json          # Declarative Net Request rules for stripping X-Frame-Options & CSP headers
├── background.js       # Service worker coordinating side panel opening and active article states
├── content.js          # Feedly DOM click interceptor and URL parser
├── sidepanel.html      # Side Panel UI layout containing the iframe container
└── sidepanel.js        # Logic that reads URL storage updates and updates the iframe src
```

---

## 3. Code Implementations

### manifest.json
```json
{
  "manifest_version": 3,
  "name": "Feedly Sidepanel Reader",
  "version": "1.0.0",
  "description": "Opens Feedly article direct links in the native browser sidebar side panel.",
  "permissions": [
    "sidePanel",
    "declarativeNetRequest",
    "storage",
    "tabs"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "declarative_net_request": {
    "rule_resources": [
      {
        "id": "ruleset_1",
        "enabled": true,
        "path": "rules.json"
      }
    ]
  },
  "content_scripts": [
    {
      "matches": [
        "*://feedly.com/*"
      ],
      "js": [
        "content.js"
      ],
      "run_at": "document_end"
    }
  ]
}
```

### rules.json
```json
[
  {
    "id": 1,
    "priority": 1,
    "action": {
      "type": "modifyHeaders",
      "responseHeaders": [
        {
          "header": "X-Frame-Options",
          "operation": "remove"
        },
        {
          "header": "Frame-Options",
          "operation": "remove"
        },
        {
          "header": "Content-Security-Policy",
          "operation": "remove"
        }
      ]
    },
    "condition": {
      "resourceTypes": [
        "sub_frame"
      ]
    }
  }
]
```

### background.js
```javascript
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
```

### content.js
```javascript
// Content script to intercept article clicks on Feedly
document.addEventListener('click', (event) => {
  // 1. Only intercept standard left clicks without modifier keys (Ctrl, Shift, Alt, Meta)
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
    return;
  }

  // 2. Find the closest link anchor
  let link = event.target.closest('a');

  // 3. If not clicking a link directly, check if the clicked element is inside a Feedly article card
  // Note: Feedly cards view uses <article class="entry cards"> — only .entry is needed here.
  if (!link) {
    const entry = event.target.closest('.entry');
    if (entry) {
      // Find any anchor inside this entry pointing to an external website
      const anchors = entry.querySelectorAll('a');
      for (const a of anchors) {
        if (a.href && a.hostname && a.hostname !== window.location.hostname) {
          link = a;
          break;
        }
      }
    }
  }

  // 4. Verify we have a valid link pointing to an external website
  if (link && link.href && link.hostname && link.hostname !== window.location.hostname) {
    // Intercept click and stop Feedly's native SPA router from opening the default preview
    event.preventDefault();
    event.stopPropagation();

    // Send the URL to background.js to open in the side panel
    chrome.runtime.sendMessage({
      action: 'openSidePanel',
      url: link.href
    });
  }
}, true); // Capture phase ensures we intercept the click before Feedly's event listeners
```

### sidepanel.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Feedly Sidepanel Reader</title>
  <style>
    body, html {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f7f7f7;
    }
    .container {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background-color: #ffffff;
      border-bottom: 1px solid #e0e0e0;
      box-sizing: border-box;
      height: 40px;
    }
    .header-title {
      font-size: 13px;
      font-weight: 600;
      color: #333333;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .controls {
      display: flex;
      gap: 8px;
    }
    .btn {
      background: none;
      border: 1px solid #cccccc;
      padding: 4px 8px;
      font-size: 11px;
      border-radius: 4px;
      cursor: pointer;
      color: #555555;
    }
    .btn:hover {
      background-color: #f0f0f0;
      color: #111111;
    }
    iframe {
      flex: 1;
      width: 100%;
      border: none;
      background-color: #ffffff;
    }
    .placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #888888;
      font-size: 14px;
      text-align: center;
      padding: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div id="header-bar" class="header" style="display: none;">
      <span id="title" class="header-title">Reading Article</span>
      <div class="controls">
        <button id="open-out" class="btn" title="Open in new tab">Open Ext ↗</button>
        <button id="reload" class="btn" title="Reload article">Reload ↻</button>
      </div>
    </div>
    <div id="placeholder" class="placeholder">
      <h3>Feedly Sidepanel Reader</h3>
      <p>Click on any article in Feedly to open it here.</p>
    </div>
    <iframe id="article-frame" style="display: none;"></iframe>
  </div>
  <script src="sidepanel.js"></script>
</body>
</html>
```

### sidepanel.js
```javascript
const iframe = document.getElementById('article-frame');
const placeholder = document.getElementById('placeholder');
const headerBar = document.getElementById('header-bar');
const titleSpan = document.getElementById('title');
const openOutBtn = document.getElementById('open-out');
const reloadBtn = document.getElementById('reload');

let currentUrl = '';

// Load URL from local storage on startup
chrome.storage.local.get(['activeArticleUrl'], (result) => {
  if (result.activeArticleUrl) {
    updateIframe(result.activeArticleUrl);
  }
});

// Listen for storage updates
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.activeArticleUrl) {
    updateIframe(changes.activeArticleUrl.newValue);
  }
});

function updateIframe(url) {
  if (!url) return;
  currentUrl = url;
  
  // Hide placeholder, show header and iframe
  placeholder.style.display = 'none';
  headerBar.style.display = 'flex';
  iframe.style.display = 'block';
  
  // Update title display (shortened URL hostname)
  try {
    const parsedUrl = new URL(url);
    titleSpan.textContent = parsedUrl.hostname;
  } catch (e) {
    titleSpan.textContent = 'Reading Article';
  }
  
  // Set iframe source
  iframe.src = url;
}

// Button controls
// Use chrome.tabs.create instead of window.open — avoids popup-blocker interference
// from the side panel context and opens the article in a proper foreground tab.
openOutBtn.addEventListener('click', () => {
  if (currentUrl) {
    chrome.tabs.create({ url: currentUrl });
  }
});

reloadBtn.addEventListener('click', () => {
  if (currentUrl) {
    iframe.src = currentUrl;
  }
});
```
