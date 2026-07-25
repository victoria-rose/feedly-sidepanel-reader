// Content script to intercept article clicks on Feedly
document.addEventListener('click', (event) => {
  // 1. Only intercept standard left clicks without modifier keys (Ctrl, Shift, Alt, Meta)
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
    return;
  }

  // 2. Find the closest link anchor
  let link = event.target.closest('a');

  // 3. If not clicking a link directly, check if the clicked element is inside a Feedly article card
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
