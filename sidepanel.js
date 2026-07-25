const iframe = document.getElementById('article-frame');
const placeholder = document.getElementById('placeholder');
const headerBar = document.getElementById('header-bar');
const titleSpan = document.getElementById('title');
const openOutBtn = document.getElementById('open-out');
const reloadBtn = document.getElementById('reload');
const aboutBtn = document.getElementById('about-btn');
const aboutLink = document.getElementById('about-link');
const aboutModal = document.getElementById('about-modal');
const closeModalBtn = document.getElementById('close-modal');

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
  
  // Hide the frame initially to prevent rough flash of loading pages
  iframe.classList.remove('loaded');
  
  // Update title display (shortened URL hostname)
  try {
    const parsedUrl = new URL(url);
    titleSpan.textContent = parsedUrl.hostname.replace('www.', '');
  } catch (e) {
    titleSpan.textContent = 'Reading Article';
  }
  
  // Fade in the iframe only after it has fully loaded
  const onFrameLoad = () => {
    iframe.classList.add('loaded');
  };
  
  // Reset load listener
  iframe.removeEventListener('load', onFrameLoad);
  iframe.addEventListener('load', onFrameLoad, { once: true });
  
  // Set iframe source
  iframe.src = url;
}

// Button controls
openOutBtn.addEventListener('click', () => {
  if (currentUrl) {
    chrome.tabs.create({ url: currentUrl });
  }
});

reloadBtn.addEventListener('click', () => {
  if (currentUrl) {
    iframe.classList.remove('loaded');
    iframe.src = currentUrl;
  }
});

// Modal toggle handlers
const openModal = (e) => {
  e.preventDefault();
  aboutModal.classList.add('open');
};

const closeModal = () => {
  aboutModal.classList.remove('open');
};

aboutBtn.addEventListener('click', openModal);
aboutLink.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);

// Close modal when clicking outside the card
aboutModal.addEventListener('click', (e) => {
  if (e.target === aboutModal) {
    closeModal();
  }
});
