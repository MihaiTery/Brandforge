const fieldSets = {
  brand: [
    ["Nume firma / brand", "text", true],
    ["Descriere Business", "text", true],
    ["Titlu reel", "text", true],
    ["Email pentru livrare", "email", true],
    ["Incarca imagine personaj / imagine reprezentativa", "file:image", true],
    ["Logo optional", "file:logo", false],
    ["CTA text", "text", true, "full-span"],
    ["Incarca CTA vocal de 3-5 secunde", "file:audio", true, "full-span"]
  ],
  serviciu: [
    ["Nume firma", "text", true],
    ["Titlu reel", "text", true],
    ["Explicatie scurta serviciu", "textarea", true, "full-span"],
    ["Email pentru livrare", "email", true, "full-span"],
    ["Incarca imagine personaj / imagine reprezentativa", "file:image", true],
    ["Logo optional", "file:logo", false],
    ["CTA text", "text", true, "full-span"],
    ["Incarca CTA vocal de 3-5 secunde", "file:audio", true, "full-span"]
  ],
  produs: [
    ["Nume firma", "text", true],
    ["Nume produs", "text", true],
    ["Titlu reel", "text", true],
    ["Email pentru livrare", "email", true],
    ["Incarca imagine personaj / imagine reprezentativa", "file:image", true],
    ["Incarca poza produs", "file:image", true],
    ["Logo optional", "file:logo", false],
    ["CTA text", "text", true],
    ["Incarca CTA vocal de 3-5 secunde", "file:audio", true]
  ],
  creator: [
    ["Nume creator / nume cont", "text", true],
    ["Stil vizual", "select", true],
    ["Titlu reel", "text", true],
    ["Email pentru livrare", "email", true],
    ["Incarca imagine personaj / imagine reprezentativa", "file:image", true],
    ["CTA text", "text", true],
    ["Incarca CTA vocal de 3-5 secunde", "file:audio", true]
  ]
};

const creatorStyles = ["cinematic realist", "educativ", "abstract", "luxury", "comic", "documentar"];
const dynamicFields = document.querySelector("#dynamicFields");
const form = document.querySelector(".forge-form");
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

function fieldId(label) {
  return label.toLowerCase().replaceAll(" ", "-").replace(/[^a-z0-9-]/g, "");
}

function uploadHint(label) {
  if (label.includes("CTA")) return "Accepta: .mp3, .wav, .m4a";
  if (label.includes("Logo")) return "Accepta: .jpg, .jpeg, .png, .svg, .webp";
  return "Accepta: .jpg, .jpeg, .png, .webp";
}

function uploadTitle(label) {
  if (label.includes("CTA")) return "Incarca CTA vocal";
  if (label.includes("Logo")) return "Incarca logo";
  if (label.includes("poza produs")) return "Incarca poza produs";
  return "Incarca imagine";
}

function fileAccept(inputType) {
  if (inputType === "file:audio") return ".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/x-m4a,audio/mp4";
  if (inputType === "file:logo") return ".jpg,.jpeg,.png,.svg,.webp,image/jpeg,image/png,image/svg+xml,image/webp";
  return ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
}
function createField(label, inputType, required, layoutClass = "") {
  const id = fieldId(label);
  const wrapper = document.createElement("div");
  const isFile = inputType.startsWith("file");
  wrapper.className = isFile ? "field drop-field" : "field";
  if (layoutClass) wrapper.classList.add(layoutClass);

  const labelEl = document.createElement("label");
  labelEl.htmlFor = id;
  labelEl.textContent = `${label}${required ? " *" : ""}`;

  if (isFile) {
    const input = document.createElement("input");
    input.id = id;
    input.name = id;
    input.type = "file";
    input.accept = fileAccept(inputType);
    input.required = required;

    const visual = document.createElement("label");
    visual.className = "drop-zone";
    visual.htmlFor = id;
    visual.innerHTML = `
      <span class="drop-icon">+</span>
      <span><strong>${uploadTitle(label)}</strong><small>${uploadHint(label)}</small></span>
    `;

    input.addEventListener("change", () => {
      wrapper.classList.toggle("selected", input.files.length > 0);
      visual.querySelector("strong").textContent = input.files[0]?.name || uploadTitle(label);
    });

    wrapper.append(labelEl, input, visual);
    return wrapper;
  }

  let input;
  if (inputType === "select") {
    input = document.createElement("select");
    creatorStyles.forEach((style) => {
      const option = document.createElement("option");
      option.value = style;
      option.textContent = style;
      input.append(option);
    });
  } else if (inputType === "textarea") {
    input = document.createElement("textarea");
    input.rows = 3;
    input.setAttribute("aria-label", label);
  } else {
    input = document.createElement("input");
    input.type = inputType;
    input.setAttribute("aria-label", label);
  }

  input.id = id;
  input.name = id;
  input.required = required;
  wrapper.append(labelEl, input);
  return wrapper;
}

