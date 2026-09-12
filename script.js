/* Container pentru scanteile declansate de proximitatea cursorului (vezi
   burst() mai jos) — creat dinamic, la fel ca modalul si bannerul de cookies,
   in loc sa fie marcat in fiecare pagina care incarca acest script. */
const burstLayer = document.createElement("div");
burstLayer.id = "sparkBursts";
burstLayer.className = "spark-bursts";
burstLayer.setAttribute("aria-hidden", "true");
document.body.append(burstLayer);

const panels = document.querySelectorAll("[data-panel]");
const triggers = document.querySelectorAll("[data-trigger]");
const prevPanelButton = document.querySelector(".prev-panel");
const nextPanelButton = document.querySelector(".next-panel");
const panelDots = document.querySelectorAll(".panel-dots button");
const root = document.documentElement;
const liteMotionQuery = window.matchMedia("(max-width: 760px), (pointer: coarse), (prefers-reduced-motion: reduce)");
let activePanel = 0;
let lastBurst = 0;
let burnLevel = 0;
let rafToken = 0;
let pointerX = window.innerWidth / 2;
let pointerY = window.innerHeight / 2;
let scrollRatio = 0;
let maxScroll = 1;
let resizeToken = 0;
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

function goToPanel(index, { instant = false } = {}) {
  const targetIndex = Math.max(0, Math.min(panels.length - 1, index));
  const behavior = instant ? "auto" : "smooth";
  const targetTrigger = document.querySelector(`[data-trigger="${targetIndex}"]`);
  /* Intre 761 si 880px, CSS trece deja pe layout stivuit (.scroll-triggers e
     display:none), dar JS-ul de mai jos tot ar incerca sa deruleze spre
     trigger — offsetParent e null pentru un element display:none, deci cadem
     pe panoul insusi, care chiar e randat in acel interval. */
  if (targetTrigger && targetTrigger.offsetParent !== null) {
    targetTrigger.scrollIntoView({ behavior, block: "center" });
  } else {
    document.querySelector(`[data-panel="${targetIndex}"]`)?.scrollIntoView({ behavior, block: "start" });
  }
  setPanel(targetIndex);
}

/* Un link partajat catre #website-uri (sau orice alt id de panou) trebuie sa
   deschida direct panoul respectiv, nu sa ramana pe hero: fara asta, scrollul
   nativ al browserului nu are efect (panourile sunt pozitionate absolut,
   indexul activ e controlat exclusiv de setPanel/goToPanel).
   Pe paginile statice (portofoliu.html), scrollul nativ catre un #id tinteste
   corect elementul, dar imaginile lazy de mai jos pe pagina ii schimba
   inaltimea dupa ce s-a incheiat saritura initiala — de-asta repetam scrollul
   explicit, inclusiv dupa evenimentul load. */
