const IMAGE_ENTRIES = [
  { name: 'Image 1', file: 'assets/image-1.jpeg' },
  { name: 'Image 2', file: 'assets/image-2.png' },
  { name: 'Image 3', file: 'assets/image-3.png' },
  { name: 'Image 4', file: 'assets/image-4.png' },
  { name: 'Image 5', file: 'assets/image-5.jpeg' },
  { name: 'Image 6', file: 'assets/image-6.jpeg' },
  { name: 'Image 7', file: 'assets/image-7.jpeg' },
  { name: 'Image 8', file: 'assets/image-8.jpeg' },
  { name: 'Image 9', file: 'assets/image-9.jpeg' },
  { name: 'Image 10', file: 'assets/image-10.jpeg' },
  { name: 'Image 11', file: 'assets/image-11.jpeg' },
  { name: 'Image 12', file: 'assets/image-12.jpeg' }
];

const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const triggerButton = document.getElementById('triggerButton');
const spinAgainButton = document.getElementById('spinAgainButton');
const imageCount = document.getElementById('imageCount');
const currentResult = document.getElementById('currentResult');
const winnerModal = document.getElementById('winnerModal');
const winnerImage = document.getElementById('winnerImage');
const winnerName = document.getElementById('winnerName');
const confettiCanvas = document.getElementById('confettiCanvas');
const confettiCtx = confettiCanvas.getContext('2d');

const size = canvas.width;
const center = size / 2;
const radius = 380;
const imageRadius = 118;
const colors = ['#f7c7d9', '#d7cef8', '#cbe8ff', '#d6f2df', '#ffe9b9', '#f6d0ff'];

let entries = [];
let rotation = 0;
let isSpinning = false;
let audioContext = null;
let confettiPieces = [];
let confettiFrame = null;

function resizeConfettiCanvas() {
  confettiCanvas.width = window.innerWidth * window.devicePixelRatio;
  confettiCanvas.height = window.innerHeight * window.devicePixelRatio;
  confettiCtx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
}

window.addEventListener('resize', resizeConfettiCanvas);
resizeConfettiCanvas();

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function init() {
  entries = await Promise.all(
    IMAGE_ENTRIES.map(async (entry) => ({ ...entry, image: await loadImage(entry.file) }))
  );
  imageCount.textContent = String(entries.length);
  drawWheel(rotation);
}

function drawWheel(angle) {
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(center, center);
  ctx.rotate(angle);

  const slice = (Math.PI * 2) / entries.length;

  for (let i = 0; i < entries.length; i++) {
    const start = -Math.PI / 2 + i * slice;
    const end = start + slice;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    const mid = start + slice / 2;
    const px = Math.cos(mid) * 218;
    const py = Math.sin(mid) * 218;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(mid + Math.PI / 2);

    ctx.beginPath();
    ctx.roundRect(-imageRadius / 2, -imageRadius / 2, imageRadius, imageRadius, 20);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.clip();

    ctx.drawImage(entries[i].image, -imageRadius / 2, -imageRadius / 2, imageRadius, imageRadius);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(0, 0, radius + 10, 0, Math.PI * 2);
  ctx.lineWidth = 18;
  ctx.strokeStyle = '#18223a';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.fillStyle = '#18223a';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.restore();
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function getWinnerIndex(finalRotation) {
  const slice = (Math.PI * 2) / entries.length;
  const normalized = ((-Math.PI / 2 - finalRotation) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  return Math.floor(normalized / slice) % entries.length;
}

function spinWheel() {
  if (isSpinning || !entries.length) return;
  isSpinning = true;
  triggerButton.classList.add('pulling');
  currentResult.textContent = 'Spinning...';
  hideWinner();

  const winnerIndex = Math.floor(Math.random() * entries.length);
  const slice = (Math.PI * 2) / entries.length;
  const targetAngle = 5 * Math.PI * 2 + (Math.PI / 2) - (winnerIndex * slice + slice / 2);
  const startRotation = rotation;
  const finalRotation = startRotation + targetAngle;
  const startTime = performance.now();
  const duration = 5200;

  const tickAudio = startTicking();

  function animate(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    rotation = startRotation + (finalRotation - startRotation) * easeOutCubic(t);
    drawWheel(rotation);

    if (tickAudio) {
      const rate = 14 - 11 * t;
      tickAudio.playbackRate = Math.max(0.85, rate / 10);
    }

    if (t < 1) {
      requestAnimationFrame(animate);
      return;
    }

    if (tickAudio) tickAudio.stop();
    isSpinning = false;
    triggerButton.classList.remove('pulling');
    const actualWinnerIndex = getWinnerIndex(rotation);
    showWinner(entries[actualWinnerIndex]);
  }

  requestAnimationFrame(animate);
}

function showWinner(entry) {
  currentResult.textContent = entry.name;
  winnerImage.src = entry.file;
  winnerImage.alt = entry.name;
  winnerName.textContent = entry.name;
  winnerModal.classList.remove('hidden');
  winnerModal.setAttribute('aria-hidden', 'false');
  burstConfetti();
  playCelebration();
}

function hideWinner() {
  winnerModal.classList.add('hidden');
  winnerModal.setAttribute('aria-hidden', 'true');
}

function ensureAudioContext() {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioCtx();
  }
  if (audioContext.state === 'suspended') audioContext.resume();
}

function startTicking() {
  ensureAudioContext();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'square';
  oscillator.frequency.value = 8;
  gain.gain.value = 0.015;
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  return {
    set playbackRate(value) {
      oscillator.frequency.setValueAtTime(value * 6, audioContext.currentTime);
    },
    stop() {
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.06);
      oscillator.stop(audioContext.currentTime + 0.07);
    }
  };
}

function playTone(freq, start, duration, type = 'sine', volume = 0.08) {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(audioContext.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function playCelebration() {
  ensureAudioContext();
  const now = audioContext.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
  notes.forEach((note, i) => playTone(note, now + i * 0.16, 0.24, 'triangle', 0.07));
  playTone(261.63, now, 1.2, 'sine', 0.03);
}

function burstConfetti() {
  confettiPieces = Array.from({ length: 180 }, () => ({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    vx: (Math.random() - 0.5) * 12,
    vy: Math.random() * -10 - 6,
    size: Math.random() * 7 + 4,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    color: colors[Math.floor(Math.random() * colors.length)],
    alpha: 1
  }));

  cancelAnimationFrame(confettiFrame);
  const gravity = 0.22;

  function animate() {
    confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    confettiPieces.forEach(piece => {
      piece.vy += gravity;
      piece.x += piece.vx;
      piece.y += piece.vy;
      piece.rot += piece.vr;
      piece.alpha -= 0.008;

      confettiCtx.save();
      confettiCtx.globalAlpha = Math.max(piece.alpha, 0);
      confettiCtx.translate(piece.x, piece.y);
      confettiCtx.rotate(piece.rot);
      confettiCtx.fillStyle = piece.color;
      confettiCtx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.7);
      confettiCtx.restore();
    });

    confettiPieces = confettiPieces.filter(piece => piece.alpha > 0 && piece.y < window.innerHeight + 40);

    if (confettiPieces.length) {
      confettiFrame = requestAnimationFrame(animate);
    } else {
      confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  animate();
}

triggerButton.addEventListener('click', spinWheel);
spinAgainButton.addEventListener('click', () => {
  hideWinner();
  spinWheel();
});
winnerModal.addEventListener('click', (event) => {
  if (event.target === winnerModal) hideWinner();
});

init().catch((error) => {
  console.error(error);
  currentResult.textContent = 'Could not load images';
});
