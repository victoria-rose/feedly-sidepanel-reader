// Content script to intercept article clicks on Feedly
document.addEventListener('click', (event) => {
  // 1. Only intercept standard left clicks without modifier keys (Ctrl, Shift, Alt, Meta)
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
    return;
  }

  // 2. Do not intercept interactive elements (buttons, role="button", title actions, or internal links)
  // This ensures "Read Later", "Save to Board", and source metadata actions work natively in Feedly.
  const interactive = event.target.closest('button, [role="button"], [title], a');
  if (interactive) {
    if (interactive.tagName === 'A') {
      if (!interactive.href || !interactive.hostname || interactive.hostname === window.location.hostname) {
        return;
      }
    } else {
      return;
    }
  }

  // 3. Find the closest link anchor
  let link = event.target.closest('a');

  // 4. If not clicking a link directly, check if the clicked element is inside a Feedly article card
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

  // 5. Verify we have a valid link pointing to an external website
  if (link && link.href && link.hostname && link.hostname !== window.location.hostname) {
    // Intercept click and stop Feedly's native SPA router from opening the default preview
    event.preventDefault();
    event.stopPropagation();

    // Try to mark the article as read programmatically by clicking Feedly's native checkmark button
    const entry = event.target.closest('.entry');
    if (entry) {
      const markAsReadBtn = entry.querySelector('[title*="Mark as read" i]');
      if (markAsReadBtn) {
        markAsReadBtn.click();
      }
    }

    // Send the URL to background.js to open in the side panel
    chrome.runtime.sendMessage({
      action: 'openSidePanel',
      url: link.href
    });
  }
}, true); // Capture phase ensures we intercept the click before Feedly's event listeners
