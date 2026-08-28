if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

function resetScroll() {
  window.scrollTo(0, 0);
}

window.addEventListener('pageshow', resetScroll);
window.addEventListener('load', resetScroll);

const reveals = document.querySelectorAll('.reveal');

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18 }
);

reveals.forEach((element) => observer.observe(element));

const ageMark = document.querySelector('.age-mark');

window.addEventListener(
  'scroll',
  () => {
    const progress = Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1);
    if (ageMark) {
      ageMark.style.transform = `scale(${1 + progress * 0.12}) translateY(${-progress * 20}px)`;
      ageMark.style.opacity = String(1 - progress * 0.88);
    }
  },
  { passive: true }
);

// ---------------------------------------------------------------
// Фото: по клику увеличиваем только реальную <img> внутри photo-frame.
// Пока стоят заглушки — ничего не открывается и ошибок нет.
// ---------------------------------------------------------------
const lightboxStyle = document.createElement('style');
lightboxStyle.textContent = `
  .photo-frame:has(img) { cursor: zoom-in; }
  .photo-frame img {
    width: 100%;
    min-height: inherit;
    height: 100%;
    display: block;
    object-fit: cover;
  }
  .photo-lightbox {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: grid;
    place-items: center;
    padding: 3vw;
    background: rgba(0, 0, 0, .94);
    opacity: 0;
    visibility: hidden;
    transition: opacity .2s ease, visibility .2s ease;
    cursor: zoom-out;
  }
  .photo-lightbox.open {
    opacity: 1;
    visibility: visible;
  }
  .photo-lightbox img {
    display: block;
    max-width: 94vw;
    max-height: 92vh;
    width: auto;
    height: auto;
    object-fit: contain;
    box-shadow: 0 30px 100px rgba(0,0,0,.8);
  }
  body.lightbox-open { overflow: hidden; }
`;
document.head.appendChild(lightboxStyle);

const lightbox = document.createElement('div');
lightbox.className = 'photo-lightbox';
lightbox.setAttribute('aria-hidden', 'true');
lightbox.innerHTML = '<img alt="Увеличенная фотография">';
document.body.appendChild(lightbox);

const lightboxImage = lightbox.querySelector('img');

function closeLightbox() {
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('lightbox-open');
  if (lightboxImage) lightboxImage.removeAttribute('src');
}

document.querySelectorAll('[data-lightbox]').forEach((frame) => {
  frame.addEventListener('click', () => {
    const image = frame.querySelector('img');
    if (!image || !image.src || !lightboxImage) return;

    lightboxImage.src = image.currentSrc || image.src;
    lightboxImage.alt = image.alt || 'Увеличенная фотография';
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
  });
});

lightbox.addEventListener('click', closeLightbox);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && lightbox.classList.contains('open')) {
    closeLightbox();
  }
});

const video = document.getElementById('birthday-video');
const videoMissing = document.getElementById('video-missing');
const launchOverlay = document.getElementById('launch-overlay');
const fallbackLink = document.getElementById('fallback-link');

let hasLaunched = false;

function launchGame() {
  if (hasLaunched) return;
  hasLaunched = true;

  launchOverlay?.classList.add('active');
  launchOverlay?.setAttribute('aria-hidden', 'false');

  setTimeout(() => {
    window.location.href = 'game.html';
  }, 900);
}

if (video) {
  video.addEventListener('ended', launchGame);

  video.addEventListener('error', () => {
    video.style.visibility = 'hidden';
    if (videoMissing) videoMissing.style.display = 'grid';
    fallbackLink?.classList.add('visible');
  });

  video.addEventListener('loadedmetadata', () => {
    if (videoMissing) videoMissing.style.display = 'none';
  });

  video.addEventListener(
    'play',
    () => {
      fallbackLink?.classList.add('visible');
    },
    { once: true }
  );
}
