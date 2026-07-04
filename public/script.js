const fieldSets = {
  brand: [
    ["Nume firma", "text", true],
    ["Character obligatoriu", "file", true],
    ["Logo optional", "file", false],
    ["Nisa business", "text", true],
    ["Titlu reel", "text", true],
    ["CTA vocal", "file", true],
    ["Email", "email", true]
  ],
  serviciu: [
    ["Nume firma", "text", true],
    ["Character obligatoriu", "file", true],
    ["Logo optional", "file", false],
    ["Explicatie scurta serviciu", "text", true],
    ["Titlu reel", "text", true],
    ["CTA vocal", "file", true],
    ["Email", "email", true]
  ],
  produs: [
    ["Nume firma", "text", true],
    ["Character obligatoriu", "file", true],
    ["Logo optional", "file", false],
    ["Poza produs", "file", true],
    ["Nume produs", "text", true],
    ["Titlu reel", "text", true],
    ["CTA vocal", "file", true],
    ["Email", "email", true]
  ],
  creator: [
    ["Nume creator", "text", true],
    ["Character obligatoriu", "file", true],
    ["Stil vizual", "select", true],
    ["Titlu reel", "text", true],
    ["CTA vocal", "file", true],
    ["Email", "email", true]
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
  if (label.includes("CTA")) return "Audio scurt, 3-5 secunde";
  if (label.includes("Logo")) return "PNG/SVG, optional";
  if (label.includes("Poza")) return "Imagine produs";
  return "Imagine character/produs";
}

function createField(label, inputType, required) {
  const id = fieldId(label);
  const wrapper = document.createElement("div");
  wrapper.className = inputType === "file" ? "field drop-field" : "field";
  if (inputType === "text" && label.length > 18) wrapper.classList.add("field-full");

  const labelEl = document.createElement("label");
  labelEl.htmlFor = id;
  labelEl.textContent = `${label}${required ? " *" : ""}`;

  if (inputType === "file") {
    const input = document.createElement("input");
    input.id = id;
    input.name = id;
    input.type = "file";
    input.required = required;

    const visual = document.createElement("label");
    visual.className = "drop-zone";
    visual.htmlFor = id;
    visual.innerHTML = `
      <span class="drop-icon">+</span>
      <span><strong>${label}</strong><small>${uploadHint(label)}</small></span>
    `;

    input.addEventListener("change", () => {
      wrapper.classList.toggle("selected", input.files.length > 0);
      visual.querySelector("strong").textContent = input.files[0]?.name || label;
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
  } else {
    input = document.createElement("input");
    input.type = inputType;
    input.placeholder = label;
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

document.querySelectorAll("input[name='type']").forEach((radio) => {
  radio.addEventListener("change", (event) => renderFields(event.target.value, true));
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const state = form.querySelector(".mock-state");
  state.textContent = form.checkValidity()
    ? "Mock Phase 1: consola arata valida vizual. Plata si generarea vin in Phase 2."
    : "Completeaza campurile marcate cu * pentru preview-ul de validare.";
});

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

renderFields("brand");
setPanel(0);
resetInactivity();
