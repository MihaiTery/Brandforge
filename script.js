const panels = document.querySelectorAll("[data-panel]");
const triggers = document.querySelectorAll("[data-trigger]");
const prevPanelButton = document.querySelector(".prev-panel");
const nextPanelButton = document.querySelector(".next-panel");
const panelDots = document.querySelectorAll(".panel-dots button");
const root = document.documentElement;
const burstLayer = document.querySelector("#sparkBursts");
const liteMotionQuery = window.matchMedia("(max-width: 760px), (pointer: coarse), (prefers-reduced-motion: reduce)");
let activePanel = 0;
let lastBurst = 0;
let burnLevel = 0;
let rafToken = 0;
let pointerX = window.innerWidth / 2;
let pointerY = window.innerHeight / 2;
let scrollRatio = 0;
const pageLoadTime = performance.now();
const dwellRampDuration = 90000;
const maxBurnLevel = 6;
const isLiteMotion = liteMotionQuery.matches;

if (isLiteMotion) document.body.classList.add("lite-motion");

function setPanel(index) {
  activePanel = Number(index);
  panels.forEach((panel) => {
    const panelIndex = Number(panel.dataset.panel);
    panel.classList.toggle("is-active", panelIndex === activePanel);
    panel.classList.toggle("is-past", panelIndex < activePanel);
  });
  prevPanelButton?.classList.toggle("is-disabled", activePanel === 0);
  nextPanelButton?.classList.toggle("is-disabled", activePanel === panels.length - 1);
  panelDots.forEach((dot) => {
    dot.classList.toggle("is-active", Number(dot.dataset.panelLink) === activePanel);
  });
}

function goToPanel(index) {
  const targetIndex = Math.max(0, Math.min(panels.length - 1, index));
  const targetTrigger = document.querySelector(`[data-trigger="${targetIndex}"]`);
  if (targetTrigger && window.matchMedia("(min-width: 761px)").matches) {
    targetTrigger.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  setPanel(targetIndex);
}

function applyBurnLevel(level) {
  burnLevel = Math.max(0, Math.min(maxBurnLevel, level));
  root.style.setProperty("--burn", burnLevel);
  document.body.classList.toggle("burn-active", burnLevel > 0);

  for (let i = 0; i <= maxBurnLevel; i += 1) {
    document.body.classList.toggle(`burn-level-${i}`, i === burnLevel);
  }
}

/* Cu cat vizitatorul petrece mai mult timp pe pagina (indiferent daca e
   activ sau inactiv), cu atat forja se intensifica: lava urca (in shader,
   vezi u_dwell in forge-scene.js) si panourile capata treptat patina arsa.
   Se opreste la un nivel moderat dupa dwellRampDuration, ca sa ramana
   lizibil oricat de mult sta cineva pe site. */
function updateDwellBurn() {
  const elapsed = performance.now() - pageLoadTime;
  const progress = Math.min(1, elapsed / dwellRampDuration);
  root.style.setProperty("--dwell", progress.toFixed(3));
  applyBurnLevel(Math.round(progress * maxBurnLevel));
}

function burst(x, y) {
  if (isLiteMotion || !burstLayer || performance.now() - lastBurst < 420) return;
  lastBurst = performance.now();

  for (let i = 0; i < 10; i += 1) {
    const particle = document.createElement("span");
    particle.className = "burst";
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.setProperty("--dx", `${Math.cos(i) * (18 + Math.random() * 26)}px`);
    particle.style.setProperty("--dy", `${Math.sin(i * 1.7) * (18 + Math.random() * 26)}px`);
    burstLayer.append(particle);
    window.setTimeout(() => particle.remove(), 700);
  }
}

function flushVisualState() {
  rafToken = 0;
  root.style.setProperty("--mx", (pointerX / window.innerWidth).toFixed(3));
  root.style.setProperty("--my", (pointerY / window.innerHeight).toFixed(3));
  root.style.setProperty("--scroll", scrollRatio.toFixed(3));
  root.style.setProperty("--scroll-px", `${window.scrollY}px`);

  if (isLiteMotion) {
    root.style.setProperty("--energy", Math.min(.58, .28 + scrollRatio * .22).toFixed(3));
    return;
  }

  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight * .44;
  const distance = Math.hypot(pointerX - centerX, pointerY - centerY);
  const proximity = Math.max(0, 1 - distance / Math.min(window.innerWidth, window.innerHeight));
  root.style.setProperty("--energy", Math.max(proximity, Math.min(.9, .32 + scrollRatio * .55)).toFixed(3));
  if (distance < Math.min(window.innerWidth, window.innerHeight) * .22) {
    burst((pointerX + centerX) / 2, (pointerY + centerY) / 2);
  }
}

function scheduleVisualState() {
  if (rafToken) return;
  rafToken = window.requestAnimationFrame(flushVisualState);
}

function handlePointerMove(event) {
  pointerX = event.clientX;
  pointerY = event.clientY;
  scheduleVisualState();
}

function handleScroll() {
  const max = Math.max(1, document.body.scrollHeight - window.innerHeight);
  scrollRatio = window.scrollY / max;
  scheduleVisualState();
}

triggers.forEach((trigger) => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) setPanel(trigger.dataset.trigger);
    });
  }, { threshold: 0.58 });
  observer.observe(trigger);
});