function activatePanelFromHash() {
  const target = document.getElementById(window.location.hash.slice(1));
  if (!target) return;
  if (target.dataset.panel !== undefined) {
    goToPanel(Number(target.dataset.panel), { instant: true });
    return;
  }
  target.scrollIntoView({ behavior: "auto", block: "start" });
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
   activ sau inactiv), cu atat focul se intensifica: lava urca (in shader,
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

/* document.body.scrollHeight forteaza un layout sincron daca stilul e
   invalidat; il citim doar la incarcare/resize, nu la fiecare scroll. */
function updateMaxScroll() {
  maxScroll = Math.max(1, document.body.scrollHeight - window.innerHeight);
}

function scheduleMaxScrollUpdate() {
  if (resizeToken) return;
  resizeToken = window.requestAnimationFrame(() => {
    resizeToken = 0;
    updateMaxScroll();
  });
}

function handleScroll() {
  scrollRatio = window.scrollY / maxScroll;
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
window.addEventListener("resize", scheduleMaxScrollUpdate, { passive: true });

setPanel(0);
updateMaxScroll();
handleScroll();
scheduleVisualState();
activatePanelFromHash();
window.addEventListener("load", activatePanelFromHash);
if (window.location.hash) {
  /* Pe unele combinatii browser/OS, saritura nativa la #id se reaplica
     singura dupa load (cand imaginile de mai jos isi schimba inaltimea
     rezervata), suprascriind scrollul corect impus mai sus — de-asta mai
     impunem o data pozitia corecta, cu putin timp dupa. */
  window.setTimeout(activatePanelFromHash, 350);
}

if (!isLiteMotion) {
  updateDwellBurn();
  window.setInterval(updateDwellBurn, 3000);
}

/* === WhatsApp — sursa centralizata a numarului si a mesajelor precompletate ===
   Un singur loc de adevar pentru numar si texte, ca sa nu se dubleze prin
   fisier. Fiecare link WhatsApp din pagina are deja un href static valid in
   HTML (pentru cazul in care JavaScript e dezactivat); aici doar il aducem
   la zi cu mesajul precompletat corect, per context — data-whatsapp-cta
   poarta o cheie ("default", "social", "website", "urgent") care alege
   mesajul din WHATSAPP_MESSAGES; lipsa valorii cade pe "default".
   ============================================================================ */
const WHATSAPP_NUMBER = "40722882473";
const WHATSAPP_MESSAGES = {
  default: "Bună! Am văzut BrandForge și aș vrea să vorbim despre brandul meu.",
  social: "Bună! Am văzut prețurile BrandForge și aș vrea mai multe detalii despre social media management.",
  website: "Bună! Am văzut portofoliul de site-uri BrandForge și aș vrea o ofertă pentru un site nou.",
  urgent: "Bună! Am nevoie de un site nou urgent — este posibilă livrarea în 24h?",
};

function buildWhatsAppUrl(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

document.querySelectorAll("[data-whatsapp-cta]").forEach((link) => {
  const message = WHATSAPP_MESSAGES[link.dataset.whatsappCta] || WHATSAPP_MESSAGES.default;
  link.href = buildWhatsAppUrl(message);
});

/* === Banner de consimtamant cookies ============================================
   Site-ul nu incarca in prezent analytics sau marketing (vezi cookies.html),
   dar bannerul cere si retine alegerea din timp. Alegerea e stocata sub cheia
   COOKIE_CONSENT_KEY in localStorage — singura tehnologie de stocare folosita
   de site, strict necesara pentru functionarea bannerului insusi.
   ============================================================================ */
const COOKIE_CONSENT_KEY = "bf-cookie-consent";
const COOKIE_CONSENT_VERSION = 1;
const COOKIE_CATEGORIES = ["preferences", "analytics", "marketing"];

function readCookieConsent() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(COOKIE_CONSENT_KEY));
    return parsed?.version === COOKIE_CONSENT_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

function writeCookieConsent(choice) {
  const record = { version: COOKIE_CONSENT_VERSION, necessary: true, updatedAt: new Date().toISOString() };
  COOKIE_CATEGORIES.forEach((category) => { record[category] = Boolean(choice[category]); });
  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(record));
  } catch {
    /* localStorage indisponibil (mod privat etc.) — bannerul va fi reafisat la urmatoarea vizita */
  }
  window.bfCookieConsent = record;
  document.dispatchEvent(new CustomEvent("bf-cookie-consent-changed", { detail: record }));
  return record;
}

const cookieBanner = document.createElement("div");
cookieBanner.className = "cookie-banner";
cookieBanner.id = "cookieBanner";
cookieBanner.setAttribute("role", "region");
cookieBanner.setAttribute("aria-live", "polite");
cookieBanner.setAttribute("aria-labelledby", "cookieBannerTitle");
cookieBanner.hidden = true;
cookieBanner.innerHTML = `
  <div class="cookie-banner-card">
    <p class="cookie-banner-title" id="cookieBannerTitle">Folosim cookies?</p>
    <p class="cookie-banner-text">brandforge.digital funcționează în prezent fără cookies neesențiale. Alegerea ta de aici e reținută pentru cazul în care vom adăuga vreodată analytics sau marketing — o poți schimba oricând din butonul „🍪 Cookie-uri”. <a href="./cookies.html">Detalii</a>.</p>
    <div class="cookie-banner-actions">
      <button type="button" class="btn btn-glass" data-cookie-action="reject">Refuză opționale</button>
      <button type="button" class="btn btn-glass" data-cookie-action="customize">Personalizează</button>
      <button type="button" class="btn btn-molten" data-cookie-action="accept">Acceptă tot</button>
    </div>
  </div>`;

