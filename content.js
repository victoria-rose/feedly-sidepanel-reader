// Content script to intercept article clicks on Feedly
const CHECKMARK_PATH = 'M20.215 5.65a.5.5 0 0 1 .77.63l-.057.07-11.786 12a.5.5 0 0 1-.643.06l-.07-.06-5.357-5.454a.5.5 0 0 1 .645-.76l.068.06 5 5.09z';

document.addEventListener('click', (event) => {
  // 1. Only intercept standard left clicks without modifier keys (Ctrl, Shift, Alt, Meta)
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
    return;
  }

  // 2. Do not intercept if clicking the mark-as-read checkmark button directly (identified by SVG path)
  const clickedSvg = event.target.closest('svg');
  if (clickedSvg) {
    const path = clickedSvg.querySelector('path');
    if (path && path.getAttribute('d') === CHECKMARK_PATH) {
      return;
    }
  }

  // Do not intercept interactive elements (buttons, role="button", title actions, or internal links)
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
      // Look for the checkmark button by its path signature
      const paths = entry.querySelectorAll('svg path');
      let markAsReadBtn = null;
      for (const p of paths) {
        if (p.getAttribute('d') === CHECKMARK_PATH) {
          markAsReadBtn = p.closest('button') || p.closest('[role="button"]') || p.closest('svg');
          break;
        }
      }
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
