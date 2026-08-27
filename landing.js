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
const heroCaption = document.querySelector('.hero-caption');

window.addEventListener(
  'scroll',
  () => {
    const progress = Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1);
    if (ageMark) {
      ageMark.style.transform = `scale(${1 + progress * 0.12}) translateY(${-progress * 20}px)`;
      ageMark.style.opacity = String(1 - progress * 0.88);
    }
    if (heroCaption) {
      heroCaption.style.opacity = String(1 - progress * 1.5);
    }
  },
  { passive: true }
);

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
    window.location.href = 'Index.html';
  }, 1350);
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

  video.addEventListener('play', () => {
    fallbackLink?.classList.add('visible');
  }, { once: true });
}
