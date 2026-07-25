# Feedly Sidepanel Reader

A Manifest V3 browser extension (compatible with Google Chrome and Microsoft Edge) that intercepts article click events in Feedly and displays the corresponding direct website URL inside the browser's native **Side Panel**.

This extension replaces Feedly's slide-over RSS preview drawer with the actual live website rendered in the sidebar, providing a seamless reading experience without leaving your feed.

---

## Features

- **Automatic Interception**: Captures left-clicks on Feedly card containers, titles, or images in the capture phase, preventing the default Feedly route.
- **Dynamic Side Panel Integration**: Seamlessly opens and updates the native browser Side Panel on click.
- **Frame Restriction Bypass**: Utilizes the `declarativeNetRequest` API to dynamically strip `X-Frame-Options`, `Frame-Options`, and `Content-Security-Policy` framing rules, enabling you to load websites (like Wikipedia, GitHub, and major blogs) that typically block being embedded in iframes.
- **Cinematic Dark UI**: Elegant side panel interface built with responsive dark styling, subtle floating micro-animations, and modern typography (`Plus Jakarta Sans`).
- **Loading State Interpolation**: Automatically fades in the iframe once it's fully loaded, eliminating harsh white flashes.
- **Control Bar**:
  - **Open Ext ↗**: Opens the current article in a new foreground tab.
  - **Reload ↻**: Reloads the current iframe source.

---

## Installation

1. Clone or download this repository to your local machine.
2. Open your browser and navigate to the extensions settings page:
   - **Chrome**: `chrome://extensions`
   - **Edge**: `edge://extensions`
3. Enable the **Developer mode** toggle in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select the `feedly_sidepanel_reader` folder.

---

## Usage

1. Go to [Feedly](https://feedly.com) and log in.
2. Change your feed view layout to **Cards** view.
3. Left-click any article card (image, title, or container).
4. The side panel will open on the right, loading the direct webpage of the article.

---

## Security Trade-off Note

The extension uses Chrome's `declarativeNetRequest` API to strip frame-preventing headers on all `sub_frame` requests. Because static declarative rules cannot be scoped to a specific tab's side panel at runtime, this header stripping applies globally to all sub-frames loaded in the browser. For personal developer use, this is a standard and acceptable trade-off, but it should be noted.