document.querySelectorAll("[data-panel-link]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    goToPanel(Number(link.dataset.panelLink));
  });
});

prevPanelButton?.addEventListener("click", () => {
  goToPanel(activePanel - 1);
});

nextPanelButton?.addEventListener("click", () => {
  goToPanel(activePanel + 1);
});

if (!isLiteMotion) window.addEventListener("pointermove", handlePointerMove, { passive: true });
window.addEventListener("scroll", handleScroll, { passive: true });

setPanel(0);
handleScroll();
scheduleVisualState();

if (!isLiteMotion) {
  updateDwellBurn();
  window.setInterval(updateDwellBurn, 3000);
}

/* === WhatsApp — sursa centralizata a numarului si a mesajelor precompletate ===
   Un singur loc de adevar pentru numar si texte, ca sa nu se dubleze prin
   fisier. Fiecare link WhatsApp din pagina are deja un href static valid in
   HTML (pentru cazul in care JavaScript e dezactivat); aici doar il aducem
   la zi cu mesajul precompletat corect, per context.
   ============================================================================ */
const WHATSAPP_NUMBER = "40722882473";
const WHATSAPP_DEFAULT_MESSAGE = "Bună! Am văzut BrandForge și aș dori mai multe informații despre crearea unui reel.";
const WHATSAPP_REELFORGE_MESSAGE = "Bună! Am văzut BrandForge. Aș dori mai multe informații despre ReelForge și despre comenzile personalizate.";

function buildWhatsAppUrl(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

document.querySelectorAll("[data-whatsapp-cta]").forEach((link) => {
  link.href = buildWhatsAppUrl(WHATSAPP_DEFAULT_MESSAGE);
});

/* === Modal "ReelForge — în pregătire" =========================================
   ReelForge nu este contactat in aceasta etapa: nu exista fetch, health-check
   sau redirect catre Vercel. Fiecare CTA [data-reelforge-cta] deschide direct
   acest modal static. Injectat o singura data, reutilizat de toate paginile
   care includ acest script (homepage, 404).
   ============================================================================ */
function buildReelForgeModal() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "reelForgeModal";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="reelForgeModalTitle" aria-describedby="reelForgeModalDesc">
      <button class="modal-close" type="button" data-modal-close aria-label="Închide fereastra">✕</button>
      <p class="kicker">ReelForge — în pregătire</p>
      <h2 id="reelForgeModalTitle">ReelForge este în curs de pregătire</h2>
      <p id="reelForgeModalDesc">Platforma de creare a reelurilor nu este disponibilă momentan. Lucrăm la conectarea sistemului de generare și randare, astfel încât experiența să fie stabilă și completă.</p>
      <p class="modal-secondary">Până la lansare, ne poți contacta direct pe WhatsApp pentru exemple, colaborări sau comenzi personalizate.</p>
      <div class="modal-actions">
        <a class="btn btn-molten" href="${buildWhatsAppUrl(WHATSAPP_REELFORGE_MESSAGE)}" target="_blank" rel="noopener noreferrer" data-modal-close>Contactează-ne pe WhatsApp</a>
        <button class="btn btn-glass" type="button" data-modal-close>Am înțeles</button>
      </div>
    </div>`;
  return overlay;
}

const reelForgeModal = buildReelForgeModal();
document.body.append(reelForgeModal);

const reelForgeCtas = document.querySelectorAll("[data-reelforge-cta]");
let reelForgeModalLastFocus = null;

function getReelForgeModalFocusable() {
  return Array.from(reelForgeModal.querySelectorAll("button, a[href]"));
}

function openReelForgeModal(trigger) {
  reelForgeModalLastFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;
  reelForgeModal.hidden = false;
  document.addEventListener("keydown", handleReelForgeModalKeydown);
  reelForgeModal.querySelector(".modal-close")?.focus();
}

function closeReelForgeModal() {
  reelForgeModal.hidden = true;
  document.removeEventListener("keydown", handleReelForgeModalKeydown);
  if (reelForgeModalLastFocus instanceof HTMLElement) reelForgeModalLastFocus.focus();
}

function handleReelForgeModalKeydown(event) {
  if (event.key === "Escape") {
    closeReelForgeModal();
    return;
  }
  if (event.key !== "Tab") return;

  const focusable = getReelForgeModalFocusable();
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

reelForgeCtas.forEach((cta) => {
  cta.setAttribute("aria-haspopup", "dialog");
  cta.addEventListener("click", (event) => {
    event.preventDefault();
    openReelForgeModal(event.currentTarget);
  });
});

reelForgeModal.addEventListener("click", (event) => {
  if (event.target === reelForgeModal) closeReelForgeModal();
});

reelForgeModal.querySelectorAll("[data-modal-close]").forEach((el) => {
  el.addEventListener("click", closeReelForgeModal);
});