const cookiePreferencesModal = document.createElement("div");
cookiePreferencesModal.className = "modal-overlay cookie-modal";
cookiePreferencesModal.id = "cookiePreferencesModal";
cookiePreferencesModal.hidden = true;
cookiePreferencesModal.innerHTML = `
  <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="cookiePrefsTitle">
    <button class="modal-close" type="button" data-cookie-prefs-close aria-label="Închide fereastra">✕</button>
    <p class="kicker">Setări cookie-uri</p>
    <h2 id="cookiePrefsTitle">Personalizează opțiunile</h2>
    <p>Activezi sau dezactivezi fiecare categorie. Strict necesarele nu pot fi oprite — rețin doar alegerea ta de aici.</p>
    <ul class="cookie-categories">
      <li class="cookie-category">
        <div><strong>Strict necesare</strong><span>Rețin alegerea ta de consimțământ. Mereu active.</span></div>
        <input type="checkbox" checked disabled aria-label="Strict necesare — mereu active">
      </li>
      <li class="cookie-category">
        <div><strong>Preferințe</strong><span>Opțiuni de afișare sau limbă, dacă vor exista.</span></div>
        <input type="checkbox" data-cookie-category="preferences" aria-label="Preferințe">
      </li>
      <li class="cookie-category">
        <div><strong>Analytics</strong><span>Statistici de trafic, dacă vor fi adăugate.</span></div>
        <input type="checkbox" data-cookie-category="analytics" aria-label="Analytics">
      </li>
      <li class="cookie-category">
        <div><strong>Marketing</strong><span>Publicitate direcționată, dacă va fi adăugată.</span></div>
        <input type="checkbox" data-cookie-category="marketing" aria-label="Marketing">
      </li>
    </ul>
    <div class="modal-actions">
      <button type="button" class="btn btn-glass" data-cookie-action="reject">Refuză opționale</button>
      <button type="button" class="btn btn-molten" data-cookie-action="save">Salvează preferințele</button>
    </div>
  </div>`;

const cookieSettingsButton = document.createElement("button");
cookieSettingsButton.type = "button";
cookieSettingsButton.className = "cookie-settings-fab";
cookieSettingsButton.setAttribute("aria-haspopup", "dialog");
cookieSettingsButton.setAttribute("aria-label", "Setări cookie-uri");
cookieSettingsButton.hidden = true;
cookieSettingsButton.textContent = "🍪 Cookie-uri";

document.body.append(cookieBanner, cookiePreferencesModal, cookieSettingsButton);

const cookieCategoryInputs = cookiePreferencesModal.querySelectorAll("[data-cookie-category]");

function syncCookiePreferenceInputs(record) {
  cookieCategoryInputs.forEach((input) => {
    input.checked = Boolean(record?.[input.dataset.cookieCategory]);
  });
}

function applyCookieConsentState(record) {
  cookieBanner.hidden = true;
  cookieSettingsButton.hidden = false;
  syncCookiePreferenceInputs(record);
}

function getCookiePreferencesFocusable() {
  return Array.from(cookiePreferencesModal.querySelectorAll("button, input:not(:disabled)"));
}

function openCookiePreferences() {
  syncCookiePreferenceInputs(window.bfCookieConsent || readCookieConsent() || {});
  cookiePreferencesModal.hidden = false;
  document.addEventListener("keydown", handleCookiePreferencesKeydown);
  cookiePreferencesModal.querySelector(".modal-close")?.focus();
}

function closeCookiePreferences() {
  cookiePreferencesModal.hidden = true;
  document.removeEventListener("keydown", handleCookiePreferencesKeydown);
}

function handleCookiePreferencesKeydown(event) {
  if (event.key === "Escape") {
    closeCookiePreferences();
    return;
  }
  if (event.key !== "Tab") return;

  const focusable = getCookiePreferencesFocusable();
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

const existingCookieConsent = readCookieConsent();
if (existingCookieConsent) {
  window.bfCookieConsent = existingCookieConsent;
  applyCookieConsentState(existingCookieConsent);
} else {
  cookieBanner.hidden = false;
}

cookieBanner.addEventListener("click", (event) => {
  const action = event.target.closest("[data-cookie-action]")?.dataset.cookieAction;
  if (action === "accept") {
    applyCookieConsentState(writeCookieConsent({ preferences: true, analytics: true, marketing: true }));
  } else if (action === "reject") {
    applyCookieConsentState(writeCookieConsent({ preferences: false, analytics: false, marketing: false }));
  } else if (action === "customize") {
    openCookiePreferences();
  }
});

cookiePreferencesModal.addEventListener("click", (event) => {
  if (event.target === cookiePreferencesModal) {
    closeCookiePreferences();
    return;
  }
  const action = event.target.closest("[data-cookie-action]")?.dataset.cookieAction;
  if (action === "save") {
    const choice = {};
    cookieCategoryInputs.forEach((input) => { choice[input.dataset.cookieCategory] = input.checked; });
    applyCookieConsentState(writeCookieConsent(choice));
    closeCookiePreferences();
  } else if (action === "reject") {
    applyCookieConsentState(writeCookieConsent({ preferences: false, analytics: false, marketing: false }));
    closeCookiePreferences();
  }
});

cookiePreferencesModal.querySelectorAll("[data-cookie-prefs-close]").forEach((el) => {
  el.addEventListener("click", closeCookiePreferences);
});

cookieSettingsButton.addEventListener("click", openCookiePreferences);
