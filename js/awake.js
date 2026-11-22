// Keeps the screen on during lessons and the tuner (the phone sits on a stand while both hands play).
// The Wake Lock API does it on most browsers. iPhones often ignore it (older iOS, and sites opened
// from a home-screen icon before iOS 18.4), so there a tiny silent looping video (awake.mp4, no
// sound track) keeps the screen awake too. Starting video needs a tap, so every tap re-checks.
let want = false, lock = null, video = null;
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

async function grab() {
  if (!want || document.visibilityState !== 'visible') return;
  if ('wakeLock' in navigator && !lock) {
    try {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    } catch (_) { lock = null; }
    if (!want) { try { if (lock) lock.release(); } catch (_) {} lock = null; return; }   // left the lesson meanwhile
  }
  if (isIOS || !lock) {
    if (!video) {
      video = document.createElement('video');
      video.setAttribute('playsinline', ''); video.setAttribute('webkit-playsinline', '');
      video.muted = true; video.loop = true; video.src = 'awake.mp4';
      video.setAttribute('aria-hidden', 'true');
      video.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;pointer-events:none;';
      document.body.append(video);
    }
    if (video.paused) video.play().catch(() => {});
  }
}
export const awake = {
  on() { want = true; grab(); },
  off() {
    want = false;
    try { if (lock) lock.release(); } catch (_) {}
    lock = null;
    if (video) video.pause();
  },
  get state() { return { want, lock: !!lock, video: !!video && !video.paused }; },
};
document.addEventListener('visibilitychange', grab);
['click', 'touchend'].forEach((e) => document.addEventListener(e, grab, true));