function renderFields(type, animated = false) {
  const fields = fieldSets[type].map((field) => createField(...field));
  if (!animated) {
    dynamicFields.replaceChildren(...fields);
    return;
  }

  dynamicFields.classList.add("switching");
  window.setTimeout(() => {
    dynamicFields.replaceChildren(...fields);
    dynamicFields.classList.remove("switching");
  }, 180);
}

/* Local Pages of Alexandria test integration.
   Keeps the restored ReelForge form intact and only adapts its current values
   into the local Pages API payload. No payment and no image API call happen here. */
const PAGES_API_BASE = "http://127.0.0.1:8765";
const pagesPreview = document.querySelector("[data-pages-preview]");
const projectStatusPreview = document.querySelector("[data-project-status]");
const promptPreview = document.querySelector("[data-prompt-preview]");
const jsonlPreview = document.querySelector("[data-jsonl-preview]");

const pagesFieldIds = {
  brand: {
    company_name: "nume-firma--brand",
    business_niche_explanation: "descriere-business",
    reel_title: "titlu-reel",
    character: "incarca-imagine-personaj--imagine-reprezentativa",
    logo: "logo-optional",
    cta: "cta-text",
    cta_audio: "incarca-cta-vocal-de-3-5-secunde"
  },
  serviciu: {
    company_name: "nume-firma",
    short_service_explanation: "explicatie-scurta-serviciu",
    reel_title: "titlu-reel",
    character: "incarca-imagine-personaj--imagine-reprezentativa",
    logo: "logo-optional",
    cta: "cta-text",
    cta_audio: "incarca-cta-vocal-de-3-5-secunde"
  },
  produs: {
    company_name: "nume-firma",
    product_name: "nume-produs",
    reel_title: "titlu-reel",
    character: "incarca-imagine-personaj--imagine-reprezentativa",
    product: "incarca-poza-produs",
    logo: "logo-optional",
    cta: "cta-text",
    cta_audio: "incarca-cta-vocal-de-3-5-secunde"
  },
  creator: {
    creator_name: "nume-creator--nume-cont",
    style_notes: "stil-vizual",
    reel_title: "titlu-reel",
    character: "incarca-imagine-personaj--imagine-reprezentativa",
    cta: "cta-text",
    cta_audio: "incarca-cta-vocal-de-3-5-secunde"
  }
};

function currentReelType() {
  return form?.querySelector("input[name='type']:checked")?.value || "brand";
}

function pagesReelType(type) {
  return {
    brand: "brand",
    serviciu: "service",
    produs: "product",
    creator: "creator"
  }[type] || "brand";
}

function currentField(id) {
  return id ? document.getElementById(id) : null;
}

function currentValue(type, key) {
  return currentField(pagesFieldIds[type]?.[key])?.value?.trim() || "";
}

function currentFile(type, key) {
  return currentField(pagesFieldIds[type]?.[key])?.files?.[0] || null;
}

function makePagesOrderId(type) {
  const base = currentValue(type, "company_name") || currentValue(type, "creator_name") || "brandforge";
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36) || "brandforge";
  return `${pagesReelType(type)}-${slug}-${Date.now().toString(36)}`;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error || new Error("Fisierul nu a putut fi citit.")));
    reader.readAsDataURL(file);
  });
}

function assertRasterImage(file, label) {
  if (!file) throw new Error(`${label} este obligatorie pentru exportul local Pages.`);
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
    throw new Error(`${label} trebuie sa fie PNG, JPG sau WEBP pentru testul local Pages.`);
  }
}

