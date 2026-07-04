const fieldSets = {
  brand: [
    ["Nume firma / brand", "text", true],
    ["Descriere Business", "text", true],
    ["Titlu reel", "text", true],
    ["Email pentru livrare", "email", true],
    ["Incarca imagine personaj / imagine reprezentativa", "file:image", true],
    ["Logo optional", "file:logo", false],
    ["Incarca CTA vocal de 3-5 secunde", "file:audio", true, "full-span"]
  ],
  serviciu: [
    ["Nume firma", "text", true],
    ["Titlu reel", "text", true],
    ["Explicatie scurta serviciu", "textarea", true, "full-span"],
    ["Email pentru livrare", "email", true, "full-span"],
    ["Incarca imagine personaj / imagine reprezentativa", "file:image", true],
    ["Logo optional", "file:logo", false],
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
    ["Incarca CTA vocal de 3-5 secunde", "file:audio", true]
  ],
  creator: [
    ["Nume creator / nume cont", "text", true],
    ["Stil vizual", "select", true],
    ["Titlu reel", "text", true],
    ["Email pentru livrare", "email", true],
    ["Incarca imagine personaj / imagine reprezentativa", "file:image", true],
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
const root = document.documentElement;
const burstLayer = document.querySelector("#sparkBursts");
let activePanel = 0;
let lastBurst = 0;
let inactivityTimer;
let burnTimer;
let burnLevel = 0;
const burnStartDelay = 43000;
const burnStepDelay = 5000;
const maxBurnLevel = 6;

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

function setPanel(index) {
  activePanel = Number(index);
  panels.forEach((panel) => {
    const panelIndex = Number(panel.dataset.panel);
    panel.classList.toggle("is-active", panelIndex === activePanel);
    panel.classList.toggle("is-past", panelIndex < activePanel);
  });
  prevPanelButton?.classList.toggle("is-disabled", activePanel === 0);
  nextPanelButton?.classList.toggle("is-disabled", activePanel === panels.length - 1);
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

function beginBurn() {
  applyBurnLevel(1);
  window.clearInterval(burnTimer);
  burnTimer = window.setInterval(() => {
    applyBurnLevel(burnLevel + 1);
    if (burnLevel >= maxBurnLevel) window.clearInterval(burnTimer);
  }, burnStepDelay);
}

function resetInactivity() {
  window.clearTimeout(inactivityTimer);
  window.clearInterval(burnTimer);
  applyBurnLevel(0);
  inactivityTimer = window.setTimeout(beginBurn, burnStartDelay);
}

function burst(x, y) {
  if (!burstLayer || performance.now() - lastBurst < 420) return;
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

function updateEnergy(event) {
  const x = event?.clientX ?? window.innerWidth / 2;
  const y = event?.clientY ?? window.innerHeight / 2;
  root.style.setProperty("--mx", (x / window.innerWidth).toFixed(3));
  root.style.setProperty("--my", (y / window.innerHeight).toFixed(3));

  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight * .44;
  const distance = Math.hypot(x - centerX, y - centerY);
  const proximity = Math.max(0, 1 - distance / Math.min(window.innerWidth, window.innerHeight));
  root.style.setProperty("--energy", proximity.toFixed(3));
  if (distance < Math.min(window.innerWidth, window.innerHeight) * .22) burst((x + centerX) / 2, (y + centerY) / 2);
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
    resetInactivity();
    goToPanel(Number(link.dataset.panelLink));
  });
});

if (form && dynamicFields) {
  document.querySelectorAll("input[name='type']").forEach((radio) => {
    radio.addEventListener("change", (event) => renderFields(event.target.value, true));
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const state = form.querySelector(".form-state");
    if (state) {
      state.textContent = form.checkValidity()
        ? "Am primit detaliile pentru reel. Reel-ul final va fi livrat pe email."
        : "Completeaza campurile marcate cu * pentru tipul de reel ales.";
    }
  });
}

prevPanelButton?.addEventListener("click", () => {
  resetInactivity();
  goToPanel(activePanel - 1);
});

nextPanelButton?.addEventListener("click", () => {
  resetInactivity();
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

window.addEventListener("pointermove", updateEnergy, { passive: true });
window.addEventListener("scroll", () => {
  const max = Math.max(1, document.body.scrollHeight - window.innerHeight);
  const scroll = window.scrollY / max;
  root.style.setProperty("--scroll", scroll.toFixed(3));
  root.style.setProperty("--scroll-px", `${window.scrollY}px`);
  root.style.setProperty("--energy", Math.min(.9, .32 + scroll * .55).toFixed(3));
}, { passive: true });

["pointerdown", "keydown", "touchstart", "wheel"].forEach((eventName) => {
  window.addEventListener(eventName, resetInactivity, { passive: true });
});

window.addEventListener("pointermove", resetInactivity, { passive: true });
window.addEventListener("scroll", resetInactivity, { passive: true });

if (form && dynamicFields) renderFields("brand");
setPanel(0);
resetInactivity();