async function buildPagesPayloadFromForm() {
  const type = currentReelType();
  const reelType = pagesReelType(type);
  const ctaAudio = currentFile(type, "cta_audio");
  const ctaText = currentValue(type, "cta");
  const character = currentFile(type, "character");
  const logo = currentFile(type, "logo");
  const assets = {};

  assertRasterImage(character, "Imaginea personajului");
  assets.character = await fileToDataUrl(character);
  if (logo) {
    assertRasterImage(logo, "Logo-ul");
    assets.logo = await fileToDataUrl(logo);
  }
  if (reelType === "product") {
    const product = currentFile(type, "product");
    assertRasterImage(product, "Poza produsului");
    assets.product = await fileToDataUrl(product);
  }

  const payload = {
    order_id: makePagesOrderId(type),
    reel_type: reelType,
    reel_title: currentValue(type, "reel_title"),
    cta: ctaText,
    assets
  };
  if (ctaAudio) {
    payload.cta_audio_filename = ctaAudio.name;
  }

  if (reelType === "creator") {
    payload.creator_name = currentValue(type, "creator_name");
    payload.style_notes = currentValue(type, "style_notes");
  } else {
    payload.company_name = currentValue(type, "company_name");
  }
  if (reelType === "brand") {
    payload.business_niche_explanation = currentValue(type, "business_niche_explanation");
  }
  if (reelType === "service") {
    payload.short_service_explanation = currentValue(type, "short_service_explanation");
  }
  if (reelType === "product") {
    payload.product_name = currentValue(type, "product_name");
  }
  return payload;
}

async function pagesRequest(path, options = {}) {
  const response = await fetch(`${PAGES_API_BASE}${path}`, options);
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    throw new Error((body && body.error) || body || `Pages API error ${response.status}`);
  }
  return body;
}

function showPagesPreview(status, prompt, jsonl) {
  if (!pagesPreview) return;
  pagesPreview.hidden = false;
  if (projectStatusPreview) projectStatusPreview.textContent = JSON.stringify(status, null, 2);
  if (promptPreview) promptPreview.textContent = prompt;
  if (jsonlPreview) jsonlPreview.textContent = jsonl;
}

function setLocalSubmitState(isBusy) {
  const button = form?.querySelector(".form-submit");
  if (!button) return;
  button.disabled = isBusy;
  button.textContent = isBusy ? "Forjăm local..." : "Forjează reel-ul — 1€";
}

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

if (form && dynamicFields) {
  document.querySelectorAll("input[name='type']").forEach((radio) => {
    radio.addEventListener("change", (event) => {
      renderFields(event.target.value, true);
      if (pagesPreview) pagesPreview.hidden = true;
      const state = form.querySelector(".form-state");
      if (state) state.textContent = "";
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const state = form.querySelector(".form-state");
    if (!form.checkValidity()) {
      form.reportValidity();
      if (state) state.textContent = "Completeaza campurile marcate cu * pentru tipul de reel ales.";
      return;
    }

    try {
      setLocalSubmitState(true);
      if (state) state.textContent = "Mod local: trimitem brief-ul catre Pages of Alexandria. Nu se proceseaza plata si nu se consuma credite API.";
      if (pagesPreview) pagesPreview.hidden = true;

      const payload = await buildPagesPayloadFromForm();
      const created = await pagesRequest("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const orderId = created.order_id || payload.order_id;
      const [status, prompt, jsonl] = await Promise.all([
        pagesRequest(`/api/projects/${encodeURIComponent(orderId)}`),
        pagesRequest(`/api/projects/${encodeURIComponent(orderId)}/prompt`),
        pagesRequest(`/api/projects/${encodeURIComponent(orderId)}/jsonl`)
      ]);

      showPagesPreview(status, prompt, jsonl);
      if (state) state.textContent = `Export local generat pentru ${orderId}. Promptul si JSONL-ul sunt afisate mai jos.`;
    } catch (error) {
      if (state) state.textContent = `Eroare local Pages: ${error.message}`;
    } finally {
      setLocalSubmitState(false);
    }
  });
}

prevPanelButton?.addEventListener("click", () => {
  goToPanel(activePanel - 1);
});

nextPanelButton?.addEventListener("click", () => {
  goToPanel(activePanel + 1);
});

const metricObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const target = entry.target;
    const end = Number(target.dataset.count);
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / 1200, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      target.textContent = Math.floor(end * eased).toLocaleString("ro-RO");
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
    metricObserver.unobserve(target);
  });
}, { threshold: 0.45 });

document.querySelectorAll("[data-count]").forEach((metric) => metricObserver.observe(metric));

if (!isLiteMotion) window.addEventListener("pointermove", handlePointerMove, { passive: true });
window.addEventListener("scroll", handleScroll, { passive: true });

if (form && dynamicFields) renderFields("brand");
setPanel(0);
handleScroll();
scheduleVisualState();

if (!isLiteMotion) {
  updateDwellBurn();
  window.setInterval(updateDwellBurn, 3000);
}

