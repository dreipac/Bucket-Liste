// ===== Helpers =====
function q(sel, root=document){ return root.querySelector(sel); }
function loadJSON(key){ try{ return JSON.parse(localStorage.getItem(key)); }catch{ return null; } }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function isNum(n){ return typeof n === "number" && !isNaN(n); }
function setCSS(name,val){ document.documentElement.style.setProperty(name, val); }
const uid = () => Math.random().toString(36).slice(2, 10);
const backupBtn    = q("#backupBtn");
const restoreInput = q("#restoreInput");
const ARCHIVE_NAME = "Archiv";

function isArchiveList(list){ return list && list.name === ARCHIVE_NAME; }

function getArchiveList(){
  return state.lists.find(l => l.name === ARCHIVE_NAME) || null;
}
function ensureArchiveList(){
  let a = getArchiveList();
  if (!a){
    a = { id: uid(), name: ARCHIVE_NAME, items: [] };
    state.lists.push(a);
    saveState();
    renderLists(); // neu sichtbar machen
  }
  return a;
}

// === Viewport-Messung & CSS-Variablen (stabiles App-Viewport) ==========
function setViewportVars(){
  // 1vh Bug auf Mobile umgehen:
  const vh = window.innerHeight * 0.01;
  setCSS('--vh', vh + 'px');
  setCSS('--app-h', (vh * 100) + 'px');

  // Topbar-Höhe messen (inkl. Margin nicht nötig, wir rechnen die 36px separat)
  const tb = document.querySelector('.topbar');
  if (tb){
    const rect = tb.getBoundingClientRect();
    setCSS('--topbar-h', rect.height + 'px');
  }
}
window.addEventListener('resize', setViewportVars);
window.addEventListener('orientationchange', setViewportVars);
document.addEventListener('DOMContentLoaded', setViewportVars);
setViewportVars();


// Konfetti erzeugen
function spawnConfetti(li, count = 14){
  const palette = ["var(--accent)", "var(--accent-2)", "#ffd33d", "#2ecc71", "#ff6b6b"];
  const box = document.createElement("div");
  box.className = "confetti";
  li.appendChild(box);

  for (let i=0; i<count; i++){
    const p = document.createElement("i");
    // zufällige Richtungen
    const angle = Math.random() * Math.PI * 2;
    const dist  = 60 + Math.random()*80; // 60–140px
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist;
    const rot = (Math.random()*720 - 360) + "deg";
    p.style.setProperty("--tx", tx.toFixed(1) + "px");
    p.style.setProperty("--ty", ty.toFixed(1) + "px");
    p.style.setProperty("--rot", rot);
    p.style.background = palette[i % palette.length];
    p.style.animationDelay = (Math.random()*120|0) + "ms";
    box.appendChild(p);
  }

  // nach ~1s aufräumen
  setTimeout(()=> box.remove(), 1000);
}

// ===== Green Comet → Archiv + Impact Burst =====
function getArchiveButtonEl(){
  // im Sidebar-Navi den Button mit Text "Archiv" finden
  const btns = listsNav ? listsNav.querySelectorAll('.list-row .list-btn') : [];
  for (const b of btns){
    if (b.textContent.trim() === ARCHIVE_NAME) return b;
  }
  return null;
}

function screenBurstAt(x, y, count = 60){
  const root = document.createElement('div');
  root.className = 'fx-burst';
  const emitter = document.createElement('div');
  emitter.className = 'emitter';
  emitter.style.setProperty('--x', x + 'px');
  emitter.style.setProperty('--y', y + 'px');
  root.appendChild(emitter);

  for (let i=0; i<count; i++){
    const p = document.createElement('i');
    // weite Streuung über den Bildschirm
    const angle = Math.random() * Math.PI * 2;
    const dist  = 200 + Math.random() * 600; // 200–800px
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist;
    const rot = (Math.random()*720 - 360) + "deg";
    p.style.setProperty('--tx', tx.toFixed(1) + 'px');
    p.style.setProperty('--ty', ty.toFixed(1) + 'px');
    p.style.setProperty('--rot', rot);
    // leichte Verzögerung für organischen Look
    p.style.animationDelay = (Math.random()*80|0) + 'ms';
    emitter.appendChild(p);
  }

  document.body.appendChild(root);
  // nach Ende aufräumen
  setTimeout(()=> root.remove(), 900);
}

function flyCometToArchive(fromEl){
  try{
    const startRect = fromEl.getBoundingClientRect();
    let archBtn = getArchiveButtonEl();

    // Falls Archiv-Liste noch nicht existiert → erstellen & Listen rendern, damit Ziel existiert
    if (!archBtn){
      ensureArchiveList(); // existiert bereits in deinem Code
      renderLists();       // nur Listen, nicht komplette Items notwendig
      archBtn = getArchiveButtonEl();
    }

    if (!archBtn){
      // Fallback: zur Sidebar-Ecke fliegen
      const fallbackX = 20, fallbackY = 120;
      const sx = startRect.left + startRect.width/2;
      const sy = startRect.top  + startRect.height/2;
      const comet = document.createElement('div');
      comet.className = 'fx-comet';
      comet.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
      document.body.appendChild(comet);
      requestAnimationFrame(()=>{
        comet.style.transform = `translate3d(${fallbackX}px, ${fallbackY}px, 0)`;
      });
      comet.addEventListener('transitionend', ()=>{
        const x = fallbackX, y = fallbackY;
        comet.remove();
        screenBurstAt(x, y);
      }, { once:true });
      return;
    }

    const targetRect = archBtn.getBoundingClientRect();
    const tx = targetRect.left + targetRect.width  * 0.5;
    const ty = targetRect.top  + targetRect.height * 0.5;

    const sx = startRect.left + startRect.width/2;
    const sy = startRect.top  + startRect.height/2;

    // Komet erstellen
    const comet = document.createElement('div');
    comet.className = 'fx-comet';
    // Startposition
    comet.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
    document.body.appendChild(comet);

    // Nächster Frame → zum Ziel fliegen
    requestAnimationFrame(()=>{
      // optional: Schweif grob ausrichten (nur für Optik, kein Muss)
      const dx = tx - sx, dy = ty - sy;
      const angle = Math.atan2(dy, dx) * 180/Math.PI;
      comet.style.rotate = angle + 'deg';
      comet.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    });

    comet.addEventListener('transitionend', ()=>{
      const x = tx, y = ty;
      comet.remove();
      // Impact-Burst auslösen
      screenBurstAt(x, y);
    }, { once:true });

  } catch(e){
    // failsafe – nie hart crashen
    console.warn('Comet animation failed:', e);
  }
}


// ===== Storage =====
const STORAGE_KEY = "bucketData_v5";
const PREFS_KEY  = "bucketPrefs_v2";

const prev =
  loadJSON(STORAGE_KEY) ||
  loadJSON("bucketData_v4") ||
  loadJSON("bucketData_v3") ||
  loadJSON("bucketData_v2") ||
  loadJSON("bucketData_v1");

function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function savePrefs(){
  const base = loadJSON(PREFS_KEY) || {};
  // sanft mergen, damit fremde Keys (z. B. nbSideW aus dem Notizbuch) erhalten bleiben
  const mergedUI = { ...(base.ui || {}), ...(prefs.ui || {}) };
  const merged   = { ...base, ...prefs, ui: mergedUI };
  localStorage.setItem(PREFS_KEY, JSON.stringify(merged));
}


function normalizeState(raw){
  const src = (raw && typeof raw === "object") ? raw : {};
  let lists = Array.isArray(src.lists) ? src.lists : [];
  lists = lists.map(l => ({
    id: String(l.id || uid()),
    name: String(l.name || "Liste"),
    items: Array.isArray(l.items) ? l.items.map(it => ({
  id: String(it.id || uid()),
  title: String(it.title || it.text || ""),
  notes: String(it.notes || ""),
  done: !!it.done,
  dueDate: it.dueDate || "",
  dueTime: it.dueTime || "",
  priority: (["low","med","high"].includes(it.priority)) ? it.priority : "med",
  createdAt: Number(it.createdAt || Date.now()),
  // NEU: Repeat-Felder robust übernehmen
  repeat: (["none","daily","weekly","monthly"].includes(it.repeat)) ? it.repeat : "none",
  repeatEnd: (["never","after","until"].includes(it.repeatEnd)) ? it.repeatEnd : "never",
  repeatCount: (typeof it.repeatCount === "number" && it.repeatCount > 0) ? it.repeatCount : null,
  repeatUntil: it.repeatUntil || "",
  repeatLeft: (typeof it.repeatLeft === "number" && it.repeatLeft >= 0)
    ? it.repeatLeft
    : ((it.repeatEnd === "after" && typeof it.repeatCount === "number") ? it.repeatCount : null)
})) : []

  }));
  let selectedListId = lists.some(l => l.id === src.selectedListId)
    ? src.selectedListId
    : (lists[0]?.id || null);
  return { lists, selectedListId };
}

const state = normalizeState(prev || { lists: [], selectedListId: null });

// ===== Preferences (Theme + Opacity + Mode) =====
const THEME_MAP = {
  blue:   { accent:"#22b0ff", accent2:"#7c4dff" },
  pink:   { accent:"#ff7ab8", accent2:"#ff4d97" },
  yellow: { accent:"#ffd33d", accent2:"#ffb302" },
  red:    { accent:"#ff6b6b", accent2:"#ff3b3b" },
  green:  { accent:"#2ecc71", accent2:"#00c853" },
  teal:   { accent:"#2ad4c9", accent2:"#00bfa5" },
  orange: { accent:"#ff9f43", accent2:"#ff7f11" },
  violet:  { accent:"#8b5cf6", accent2:"#7c3aed" }, // Violett
  indigo:  { accent:"#6366f1", accent2:"#4338ca" }, // Indigoblau
  lavender:{ accent:"#c4b5fd", accent2:"#a78bfa" }, // Pastell-Lila
  mint:    { accent:"#10b981", accent2:"#34d399" }, // Mint/Emerald
  lime:    { accent:"#84cc16", accent2:"#22c55e" }, // Limette/Grün
  amber:   { accent:"#f59e0b", accent2:"#fbbf24" }, // Amber
  copper:  { accent:"#b45309", accent2:"#f59e0b" }, // Kupfer
  coral:   { accent:"#fb7185", accent2:"#f43f5e" }, // Koralle
  fuchsia: { accent:"#d946ef", accent2:"#a21caf" }, // Fuchsia
  ocean:   { accent:"#06b6d4", accent2:"#3b82f6" }, // Türkis–Blau (Ocean)
  forest:  { accent:"#16a34a", accent2:"#065f46" }, // Waldgrün
  slate:   { accent:"#64748b", accent2:"#94a3b8" }, // Schiefer (neutral)
};

const stored = loadJSON(PREFS_KEY) || {};
const prefs = {
  theme: THEME_MAP[stored.theme] ? stored.theme : "blue",
  glassAlphaStrong: isNum(stored.glassAlphaStrong) ? clamp(stored.glassAlphaStrong, .3, .95) : 0.75,
  cardAlpha: isNum(stored.cardAlpha) ? clamp(stored.cardAlpha, .3, .98) : 0.82,
  mode: (["light","dark","galaxy"].includes(stored.mode) ? stored.mode : "dark"),
  bg: (["zurich","geneva","zug","prizren","chur","luzern","lugano"].includes(stored.bg) ? stored.bg : "zurich"),
  ui: {
    cardScale: isNum(stored.ui?.cardScale) ? clamp(stored.ui.cardScale, 0.85, 1.35) : 1,
    sideW:     isNum(stored.ui?.sideW)     ? clamp(stored.ui.sideW,     220, 520) : 280,
    pressSpeed: isNum(stored.ui?.pressSpeed) ? clamp(stored.ui.pressSpeed, 0.5, 2.0) : 1
  }
};


/* ===== Sidebar Open/Close with Persist (NEW) ===== */
function isSidebarCollapsed(){
  try{
    const p = loadJSON(PREFS_KEY) || {};
    return !!(p.ui && p.ui.sideCollapsed);
  }catch{ return false; }
}
function setSidebarCollapsed(collapsed){
  const el = document.getElementById("sidebar");

  // Persistenz: prefs benutzen (saveJSON gibt es NICHT!)
  prefs.ui = prefs.ui || {};
  prefs.ui.sideCollapsed = !!collapsed;
  savePrefs();

  if (!el){
    // Fallback: nur Klasse am Body setzen
    document.body.classList.toggle("sidebar-collapsed", !!collapsed);
    return;
  }

  if (!collapsed){
    // Aufklappen: zuerst sichtbar, dann Klasse entfernen → animiert Breite auf
    el.style.display = "block";
    requestAnimationFrame(() => {
      document.body.classList.remove("sidebar-collapsed");
    });
    return;
  }

  // Zuklappen: sichtbar lassen, Klasse setzen → animiert Breite zu
  el.style.display = "block";
  requestAnimationFrame(() => {
    document.body.classList.add("sidebar-collapsed");
  });

  // NACH der Transition: display:none setzen
  const onEnd = (ev) => {
    if (ev.target !== el) return;
    if (ev.propertyName !== "width") return; // wir hören auf die Breiten-Transition
    el.style.display = "none";
    el.removeEventListener("transitionend", onEnd);
  };
  el.addEventListener("transitionend", onEnd, { once: true });
}



function openSidebar(){
  setSidebarCollapsed(false);
}
function closeSidebar(){
  setSidebarCollapsed(true);
}
function toggleSidebar(){
  setSidebarCollapsed(!isSidebarCollapsed());
}

/* Initialisiert den Menü-Button & wendet gespeicherten Zustand an */
/* Initialisiert den Menü-Button & wendet gespeicherten Zustand an */
/* Initialisiert den Menü-Button & wendet gespeicherten Zustand an */
function initSidebarToggle(){
  const el = document.getElementById("sidebar");
  const menuBtn = document.getElementById("menuBtn");
  const collapsed = isSidebarCollapsed();

  // Startzustand: Klasse + Display
  document.body.classList.toggle("sidebar-collapsed", collapsed);
  if (el) el.style.display = collapsed ? "none" : "block";
}

// Klick außerhalb: Sidebar weich zuklappen
document.addEventListener("click", (e) => {
  // schon zu? -> nichts tun
  if (isSidebarCollapsed()) return;

  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  const t = e.target;
  // wenn Klick in der Sidebar war -> nichts tun
  if (sidebar.contains(t)) return;
  // bestimmte Bereiche ignorieren
  if (t.closest("#sidebarResizer")) return;   // beim Resizer-Klick
  if (t.closest("#drawer")) return;           // Drawer/Backdrop
  if (t.closest("#menuBtn")) return;          // Menü-Button

  // jetzt sauber animiert schließen
  setSidebarCollapsed(true);
});



function applyPrefs(){
  const t = THEME_MAP[prefs.theme] || THEME_MAP.blue;
  setCSS("--accent", t.accent);
  setCSS("--accent-2", t.accent2);
  // Galaxy: fixen Akzent unabhängig von THEME_MAP
if (prefs.mode === "galaxy"){
  setCSS("--accent", "#0EA5FF");
  setCSS("--accent-2", "#60A5FA");
}

// Press-Animation-Dauer aus Speed-Faktor berechnen (1.0 = 220ms)
const base = 220; // ms
const speed = clamp(prefs.ui?.pressSpeed ?? 1, 0.5, 2);
const dur = Math.round(base / speed);
setCSS("--press-dur", dur + "ms");

// Settings-Slider initialisieren
if (pressSpeedRange) pressSpeedRange.value = String(speed);
if (pressSpeedValue) pressSpeedValue.textContent = speed.toFixed(2) + "×";


  const strong = prefs.glassAlphaStrong;
  const content = clamp(strong - 0.17, 0.20, 0.95);
  setCSS("--glass-strong-alpha", strong);
  setCSS("--glass-alpha", content);
  setCSS("--card-alpha", prefs.cardAlpha);
  setCSS("--sidebar-w", (prefs.ui?.sideW || 280) + "px");
  setCSS("--card-scale", prefs.ui?.cardScale || 1);
  setCSS("--bg-url", `url("background/${prefs.bg}.png")`);



  document.documentElement.setAttribute("data-theme", prefs.mode);

  // Galaxy-Animation je nach Modus starten/stoppen
if (prefs.mode === "galaxy") {
  startGalaxy();
} else {
  stopGalaxy();
}

// Button-Press-Speed
if (pressSpeedRange && !pressSpeedRange._wired){
  pressSpeedRange.addEventListener("input", () => {
    const v = parseFloat(pressSpeedRange.value);
    prefs.ui.pressSpeed = clamp(isNaN(v) ? 1 : v, 0.5, 2);
    if (pressSpeedValue) pressSpeedValue.textContent = prefs.ui.pressSpeed.toFixed(2) + "×";
    savePrefs();
    applyPrefs(); // setzt --press-dur live
  });
  pressSpeedRange._wired = true;
}



  if (q("#opacityRange")) q("#opacityRange").value = String(strong.toFixed(2));
  if (q("#opacityValue")) q("#opacityValue").textContent = strong.toFixed(2);
  if (q("#cardOpacityRange")) q("#cardOpacityRange").value = String(prefs.cardAlpha.toFixed(2));
  if (q("#cardOpacityValue")) q("#cardOpacityValue").textContent = prefs.cardAlpha.toFixed(2);
  if (q("#bgSelect")) q("#bgSelect").value = prefs.bg;
  markActiveTheme(prefs.theme);
  markActiveMode(prefs.mode);
}

// ===== Elements =====
const listNameInput = q("#listNameInput");
const addListBtn = q("#addListBtn");
const listsNav = q("#lists");

const addItemBtn = q("#addItemBtn");
const itemsUl = q("#items");
const emptyText = q("#emptyText");

const listButtonTpl = q("#listButtonTpl");
const itemTpl = q("#itemTpl");

// Press-Pop beim Klick: kleiner -> loslassen -> Bounce
function enablePressPop(el){
  if (!el || el._pressPop) return;
  el.addEventListener("click", () => {
    el.classList.remove("pop"); // reset, falls noch dran
    // Kurz warten, damit :active (scale .965) sichtbar war, dann Bounce
    setTimeout(() => {
      el.classList.add("pop");
      el.addEventListener("animationend", () => el.classList.remove("pop"), { once:true });
    }, 10);
  });
  el._pressPop = true;
}
enablePressPop(addListBtn);
enablePressPop(addItemBtn);


// Suche & Filter
const searchInput  = q("#searchInput");
const statusFilter = q("#statusFilter");  // all | open | done
const dueFilter    = q("#dueFilter");     // all | today | overdue
const prioFilter   = q("#prioFilter");    // all | low | med | high
const sortBy      = q("#sortBy");  // Sortierung: due | status | prio | title


// Modals
const modal = q("#itemModal");
const itemForm = q("#itemForm");
const fTitle = q("#fTitle");
const fDate  = q("#fDate");
const fTime  = q("#fTime");
const fNotes = q("#fNotes");
const cancelBtn = q("#cancelBtn");
const modalTitle = q("#modalTitle");
const saveItemBtn = q("#saveItemBtn");
const prioSegment = q("#prioSegment");
const backgroundModal   = q("#backgroundModal");
const backgroundForm    = q("#backgroundForm");
const backgroundApply   = q("#backgroundApply");
const backgroundCancel  = q("#backgroundCancel");

// Repeat-Felder
const fRepeat      = q("#fRepeat");
const fRepeatEnd   = q("#fRepeatEnd");
const fRepeatCount = q("#fRepeatCount");
const fRepeatUntil = q("#fRepeatUntil");

// Sichtbarkeit/Disable je nach Auswahl
function updateRepeatUI(){
  const hasRepeat = fRepeat?.value !== "none";
  if (fRepeatEnd) fRepeatEnd.disabled = !hasRepeat;

  if (!hasRepeat){
    if (fRepeatCount) fRepeatCount.style.display = "none";
    if (fRepeatUntil) fRepeatUntil.style.display = "none";
    return;
  }
  const end = fRepeatEnd?.value || "never";
  if (fRepeatCount) fRepeatCount.style.display = (end === "after") ? "" : "none";
  if (fRepeatUntil) fRepeatUntil.style.display = (end === "until") ? "" : "none";
}

[fRepeat, fRepeatEnd]?.forEach(el => el?.addEventListener("change", updateRepeatUI));


// Drawer + Settings
const drawer = q("#drawer");
const menuBtn = q("#menuBtn");
const openSettingsBtn = q("#openSettings");     // im Drawer
const openSettingsTop = q("#openSettingsTop");  // in der Topbar
const settingsModal = q("#settingsModal");
const settingsForm = q("#settingsForm");
const settingsCancel = q("#settingsCancel");
const opacityRange = q("#opacityRange");
const opacityValue = q("#opacityValue");
const cardOpacityRange = q("#cardOpacityRange");
const cardOpacityValue = q("#cardOpacityValue");
const themeGrid = q("#themeGrid");
const modeSegment = q("#modeSegment");
const galaxyCanvas = document.getElementById("galaxyCanvas");
// Layout-Regler (Settings)
const cardScaleRange = q("#cardScaleRange");
const cardScaleValue = q("#cardScaleValue");
const bgSelect = q("#bgSelect");
const sideWidthRange = q("#sideWidthRange");
const sideWidthValue = q("#sideWidthValue");
const pressSpeedRange = q("#pressSpeedRange");
const pressSpeedValue = q("#pressSpeedValue");
// --- Mobile helper: Sidebar als Off-Canvas benutzen ---
const MOBILE_BP = 820; // px
function isMobile(){ return window.matchMedia(`(max-width: ${MOBILE_BP}px)`).matches; }
function openMobileSidebar(){ document.body.classList.add("sb-open"); }
function closeMobileSidebar(){ document.body.classList.remove("sb-open"); }
function toggleMobileSidebar(){ document.body.classList.toggle("sb-open"); }
// === Quick-Add Bottom Sheet (Mobile) ===
const quickAdd   = document.getElementById('quickAdd');
const qaPanel    = document.getElementById('qaPanel');
const qaInput    = document.getElementById('qaInput');
const qaDone     = document.getElementById('qaDone');
const qaDetails  = document.getElementById('qaDetails');

let _qaOpen = false;
let _qaStartY = null, _qaDragging = false;

function openQuickAddSheet(prefillTitle = ""){
  if (!isMobile()) return openItemModal("create"); // Fallback Desktop
  const list = getSelectedList();
  if (!list){ alert("Bitte zuerst links eine Liste anlegen oder auswählen."); return; }
  if (isArchiveList(list)){
    showToast({ title: "Nicht möglich", subtitle: "Im Archiv können keine neuen Einträge erstellt werden." });
    return;
  }
  qaInput.value = prefillTitle || "";
  qaDone.disabled = !(qaInput.value.trim());
  quickAdd.hidden = false;
  requestAnimationFrame(()=>{
    quickAdd.classList.add('open');
    _qaOpen = true;
    // Fokus ins Feld
    setTimeout(()=> { qaInput?.focus(); try{
      const v = qaInput.value; qaInput.setSelectionRange(v.length, v.length);
    }catch(_){}} , 10);
  });
}

function closeQuickAddSheet(){
  if (!_qaOpen) return;
  quickAdd.classList.remove('open');
  // kleine Wartezeit für die Out-Animation
  setTimeout(()=> { quickAdd.hidden = true; _qaOpen = false; addItemBtn?.focus(); }, 200);
}

function createQuickItem(title){
  const list = getSelectedList();
  if (!list){ return; }
  const trimmed = (title || "").trim();
  if (!trimmed){ return; }

  const newId = uid();
  list.items.unshift({
    id: newId,
    title: trimmed,
    notes: "",
    dueDate: "",
    dueTime: "",
    priority: "med",
    createdAt: Date.now(),
    done: false,
    repeat: "none",
    repeatEnd: "never",
    repeatCount: null,
    repeatUntil: "",
    repeatLeft: null
  });
  lastAnimItemId = newId;
  saveState();
  renderItems();
  showToast({ title: "Hinzugefügt", subtitle: "Eintrag erstellt." });
}

/* Input-Interaktionen */
qaInput?.addEventListener('input', ()=>{
  qaDone.disabled = !(qaInput.value.trim());
});
qaInput?.addEventListener('keydown', (e)=>{
  if (e.key === 'Enter'){
    e.preventDefault();
    if (!qaDone.disabled){
      createQuickItem(qaInput.value);
      closeQuickAddSheet();
    }
  } else if (e.key === 'Escape'){
    e.preventDefault();
    closeQuickAddSheet();
  }
});

/* Buttons */
qaDone?.addEventListener('click', ()=>{
  if (!qaDone.disabled){
    createQuickItem(qaInput.value);
    closeQuickAddSheet();
  }
});
qaDetails?.addEventListener('click', ()=>{
  // ins große Modal wechseln, Titel vorbefüllen
  const t = qaInput.value;
  closeQuickAddSheet();
  // kurze Verzögerung, damit die Animation sauber ist
  setTimeout(()=>{
    openItemModal("create");
    try{
      fTitle.value = t;
      const v = fTitle.value || "";
      fTitle.focus(); fTitle.setSelectionRange(v.length, v.length);
    }catch(_){}
  }, 160);
});

/* Backdrop-Tap schließt */
quickAdd?.addEventListener('click', (e)=>{
  if (e.target?.hasAttribute?.('data-qa-close')) closeQuickAddSheet();
});

/* Swipe-Down zum Schließen (nur Panel) */
qaPanel?.addEventListener('pointerdown', (e)=>{
  _qaStartY = e.clientY; _qaDragging = true;
});
window.addEventListener('pointermove', (e)=>{
  if (!_qaDragging || !_qaOpen) return;
  const dy = e.clientY - _qaStartY;
  // Panel subtil mitziehen (nur nach unten)
  if (dy > 0){
    qaPanel.style.transform = `translateY(${dy}px)`;
    const back = quickAdd.querySelector('.sheet-backdrop');
    if (back){ back.style.opacity = String(Math.max(0, 1 - dy/220)); }
  }
});
window.addEventListener('pointerup', (e)=>{
  if (!_qaDragging) return;
  const dy = e.clientY - _qaStartY;
  _qaDragging = false;
  qaPanel.style.transform = '';
  const back = quickAdd?.querySelector('.sheet-backdrop'); if (back) back.style.opacity = '';
  if (dy > 60){ closeQuickAddSheet(); }
});


// Backdrop-Klick (global) schließt Sidebar auf Mobile
document.addEventListener("click", (e)=>{
  if (!isMobile()) return;
  if (!document.body.classList.contains("sb-open")) return;
  const sidebar = document.getElementById("sidebar");
  const clickedInsideSidebar = sidebar && sidebar.contains(e.target);
  const clickedMenuBtn = e.target.closest?.("#menuBtn");
  if (!clickedInsideSidebar && !clickedMenuBtn){
    closeMobileSidebar();
  }
});

// Beim Resizen: Sidebar-Open-State aufräumen
window.addEventListener("resize", ()=>{
  if (!isMobile()) closeMobileSidebar();
});



// === Click-Ripple für Buttons/Kacheln (Mode + Themes) ===
function attachRipple(container, buttonSelector){
  if (!container) return;
  container.addEventListener("click", (e) => {
    const btn = e.target.closest(buttonSelector);
    if (!btn || !container.contains(btn)) return;

    // Position/Größe bestimmen
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = (e.clientX ?? (rect.left + rect.width/2)) - rect.left - size/2;
    const y = (e.clientY ?? (rect.top + rect.height/2)) - rect.top  - size/2;

    // Element erzeugen
    const dot = document.createElement("span");
    dot.className = "ripple";
    dot.style.setProperty("--rs", size + "px");
    dot.style.setProperty("--rx", x + "px");
    dot.style.setProperty("--ry", y + "px");
    btn.appendChild(dot);
    dot.addEventListener("animationend", () => dot.remove(), { once:true });

    // kurzer „Clicked“-State für Swatches
    if (btn.classList.contains("theme-swatch")){
      btn.classList.add("clicked");
      setTimeout(()=> btn.classList.remove("clicked"), 220);
    }
  });
}

// aktivieren
attachRipple(modeSegment, ".seg-btn");
attachRipple(themeGrid, ".theme-swatch");


// Splitter (zwischen Sidebar und Content)
const sidebarResizer = q("#sidebarResizer");

if (sidebarResizer){
  sidebarResizer.addEventListener("dblclick", () => toggleSidebar());
}

// Progress UI
const progressBar = q("#progressBar");
const progressText = q("#progressText");

// ===== Helpers (dates etc.) =====
const getListById = id => state.lists.find(l => l.id === id) || null;
const getSelectedList = () => getListById(state.selectedListId);

(function initSidebarResize(){
  if (!sidebarResizer) return;
  const MIN = 220, MAX = 520;

  let startX = 0, startW = prefs.ui.sideW || 280;
  let dragging = false;

  function onMove(e){
    if (!dragging) return;
    const clientX = (e.touches && e.touches[0]?.clientX) || e.clientX;
    const dx = clientX - startX;
    const w = clamp(startW + dx, MIN, MAX);
    setCSS("--sidebar-w", w + "px");
    prefs.ui.sideW = w;
    if (sideWidthRange){ sideWidthRange.value = String(w); if (sideWidthValue) sideWidthValue.textContent = w + "px"; }
  }
  function onUp(){
    if (!dragging) return;
    dragging = false;
    sidebarResizer.classList.remove("dragging");
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
    window.removeEventListener("touchmove", onMove);
    window.removeEventListener("touchend", onUp);
    savePrefs();
  }

  sidebarResizer.addEventListener("mousedown", (e)=>{
    dragging = true; startX = e.clientX; startW = prefs.ui.sideW || 280;
    sidebarResizer.classList.add("dragging");
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  });
  sidebarResizer.addEventListener("touchstart", (e)=>{
    dragging = true; startX = e.touches[0].clientX; startW = prefs.ui.sideW || 280;
    sidebarResizer.classList.add("dragging");
    window.addEventListener("touchmove", onMove, {passive:false});
    window.addEventListener("touchend", onUp);
  }, {passive:true});
})();

// Hintergrund-Dropdown
if (bgSelect && !bgSelect._wired){
  bgSelect.addEventListener("change", () => {
    const val = bgSelect.value;
    // Sicherheitscheck gegen erlaubte Keys
    const allowed = ["zurich","geneva","zug","prizren","chur","luzern","lugano"];
    prefs.bg = allowed.includes(val) ? val : "zurich";
    savePrefs();
    applyPrefs(); // setzt --bg-url sofort
  });
  bgSelect._wired = true;
}


function fmtDue(dateStr, timeStr){
  if(!dateStr && !timeStr) return "";
  const t = timeStr || "00:00";
  const d = new Date(`${dateStr || ""}T${t}`);
  if (isNaN(d)) return "";
  return d.toLocaleString([], { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

function isoToDate(iso){ return iso ? new Date(iso + "T00:00:00") : null; }
function dateToISO(d){ if (!d || isNaN(d)) return ""; const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,"0"); const dd=String(d.getDate()).padStart(2,"0"); return `${y}-${m}-${dd}`; }

function addDays(d, n){ const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function addWeeks(d, n){ return addDays(d, n*7); }
function addMonthsClamped(d, n){
  const x = new Date(d);
  const day = x.getDate();
  x.setMonth(x.getMonth()+n);
  // Bei Monatsende nach unten clampen (z.B. 31. → 30./28.)
  while (x.getDate() < day && x.getMonth() === (new Date(d).getMonth()+n+12)%12){ x.setDate(x.getDate()-1); }
  return x;
}

function nextDueDateISO(currentISO, repeat){
  const d = isoToDate(currentISO);
  if (!d) return "";
  if (repeat === "daily")   return dateToISO(addDays(d, 1));
  if (repeat === "weekly")  return dateToISO(addWeeks(d, 1));
  if (repeat === "monthly") return dateToISO(addMonthsClamped(d, 1));
  return ""; // none
}

// erzeugt ggf. nächste Instanz in derselben Liste
function maybeCreateNextOccurrence(item, list){
  if (!item || !list) return;
  if (item.repeat === "none") return;
  if (!item.dueDate) return; // Ohne Ankerdatum keine Wiederholung

  const nextDate = nextDueDateISO(item.dueDate, item.repeat);
  if (!nextDate) return;

  // Endbedingungen prüfen
  if (item.repeatEnd === "until" && item.repeatUntil){
    if (nextDate > item.repeatUntil) return;
  }
  let nextLeft = (typeof item.repeatLeft === "number") ? (item.repeatLeft - 1) : null;
  if (item.repeatEnd === "after"){
    if (nextLeft != null && nextLeft <= 0) return;
  }

  const newItem = {
    id: uid(),
    title: item.title,
    notes: item.notes,
    dueDate: nextDate,
    dueTime: item.dueTime,
    priority: item.priority,
    createdAt: Date.now(),
    done: false,
    repeat: item.repeat,
    repeatEnd: item.repeatEnd,
    repeatCount: item.repeatCount,
    repeatUntil: item.repeatUntil,
    repeatLeft: (item.repeatEnd === "after") ? (nextLeft ?? item.repeatCount ?? null) : null
  };
  list.items.unshift(newItem);
  lastAnimItemId = newItem.id;
}

function todayISO(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${dd}`;
}
function prioLabel(p){
  return p==="low" ? "Niedrig" : p==="high" ? "Dringend" : "Mittel";
}

function repeatLabel(rep){
  return rep === "daily"   ? "Täglich"
       : rep === "weekly"  ? "Wöchentlich"
       : rep === "monthly" ? "Monatlich"
       : "";
}


// ===== Galaxy Starfield Renderer =====
let _galaxy = null;

function startGalaxy(){
  if (!galaxyCanvas) return;
  if (_galaxy) { _galaxy.start(); return; }
  _galaxy = createStarfield(galaxyCanvas);
  _galaxy.start();
}

function stopGalaxy(){
  _galaxy?.stop();
}

function createStarfield(canvas){
  const ctx = canvas.getContext("2d");
  let raf = 0, running = false;
  const layers = [];
  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  function resize(){
    const w = canvas.clientWidth  || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    canvas.width  = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
    layers.length = 0;
    // drei Parallax-Schichten
    layers.push(buildLayer(90,  0.08, 0.6));  // fern
    layers.push(buildLayer(70,  0.16, 0.8));  // mittel
    layers.push(buildLayer(40,  0.28, 1.0));  // nah
  }

  function rand(min, max){ return Math.random()*(max-min)+min; }

  function buildLayer(count, speed, alpha){
    const stars = [];
    for (let i=0;i<count;i++){
      stars.push({
        x: rand(0, canvas.width),
        y: rand(0, canvas.height),
        r: rand(0.4, 1.6),
        a: alpha * rand(0.6, 1.0),
        vx: speed * (Math.random()<.5 ? 1 : -1),
        vy: speed * (Math.random()<.5 ? 1 : -1),
      });
    }
    return { stars, speed };
  }

  function drawNebula(){
    const w = canvas.width / DPR, h = canvas.height / DPR;
    const g = ctx.createRadialGradient(w*0.7, h*0.3, 20, w*0.5, h*0.4, Math.max(w,h)*0.9);
    g.addColorStop(0.0, "rgba(14,165,255,0.22)");
    g.addColorStop(0.4, "rgba(14,165,255,0.10)");
    g.addColorStop(1.0, "rgba(2,6,23,0.0)");
    ctx.fillStyle = g;
    ctx.fillRect(0,0,w,h);
  }

  function tick(){
    if (!running) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);

    // Nebula-Glow
    drawNebula();

    // Sterne
    for (const {stars} of layers){
      for (const s of stars){
        s.x += s.vx; s.y += s.vy;
        if (s.x < 0) s.x += w; else if (s.x > w) s.x -= w;
        if (s.y < 0) s.y += h; else if (s.y > h) s.y -= h;

        ctx.globalAlpha = s.a;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
        ctx.fillStyle = "#E0F5FF";
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(tick);
  }

  function start(){
    if (running) return;
    running = true;
    resize();
    window.addEventListener("resize", resize);
    tick();
  }
  function stop(){
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
  }
  return { start, stop };
}


// ===== Button pop animation =====
document.addEventListener("click", (e)=>{
  const btn = e.target.closest(".pressable");
  if(!btn) return;
  btn.classList.remove("pop");
  requestAnimationFrame(()=> btn.classList.add("pop"));
  btn.addEventListener("animationend", ()=> btn.classList.remove("pop"), { once:true });
});

// ===== Drawer open/close =====
function openDrawer(){
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden","false");
  menuBtn?.classList?.add("open"); // falls Burger-Morph CSS genutzt wird
}
function closeDrawer(){
  // 'closing' = animierter Rückweg
  drawer.classList.add("closing");
  drawer.classList.remove("open");
  menuBtn?.classList?.remove("open");
  drawer.setAttribute("aria-hidden","true");

  // Auf das Ende der Panel-Transition warten
  const panel = drawer.querySelector(".drawer-panel");
  const onDone = () => {
    drawer.classList.remove("closing");
    panel.removeEventListener("transitionend", onDone);
  };
  // Falls kein Panel gefunden oder User bevorzugt reduzierte Bewegung → Fail-safe Timeout
  if (panel) {
    panel.addEventListener("transitionend", onDone, { once: true });
  } else {
    setTimeout(() => drawer.classList.remove("closing"), 300);
  }
}

if (menuBtn) menuBtn.addEventListener("click", ()=>{
  if (isMobile()){
    toggleMobileSidebar();
  } else {
    if (drawer.classList.contains("open")) closeDrawer(); else openDrawer();
  }
});

if (drawer) drawer.addEventListener("click", (e)=>{
  if (e.target.classList.contains("drawer-backdrop")) closeDrawer();
});

/* ===== Backup & Restore ===== */
function exportBackup(){
  const payload = {
    __type: "bucket-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    storage: {
      [STORAGE_KEY]: state,
      [PREFS_KEY]:   prefs
    }
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const d = new Date();
  const fname = `bucket-backup-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}.json`;

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  a.remove();

  // Nach erfolgreichem Export:
showToast({
  title: 'Erfolgreich',
  subtitle: 'Erfolgreich exportiert',
  duration: 5000,                  // 5s, gerne anpassen
  accentColor: '#22c55e'           // grün für die Progressbar (optional)
});

}

function importBackupText(text){
  let data;
  try{
    data = JSON.parse(text);
  }catch(e){
    alert("Ungültige Datei (kein JSON).");
    return;
  }

  // Flexible Annahme: neuer Wrapper (storage) ODER direkt der State
  let newState = null, newPrefs = null;
  if (data && data.storage){
    newState = data.storage[STORAGE_KEY] || null;
    newPrefs = data.storage[PREFS_KEY]   || null;
  } else if (data && data.lists){
    newState = data; // raw state
  }

  if (!newState || !Array.isArray(newState.lists)){
    // Fehler-Toast bei ungültigem Import
const xSVG = `
  <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" stroke-width="2"/>
    <path d="M8 8l8 8M16 8l-8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>
`;

showToast({
  title: 'Fehlgeschlagen',
  subtitle: 'Ungültiger Import',
  duration: 5000,
  accentColor: '#ef4444',    // Rot für die Progressbar
  iconSVG: `<div style="color:#ef4444;">${xSVG}</div>` // rotes Icon
});
    return;
  }

  // Normalisieren & übernehmen
  const normalized = normalizeState(newState);
  state.lists = normalized.lists;
  state.selectedListId = normalized.selectedListId;
  saveState();

  if (newPrefs){
    if (THEME_MAP[newPrefs.theme]) prefs.theme = newPrefs.theme;
    if (isNum(newPrefs.glassAlphaStrong)) prefs.glassAlphaStrong = clamp(newPrefs.glassAlphaStrong, .3, .95);
    if (isNum(newPrefs.cardAlpha))        prefs.cardAlpha        = clamp(newPrefs.cardAlpha, .3, .98);
    if (newPrefs.mode === "dark" || newPrefs.mode === "light") prefs.mode = newPrefs.mode;
    savePrefs();
  }

  applyPrefs();
  render();
    // Nach erfolgreichem Export:
showToast({
  title: 'Erfolgreich',
  subtitle: 'Erfolgreich importiert',
  duration: 5000,                  // 5s, gerne anpassen
  accentColor: '#22c55e'           // grün für die Progressbar (optional)
});
}

if (backupBtn) backupBtn.addEventListener("click", exportBackup);

if (restoreInput) restoreInput.addEventListener("change", async (e)=>{
  const file = e.target.files?.[0];
  if (!file) return;
  try{
    const text = await file.text();
    importBackupText(text);
  } finally {
    // Auswahl zurücksetzen, damit man dieselbe Datei erneut wählen kann
    e.target.value = "";
  }
});

// moderne Select-Optik aktivieren
document.querySelectorAll('select').forEach(el => el.classList.add('select-modern'));



// ===== Render: Lists =====
// ===== Render: Lists =====
function renderLists(){
  listsNav.innerHTML = "";
  state.lists.forEach(list => {
    const row = listButtonTpl.content.firstElementChild.cloneNode(true);
    const btn = q(".list-btn", row);
    const nameEl = q(".list-name", row);
    const renameBtn = q('[data-action="rename"]', row);
    const deleteBtn = q('[data-action="delete"]', row);
    const handle = q(".drag-handle.list", row);

    nameEl.textContent = list.name;
    btn.dataset.id = list.id;
    btn.classList.toggle("active", list.id === state.selectedListId);

    btn.addEventListener("click", () => smoothSelectList(list.id));
    btn.addEventListener("dblclick", () => startInlineRename(list.id));

    renameBtn.addEventListener("click", (e)=>{ e.stopPropagation(); startInlineRename(list.id); });
    deleteBtn.addEventListener("click", (e)=>{
      e.stopPropagation();
      if (confirm(`Liste "${list.name}" wirklich löschen?`)){
        const idx = state.lists.findIndex(l => l.id === list.id);
        if (idx > -1) state.lists.splice(idx, 1);
        if (state.selectedListId === list.id) state.selectedListId = state.lists[0]?.id ?? null;
        saveState(); render();
      }
    });

    // Items in Liste droppen → ans Ende
    row.addEventListener("dragover", (e)=>{
      if (dragState?.type === "item"){ e.preventDefault(); row.classList.add("drop-target"); }
    });
    row.addEventListener("dragleave", ()=> row.classList.remove("drop-target"));
    row.addEventListener("drop", ()=>{
      row.classList.remove("drop-target");
      if (dragState?.type === "item"){
        moveItemRelative(dragState.itemId, dragState.fromListId, list.id, null);
      }
    });

    // Listen sortieren
    handle.addEventListener("mousedown", ()=> row.draggable = true);
    handle.addEventListener("mousedown", ()=> li.draggable = true);

// 👉 auf Mobile KEIN echtes draggable setzen
handle.addEventListener("touchstart", (e)=>{
  if (!isMobile()) li.draggable = true;
}, {passive:true});
    row.addEventListener("dragstart", (e)=>{
      row.classList.add("dragging");
      startDrag({ type:"list", listId: list.id }, e.dataTransfer);
    });
    row.addEventListener("dragend", ()=>{
      row.classList.remove("dragging");
      row.draggable = false;
      endDrag();
    });

    listsNav.appendChild(row);
  });
}

// Nach renderLists() Aufruf, innerhalb von renderLists() nach dem Append:
listsNav.addEventListener("click", (e)=>{
  const btn = e.target.closest?.(".list-btn");
  if (!btn) return;
  if (isMobile()) closeMobileSidebar();
});

// ===== Inline Rename (contenteditable) für Listennamen =====
function startInlineRename(listId){
  const btn = listsNav.querySelector(`.list-btn[data-id="${CSS.escape(listId)}"]`);
  if (!btn) return;
  const nameEl = btn.querySelector(".list-name");
  if (!nameEl) return;

  // aktives List-Objekt
  const listObj = state.lists.find(l => l.id === listId);
  if (!listObj) return;

  if (btn._editing) return; // schon im Edit
  btn._editing = true;
  btn.classList.add("editing");

  const prev = listObj.name || "";
  nameEl.setAttribute("contenteditable", "true");
  nameEl.setAttribute("role", "textbox");
  nameEl.setAttribute("aria-label", "Listenname bearbeiten");
  nameEl.spellcheck = false;

  // Fokus + kompletten Text markieren
  requestAnimationFrame(()=>{
    nameEl.focus();
    try{
      const r = document.createRange();
      r.selectNodeContents(nameEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
    }catch(_){}
  });

  function finish(save){
    // Aufräumen & speichern
    const raw = (nameEl.textContent || "").replace(/\s+/g, " ").trim();
    const newVal = save ? (raw || prev || "Neue Liste") : prev;

    listObj.name = newVal;
    saveState();
    // Nur Listen neu zeichnen, damit Fokus nicht „springt“
    renderLists();

    // Auswahl beibehalten
    smoothSelectList(listId);
  }

  function onKey(e){
    if (e.key === "Enter"){
      e.preventDefault(); finish(true);
    } else if (e.key === "Escape"){
      e.preventDefault(); finish(false);
    } else if (e.key === "Tab"){
      e.preventDefault(); finish(true);
    }
  }

  function onBlur(){
    finish(true);
  }

  nameEl.addEventListener("keydown", onKey);
  nameEl.addEventListener("blur", onBlur, { once: true });

  // Cleanup-Flag beim Re-Render hinfällig; hier reicht Klassen-/Attr-Reset
}


// ===== Smooth List Switch (fade) =====
const progressWrap = document.querySelector(".progress-wrap");
[itemsUl, emptyText, progressWrap].forEach(el => el && el.classList.add("list-switchable"));

function setActiveListUI(listId){
  [...listsNav.querySelectorAll(".list-btn")].forEach(b=>{
    const isActive = b.dataset.id === listId;
    b.classList.toggle("active", isActive);
    b.setAttribute("aria-current", isActive ? "true" : "false");
  });
}
let _isSwitching = false;
function smoothSelectList(newListId){
  if (_isSwitching || state.selectedListId === newListId) return;
  _isSwitching = true;

  // Active-UI sofort
  setActiveListUI(newListId);

  const els = [itemsUl, emptyText, progressWrap].filter(Boolean);
  els.forEach(el => el.classList.add("list-switch-out"));

  setTimeout(() => {
    state.selectedListId = newListId;
    saveState();
    renderItems();

    requestAnimationFrame(() => {
      els.forEach(el => {
        el.classList.remove("list-switch-out");
        el.classList.add("list-switch-in");
        el.addEventListener("animationend", () => el.classList.remove("list-switch-in"), { once:true });
      });
      itemsUl?.scrollTo?.({ top:0, behavior:"auto" });
      _isSwitching = false;
    });
  }, 180);
}

// ===== Drag & Drop (globaler dragState) =====
let dragState = null; // { type:"item"| "list", itemId?, fromListId?, listId? }
function startDrag(state, dt){ dragState = state; try { dt.setData("text/plain", "drag"); } catch{} dt.effectAllowed = "move"; }
function endDrag(){ dragState = null; clearDropMarker(); clearListDropMarker(); itemsUl.classList.remove("drag-active"); }

// ===== Render: Items =====
let lastAnimItemId = null;

function applySearchAndFilters(items){
  let arr = [...items];
  const qstr = (searchInput?.value || "").trim().toLowerCase();
  if (qstr){
    arr = arr.filter(it =>
      (it.title || "").toLowerCase().includes(qstr) ||
      (it.notes || "").toLowerCase().includes(qstr)
    );
  }
  const st = statusFilter?.value || "all";
  if (st === "open") arr = arr.filter(it => !it.done);
  else if (st === "done") arr = arr.filter(it => it.done);

  const due = dueFilter?.value || "all";
  const today = todayISO();
  if (due === "today"){
    arr = arr.filter(it => it.dueDate === today);
  } else if (due === "overdue"){
    arr = arr.filter(it => !it.done && getDueTimestamp(it.dueDate, it.dueTime) && getDueTimestamp(it.dueDate, it.dueTime) < Date.now());
  }

  const pf = prioFilter?.value || "all";
  if (["low","med","high"].includes(pf)) arr = arr.filter(it => it.priority === pf);

  return arr;
}

// Hilfsfunktion: Fälligkeit in Timestamp (ms) wandeln; ohne Datum → null
function getDueTimestamp(d, t){
  if (!d) return null;
  const s = t ? `${d}T${t}` : `${d}T23:59`;
  const ts = Date.parse(s);
  return Number.isNaN(ts) ? null : ts;
}

// Sortiert ein Array von Items gemäß sortBy
function sortItems(arr){
  
   const mode = (sortBy && sortBy.value) ? sortBy.value : "due";

  // NEU: keine Sortierung → originale Reihenfolge behalten
  if (mode === "none") return arr;

  const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });
  const prioRank = (p) => (p === "high" ? 0 : p === "med" ? 1 : p === "low" ? 2 : 3);
  const statusRank = (it) => (it.done ? 1 : 0);

  return arr.slice().sort((a, b) => {
    const titleCmp = () => collator.compare((a.title || ""), (b.title || ""));
    const dueA = getDueTimestamp(a.dueDate, a.dueTime);
    const dueB = getDueTimestamp(b.dueDate, b.dueTime);
    const hasA = dueA != null, hasB = dueB != null;

    if (mode === "title") return titleCmp();

    if (mode === "prio"){
      const d = prioRank(a.priority) - prioRank(b.priority);
      if (d) return d;
      if (hasA && hasB && dueA !== dueB) return dueA - dueB; // früher zuerst
      if (hasA !== hasB) return hasA ? -1 : 1;               // Items mit Datum vor ohne
      return titleCmp();
    }

    if (mode === "status"){
      const d = statusRank(a) - statusRank(b);               // offen vor erledigt
      if (d) return d;
      if (hasA && hasB && dueA !== dueB) return dueA - dueB;
      if (hasA !== hasB) return hasA ? -1 : 1;
      const pr = prioRank(a.priority) - prioRank(b.priority); // high vor low
      if (pr) return pr;
      return titleCmp();
    }

    // Default: mode === "due"
    if (hasA && hasB){
      if (dueA !== dueB) return dueA - dueB;
    } else if (hasA !== hasB){
      return hasA ? -1 : 1;
    }
    // Tiebreaker: offen vor erledigt → Priorität (high→low) → erstellt ↑ → Titel
    const s = statusRank(a) - statusRank(b);
    if (s) return s;
    const pr = prioRank(a.priority) - prioRank(b.priority);
    if (pr) return pr;
    const ca = (a.createdAt || 0) - (b.createdAt || 0);
    if (ca) return ca;
    return titleCmp();
  });
}



function renderItems(){
  const list = getSelectedList();
  itemsUl.innerHTML = "";

  if (!list){
    emptyText.textContent = "Lege links eine Liste an, um Einträge zu erstellen.";
    emptyText.style.display = "block";
    updateProgress(null);
    return;
  }

// === Archiv-Button oben ein-/ausblenden ===
const topClearBtn = document.getElementById('clearArchiveBtn');
if (topClearBtn) {
  // sichtbar nur in der Archivliste (optional: nur wenn Items vorhanden)
  const inArchive = isArchiveList(list);
  topClearBtn.hidden = !(inArchive && (list.items?.length ?? 0) >= 0);
  // Click-Handler einmalig verdrahten
  if (!topClearBtn._wired) {
    topClearBtn.addEventListener('click', () => openClearArchiveModal());
    topClearBtn._wired = true;
  }
}



  const toShow = applySearchAndFilters(list.items);
  const ordered = sortItems(toShow);


  emptyText.style.display = toShow.length ? "none" : "block";
  if (!toShow.length){
    emptyText.textContent = list.items.length ? "Keine Einträge entsprechen Suche/Filter." : "Aktuell sind keine Einträge vorhanden";
  }

  ordered.forEach(item => {
    const li = itemTpl.content.firstElementChild.cloneNode(true);
    li.dataset.id = item.id;

    const cb = q("input", li);
    cb.checked = !!item.done;
    li.classList.toggle("done", !!item.done);
    cb.addEventListener("change", (e)=> handleToggleDone(e, item, list, li));
    


    q(".title", li).textContent = item.title || "";
    const notesEl = q(".notes", li);
    notesEl.hidden = !(item.notes || "").trim();
    if (!notesEl.hidden) notesEl.textContent = item.notes.trim();

    const prioEl = q(".prio", li);
    if (item.priority){
      prioEl.hidden = false;
      prioEl.textContent = prioLabel(item.priority);
      prioEl.classList.remove("low","med","high");
      prioEl.classList.add(item.priority);
    } else prioEl.hidden = true;

    const dueEl = q(".due", li);
    const dueStr = fmtDue(item.dueDate, item.dueTime);
    const dueTs = getDueTimestamp(item.dueDate, item.dueTime);
    const isOverdue = !item.done && dueTs && Date.now() > dueTs;
    if (dueStr){
      dueEl.hidden = false;
      dueEl.textContent = dueStr;
      dueEl.classList.toggle("overdue", !!isOverdue);
      dueEl.classList.toggle("done", !!item.done);
    } else dueEl.hidden = true;

    q('[data-action="edit"]', li).addEventListener("click", ()=> openItemModal("edit", item));
    q('[data-action="delete"]', li).addEventListener("click", ()=>{
      li.classList.add("anim-out");
      li.addEventListener("animationend", ()=>{
        const idx = list.items.findIndex(i => i.id === item.id);
        if (idx > -1) list.items.splice(idx, 1);
        saveState(); renderItems();
      }, { once:true });
    });

    // Repeat-Label rechts neben dem Bearbeiten-Icon
const repEl = q(".repeat", li);
if (repEl){
  if (item.repeat && item.repeat !== "none"){
    repEl.hidden = false;
    repEl.textContent = repeatLabel(item.repeat);
  } else {
    repEl.hidden = true;
  }
}

    const handle = q(".drag-handle", li);
    handle.addEventListener("mousedown", ()=> li.draggable = true);
    handle.addEventListener("touchstart", ()=> li.draggable = true, {passive:true});
    li.addEventListener("dragstart", (e)=>{
      li.classList.add("dragging");
      startDrag({ type:"item", itemId: item.id, fromListId: list.id }, e.dataTransfer);
    });
    li.addEventListener("dragend", ()=>{
      li.classList.remove("dragging");
      li.draggable = false;
      endDrag();
    });

    itemsUl.appendChild(li);

    if (lastAnimItemId === item.id){
      li.classList.add("anim-in");
      li.addEventListener("animationend", ()=> li.classList.remove("anim-in"), { once:true });
      lastAnimItemId = null;
    }
  });

  updateProgress(list, toShow);
}

function render(){ renderLists(); renderItems(); }

function moveItemToArchive(item, fromList){
  const arch = ensureArchiveList();
  // aus Quellliste raus
  const idx = fromList.items.findIndex(i => i.id === item.id);
  if (idx > -1) fromList.items.splice(idx, 1);

  // Herkunft speichern & als erledigt markieren
  item.originListId = fromList.id;
  item.done = true;

  // oben einfügen
  arch.items.unshift(item);

  saveState();
  render(); // Listen + Items aktualisieren
}

function restoreFromArchive(item){
  const arch = getArchiveList();
  if (!arch) return;

  // aus Archiv entfernen
  const idx = arch.items.findIndex(i => i.id === item.id);
  if (idx > -1) arch.items.splice(idx, 1);

  // Ziel: ursprüngliche Liste oder erste Nicht-Archiv-Liste
  let dest = state.lists.find(l => l.id === item.originListId && !isArchiveList(l));
  if (!dest) dest = state.lists.find(l => !isArchiveList(l)) || arch; // Fallback

  item.done = false;
  // optional: Herkunft löschen -> item.originListId = undefined;
  dest.items.unshift(item);
  lastAnimItemId = item.id;

  saveState();
  render();
}

function handleToggleDone(e, item, list, li){
  const checked = e.target.checked;

  if (checked){
    // Visuelles Celebrate am Item
    li.classList.add("flash");
    spawnConfetti(li);

    // === NEU: grüner Komet → Archiv + Impact-Burst
    const srcEl = li.querySelector('.checkbox') || li;
    flyCometToArchive(srcEl);

    // Danach wie gehabt: kurz Glow zeigen, Item ausblenden → Archiv verschieben
    setTimeout(()=>{
      li.classList.add("anim-out");
      li.addEventListener("animationend", ()=>{
        // Folgeereignis aus Wiederholung erzeugen (dein vorhandener Code)
        maybeCreateNextOccurrence(item, list);
        // ins Archiv verschieben (dein vorhandener Code)
        moveItemToArchive(item, list);
      }, { once:true });
    }, 450);

  } else {
    // wenn im Archiv ent-hakt → wiederherstellen
    if (isArchiveList(list)){
      restoreFromArchive(item);
    } else {
      // normales Undone außerhalb Archiv
      item.done = false;
      saveState();
      renderItems();
    }
  }
}



// ===== Progress (smooth) =====
let _progressAnim = { lastPct: 0, raf: null };
function animateProgressTo(targetPct, done, total){
  progressBar.classList.add('moving');
  progressBar.style.width = targetPct + '%';
  clearTimeout(progressBar._shimmerTO);
  progressBar._shimmerTO = setTimeout(()=> progressBar.classList.remove('moving'), 850);

  cancelAnimationFrame(_progressAnim.raf);
  const startPct = _progressAnim.lastPct;
  const start = performance.now();
  const dur = 520;
  const ease = t => t*(2-t);
  function tick(now){
    const t = Math.min(1, (now - start) / dur);
    const cur = Math.round(startPct + (targetPct - startPct) * ease(t));
    progressText.textContent = `${done} von ${total} erledigt (${cur}%)`;
    if (t < 1){
      _progressAnim.raf = requestAnimationFrame(tick);
    } else {
      _progressAnim.lastPct = targetPct;
    }
  }
  _progressAnim.raf = requestAnimationFrame(tick);
}
function updateProgress(list, visibleItems=[]){
  if (!progressBar || !progressText){ return; }
  if (!list){
    _progressAnim.lastPct = 0;
    progressBar.style.width = "0%";
    progressText.textContent = "0 von 0 erledigt (0%)";
    return;
  }
  const arr = Array.isArray(visibleItems) ? visibleItems : [];
  const total = arr.length;
  const done  = arr.filter(i => i.done).length;
  const pct   = total ? Math.round((done / total) * 100) : 0;
  animateProgressTo(pct, done, total);
}

function showToast({
  title = '',
  subtitle = '',
  duration = 5000,
  accentColor,
  iconSVG
} = {}) {
  // Root sicherstellen
  let root = document.getElementById('toast-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toast-root';
    root.setAttribute('aria-live', 'polite');
    root.setAttribute('aria-atomic', 'true');
    document.body.appendChild(root);
  }

  // Default-Icon (großer grüner Haken)
  const checkSVG = `
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" stroke-width="2"/>
      <path d="M6.5 12.5l3.5 3.5 7.5-7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

  // Toast-Element
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');

  // Icon + Text + Close
  toast.innerHTML = `
    <div class="toast-icon" style="color: #22c55e;">${iconSVG || checkSVG}</div>
    <div class="toast-body">
      <div class="toast-title"> ${title} </div>
      <div class="toast-subtitle"> ${subtitle} </div>
    </div>
    <button class="toast-close" aria-label="Schließen">×</button>
    <div class="progress">
      <div class="bar" ${accentColor ? `style="background:${accentColor};"` : ''}></div>
    </div>
  `;

  // Close-Verhalten
  const closeBtn = toast.querySelector('.toast-close');
  const bar = toast.querySelector('.progress .bar');

  let closed = false;
  let closeTimer;

  function closeToast() {
    if (closed) return;
    closed = true;
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-6px)';
    setTimeout(() => {
      toast.remove();
    }, 180);
  }

  closeBtn.addEventListener('click', closeToast);

  // ESC schließt den zuletzt erschienenen Toast
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      document.removeEventListener('keydown', escHandler);
      closeToast();
    }
  };
  document.addEventListener('keydown', escHandler);

  // Einfügen & kleine Enter-Animation
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(-6px)';
  root.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.transition = 'opacity .18s ease, transform .18s ease';
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  // Progressbar animieren (linear)
  if (bar) {
    // Dauer dynamisch setzen
    bar.style.transitionDuration = `${duration}ms`;
    // Start → Ende
    requestAnimationFrame(() => {
      bar.style.width = '0%';
    });
  }

  // Auto-Close
  if (duration > 0) {
    closeTimer = setTimeout(closeToast, duration);
  }

  // Cleanup, falls manuell vorher geschlossen
  toast.addEventListener('remove', () => {
    if (closeTimer) clearTimeout(closeTimer);
    document.removeEventListener('keydown', escHandler);
  });

  return closeToast; // optional: manuelles Schließen via Rückgabefunktion
}

// ===== Drag utils: Items =====
const dropMarker = document.createElement("li"); dropMarker.className = "drop-marker";
function clearDropMarker(){ if (dropMarker.parentElement) dropMarker.parentElement.removeChild(dropMarker); }

function getDragAfterElement(container, y, selector){
  const els = [...container.querySelectorAll(selector)];
  let closest = { offset: Number.NEGATIVE_INFINITY, element: null };
  for (const child of els){
    const box = child.getBoundingClientRect();
    const offset = y - (box.top + box.height/2);
    if (offset < 0 && offset > closest.offset) closest = { offset, element: child };
  }
  return closest.element;
}

itemsUl.addEventListener("dragover", (e)=>{
  if (dragState?.type !== "item") return;
  e.preventDefault();
  itemsUl.classList.add("drag-active");
  const after = getDragAfterElement(itemsUl, e.clientY, ".item:not(.dragging)");
  if (after == null) itemsUl.appendChild(dropMarker);
  else itemsUl.insertBefore(dropMarker, after);
});
itemsUl.addEventListener("dragleave", (e)=>{
  const rel = e.relatedTarget || null;
  if (!rel || !itemsUl.contains(rel)) { itemsUl.classList.remove("drag-active"); clearDropMarker(); }
});
itemsUl.addEventListener("drop", (e)=>{
  if (dragState?.type !== "item") return;
  e.preventDefault();
  itemsUl.classList.remove("drag-active");
  const anchor = dropMarker.nextElementSibling?.closest?.(".item");
  const beforeId = anchor ? anchor.dataset.id : null;
  clearDropMarker();
  moveItemRelative(dragState.itemId, dragState.fromListId, state.selectedListId, beforeId);
});

function moveItemRelative(itemId, fromListId, toListId, beforeItemId){
  const src = getListById(fromListId);
  const dst = getListById(toListId);
  if (!src || !dst) return;
  const i = src.items.findIndex(it => it.id === itemId);
  if (i < 0) return;
  const [moved] = src.items.splice(i, 1);
  let idx = (beforeItemId) ? dst.items.findIndex(it => it.id === beforeItemId) : dst.items.length;
  if (idx < 0) idx = dst.items.length;
  dst.items.splice(idx, 0, moved);
  lastAnimItemId = moved.id;
  saveState();
  if (state.selectedListId !== toListId) state.selectedListId = toListId;
  render();
}

// ===== Drag utils: Lists (reorder) =====

// ===== Mobile Drag & Drop (Pointer Events + Long-Press) ===================
// Nutzt vorhandene: getDragAfterElement, dropMarker/listDropMarker,
// moveItemRelative, reorderList

(function enableMobileDnD(){
  if (!('PointerEvent' in window)) return;

  // ---- Items (rechts im Content) ----
  itemsUl?.addEventListener('pointerdown', (e)=>{
    const handle = e.target.closest('.drag-handle');
    const li = e.target.closest('.item');
    if (!handle || !li) return;
    if (e.pointerType === 'mouse') return; // Desktop → native DnD nutzen

    let longPressTO;
    let active = false;
    let ghost = null;

    const start = (pt)=>{
      active = true;
      document.body.classList.add('dragging-touch');

      // Ghost bauen
      const rect = li.getBoundingClientRect();
      ghost = li.cloneNode(true);
      ghost.classList.add('drag-ghost');
      ghost.style.width = rect.width + 'px';
      ghost.style.height = rect.height + 'px';
      positionGhost(pt.clientX, pt.clientY);
      document.body.appendChild(ghost);

      itemsUl.classList.add('drag-active');
      li.classList.add('dragging');
    };

    const positionGhost = (x, y)=>{
      if (!ghost) return;
      ghost.style.left = x + 'px';
      ghost.style.top  = y + 'px';
    };

    const move = (pt)=>{
      if (!active) return;
      positionGhost(pt.clientX, pt.clientY);
      const after = getDragAfterElement(itemsUl, pt.clientY, ".item:not(.dragging)");
      if (after == null) itemsUl.appendChild(dropMarker);
      else itemsUl.insertBefore(dropMarker, after);
    };

    const finish = (pt, cancelled=false)=>{
      clearTimeout(longPressTO);
      window.removeEventListener('pointermove', onMove, {passive:false});
      window.removeEventListener('pointerup', onUp, {passive:false});
      window.removeEventListener('pointercancel', onCancel, {passive:false});

      if (!active){
        // kein Drag gestartet → normaler Tap
        return;
      }

      active = false;
      document.body.classList.remove('dragging-touch');
      li.classList.remove('dragging');
      itemsUl.classList.remove('drag-active');
      ghost?.remove();
      ghost = null;

      if (cancelled){
        clearDropMarker();
        return;
      }

      // Zielposition bestimmen und verschieben
      const itemId = li.dataset.id;
      const anchor = dropMarker.nextElementSibling?.closest?.('.item');
      const beforeId = anchor ? anchor.dataset.id : null;
      clearDropMarker();

      // aus der aktuellen Liste in die aktuelle Liste (Reihenfolge ändern)
      moveItemRelative(itemId, state.selectedListId, state.selectedListId, beforeId);
    };

    const onMove = (ev)=>{
      if (!active && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) > 6){
        // Bei leichter Bewegung vor Ablauf der Long-Presszeit starten wir trotzdem
        clearTimeout(longPressTO);
        start(ev);
      }
      if (active){
        ev.preventDefault();
        move(ev);
      }
    };
    const onUp = (ev)=> finish(ev, false);
    const onCancel = (ev)=> finish(ev, true);

    // Long-Press zum Starten (200ms angenehm auf Mobile)
    longPressTO = setTimeout(()=> start(e), 200);

    window.addEventListener('pointermove', onMove, {passive:false});
    window.addEventListener('pointerup', onUp, {passive:false});
    window.addEventListener('pointercancel', onCancel, {passive:false});
  });

  // ---- Listen (links in der Sidebar) ----
  listsNav?.addEventListener('pointerdown', (e)=>{
    const handle = e.target.closest('.drag-handle.list');
    const row = e.target.closest('.list-row');
    if (!handle || !row) return;
    if (e.pointerType === 'mouse') return; // Desktop → native

    const listBtn = row.querySelector('.list-btn');
    const listId = listBtn?.dataset.id;
    if (!listId) return;

    let longPressTO;
    let active = false;
    let ghost = null;

    const start = (pt)=>{
      active = true;
      document.body.classList.add('dragging-touch');

      // Ghost
      const rect = row.getBoundingClientRect();
      ghost = row.cloneNode(true);
      ghost.classList.add('drag-ghost');
      ghost.style.width = rect.width + 'px';
      ghost.style.height = rect.height + 'px';
      positionGhost(pt.clientX, pt.clientY);
      document.body.appendChild(ghost);

      row.classList.add('dragging');
    };

    const positionGhost = (x, y)=>{
      if (!ghost) return;
      ghost.style.left = x + 'px';
      ghost.style.top  = y + 'px';
    };

    const move = (pt)=>{
      if (!active) return;
      positionGhost(pt.clientX, pt.clientY);
      const after = getDragAfterElement(listsNav, pt.clientY, ".list-row:not(.dragging)");
      if (after == null) listsNav.appendChild(listDropMarker);
      else listsNav.insertBefore(listDropMarker, after);
    };

    const finish = (pt, cancelled=false)=>{
      clearTimeout(longPressTO);
      window.removeEventListener('pointermove', onMove, {passive:false});
      window.removeEventListener('pointerup', onUp, {passive:false});
      window.removeEventListener('pointercancel', onCancel, {passive:false});

      if (!active) return;

      active = false;
      document.body.classList.remove('dragging-touch');
      row.classList.remove('dragging');
      ghost?.remove();
      ghost = null;

      if (cancelled){
        clearListDropMarker();
        return;
      }

      let toIndex = getListRowDropIndex(listsNav, listDropMarker);
      if (toIndex < 0) toIndex = state.lists.length;
      clearListDropMarker();

      reorderList(listId, toIndex);
    };

    const onMove = (ev)=>{
      if (!active && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) > 6){
        clearTimeout(longPressTO);
        start(ev);
      }
      if (active){
        ev.preventDefault();
        move(ev);
      }
    };
    const onUp = (ev)=> finish(ev, false);
    const onCancel = (ev)=> finish(ev, true);

    longPressTO = setTimeout(()=> start(e), 200);

    window.addEventListener('pointermove', onMove, {passive:false});
    window.addEventListener('pointerup', onUp, {passive:false});
    window.addEventListener('pointercancel', onCancel, {passive:false});
  });

})();

const listDropMarker = document.createElement("div"); listDropMarker.className = "list-drop-marker";
function clearListDropMarker(){ if (listDropMarker.parentElement) listDropMarker.parentElement.removeChild(listDropMarker); }

listsNav.addEventListener("dragover", (e)=>{
  if (dragState?.type !== "list") return;
  e.preventDefault();
  const after = getDragAfterElement(listsNav, e.clientY, ".list-row:not(.dragging)");
  if (after == null) listsNav.appendChild(listDropMarker);
  else listsNav.insertBefore(listDropMarker, after);
});
listsNav.addEventListener("dragleave", (e)=>{
  const rel = e.relatedTarget || null;
  if (!rel || !listsNav.contains(rel)) clearListDropMarker();
});
listsNav.addEventListener("drop", (e)=>{
  if (dragState?.type !== "list") return;
  e.preventDefault();
  let targetIndex = getListRowDropIndex(listsNav, listDropMarker);
  if (targetIndex < 0) targetIndex = state.lists.length;
  clearListDropMarker();
  reorderList(dragState.listId, targetIndex);
  endDrag();
});

function getListRowDropIndex(container, marker){
  if (!marker.parentElement) return -1;
  const children = [...container.children];
  return children.indexOf(marker);
}

function reorderList(listId, toIndex){
  const i = state.lists.findIndex(l => l.id === listId);
  if (i < 0) return;
  const [moved] = state.lists.splice(i, 1);
  if (toIndex == null || toIndex > state.lists.length) toIndex = state.lists.length;
  state.lists.splice(toIndex, 0, moved);
  saveState();
  renderLists();
}

// ===== Modal: Items =====
let editItemRef = null;
let formPrio = "med";

function setPrioUI(p){
  formPrio = p;
  const btns = [...document.querySelectorAll("#prioSegment .seg-btn")];
  btns.forEach(b => b.classList.toggle("active", b.dataset.prio === p));

  // Animation auf dem gewählten Button (remove -> reflow -> add)
  const active = btns.find(b => b.dataset.prio === p);
  if (active){
    active.classList.remove("anim-prio");
    // Reflow erzwingen, damit die Animation jedes Mal erneut startet
    void active.offsetWidth;
    active.classList.add("anim-prio");
    active.addEventListener("animationend", () => active.classList.remove("anim-prio"), { once:true });
  }
}

// ===== Modal: Archiv leeren =====
const clearArchiveModal   = document.getElementById('clearArchiveModal');
const clearArchiveCancel  = document.getElementById('clearArchiveCancel');
const clearArchiveConfirm = document.getElementById('clearArchiveConfirm');

// Top-Button (neben "Neuer Eintrag") auch mit dem Modal verbinden
const clearArchiveTopBtn = document.getElementById('clearArchiveBtn');
if (clearArchiveTopBtn && !clearArchiveTopBtn._wired) {
  clearArchiveTopBtn.addEventListener('click', openClearArchiveModal);
  clearArchiveTopBtn._wired = true;
}


function openClearArchiveModal(){
  if (!clearArchiveModal) return;
  openModal(clearArchiveModal);
}
function closeClearArchiveModal(){
  if (!clearArchiveModal) return;
  closeModal(clearArchiveModal);
}

// Buttons verdrahten
if (clearArchiveCancel)  clearArchiveCancel.addEventListener('click', closeClearArchiveModal);
if (clearArchiveConfirm) clearArchiveConfirm.addEventListener('click', () => {
  const arch = getArchiveList(); // existiert bereits in deinem Code
  if (arch) {
    arch.items.length = 0;   // alles raus
    saveState();
    renderItems();
  }
  closeClearArchiveModal();

  // Toast mit Progressbar (auto-close + X)
  // showToast ist bereits vorhanden und animiert die Progressbar linear
  showToast({
    title: 'Archiv geleert',
    subtitle: 'Alle Einträge wurden entfernt.',
    duration: 4500,
    accentColor: '#ef4444'
  });
});


function openItemModal(mode="create", item=null){
  editItemRef = null;
  itemForm.reset();
  if (mode === "edit" && item){
    modalTitle.textContent = "Eintrag bearbeiten";
    fTitle.value = item.title || "";
    fDate.value = item.dueDate || "";
    fTime.value = item.dueTime || "";
    fNotes.value = item.notes || "";
    setPrioUI(item.priority || "med");
    editItemRef = item;
  } else {
    modalTitle.textContent = "Neuer Eintrag";
    setPrioUI("med");
    // Defaults/Übernahme Repeat
if (mode === "edit" && item){
  if (fRepeat)      fRepeat.value      = item.repeat      || "none";
  if (fRepeatEnd)   fRepeatEnd.value   = item.repeatEnd   || "never";
  if (fRepeatCount) fRepeatCount.value = item.repeatCount ?? "";
  if (fRepeatUntil) fRepeatUntil.value = item.repeatUntil || "";
} else {
  if (fRepeat)      fRepeat.value      = "none";
  if (fRepeatEnd)   fRepeatEnd.value   = "never";
  if (fRepeatCount) fRepeatCount.value = "";
  if (fRepeatUntil) fRepeatUntil.value = "";
}
updateRepeatUI();

  }
  openModal(modal);
  // Fokus direkt in den Titel setzen (Cursor ans Ende)
requestAnimationFrame(() => {
  if (fTitle) {
    fTitle.focus();
    const v = fTitle.value || "";
    try { fTitle.setSelectionRange(v.length, v.length); } catch (_) {}
  }
});

}
function closeItemModal(){ closeModal(modal); }
if (cancelBtn) cancelBtn.addEventListener("click", closeItemModal);

if (prioSegment) prioSegment.addEventListener("click", (e)=>{
  const b = e.target.closest(".seg-btn");
  if (!b) return;
  setPrioUI(b.dataset.prio);
});

function saveItemFromForm(){
  const list = getSelectedList();
  if (!list){ alert("Bitte zuerst links eine Liste anlegen oder auswählen."); return; }

  const title = (fTitle.value || "").trim();
  if (!title){ fTitle.focus(); return; }

  const repeat      = fRepeat?.value || "none";
const repeatEnd   = fRepeatEnd?.value || "never";
const repeatCount = fRepeatCount?.value ? Math.max(1, parseInt(fRepeatCount.value, 10)) : null;
const repeatUntil = fRepeatUntil?.value || "";

// bei "none" alles neutralisieren
const normRepeatEnd   = (repeat === "none") ? "never" : repeatEnd;
const normRepeatCount = (repeat === "none" || normRepeatEnd !== "after") ? null : repeatCount;
const normRepeatUntil = (repeat === "none" || normRepeatEnd !== "until") ? ""   : repeatUntil;

const payload = {
  title,
  notes: (fNotes.value || "").trim(),
  dueDate: fDate.value || "",
  dueTime: fTime.value || "",
  priority: formPrio || "med",
  // NEU: Wiederholung
  repeat: repeat,
  repeatEnd: normRepeatEnd,         // "never" | "after" | "until"
  repeatCount: normRepeatCount,     // Zahl oder null
  repeatUntil: normRepeatUntil,     // ISO-Date oder ""
  repeatLeft: (normRepeatEnd === "after" && normRepeatCount != null) ? normRepeatCount : null
};


  if (editItemRef){
    Object.assign(editItemRef, payload);
    lastAnimItemId = editItemRef.id;
  } else {
    const newId = uid();
    list.items.unshift({ id:newId, done:false, createdAt: Date.now(), ...payload });
    lastAnimItemId = newId;
  }
  saveState();
  closeItemModal();
  renderItems();
}
if (saveItemBtn) saveItemBtn.addEventListener("click", saveItemFromForm);
if (itemForm) itemForm.addEventListener("keydown", (e)=>{
  if (e.key === "Enter" && e.target.tagName !== "TEXTAREA"){
    e.preventDefault();
    saveItemFromForm();
  }
});

// === Mobile: Filter-Dropdown ===
const filtersToggleBtn = document.getElementById('filtersToggleBtn');
if (filtersToggleBtn && !filtersToggleBtn._wired){
  filtersToggleBtn.addEventListener('click', (e)=>{
    e.preventDefault();
    const panel = document.querySelector('.filters');
    if (!panel) return;

    const isOpen = panel.classList.contains('open');

    // ARIA für Screenreader
    filtersToggleBtn.setAttribute('aria-expanded', String(!isOpen));

    // „auto height“ Transition Trick:
    // 1) aktuelle Höhe messen
    const startH = panel.scrollHeight;

    if (!isOpen){
      // Öffnen:
      // Erst temporär öffnen, um die Zielhöhe zu erhalten
      panel.classList.add('open');
      // kurz warten bis Layout berechnet ist
      requestAnimationFrame(()=>{
        const targetH = panel.scrollHeight;
        // zurück auf 0 und dann animiert auf targetH
        panel.style.maxHeight = '0px';
        requestAnimationFrame(()=>{
          panel.style.maxHeight = targetH + 'px';
        });
      });

      // nach Ende aufräumen
      panel.addEventListener('transitionend', function onEnd(ev){
        if (ev.propertyName === 'max-height'){
          panel.style.maxHeight = ''; // zurück auf CSS (flexibel bei Inhalt)
          panel.removeEventListener('transitionend', onEnd);
        }
      });
    } else {
      // Schließen:
      const targetH = panel.scrollHeight;      // aktuelle offene Höhe
      panel.style.maxHeight = targetH + 'px';  // fixieren
      requestAnimationFrame(()=>{
        panel.style.maxHeight = '0px';         // animiert zu
        panel.classList.remove('open');
      });

      panel.addEventListener('transitionend', function onEnd(ev){
        if (ev.propertyName === 'max-height'){
          panel.style.maxHeight = '';
          panel.removeEventListener('transitionend', onEnd);
        }
      });
    }
  });

  // Initial-ARIA
  filtersToggleBtn.setAttribute('aria-controls', 'filtersPanel');
  filtersToggleBtn.setAttribute('aria-expanded', 'false');
  filtersToggleBtn._wired = true;
}

// Gib dem Panel optional eine ID für aria-controls:
const filtersPanelEl = document.querySelector('.filters');
if (filtersPanelEl && !filtersPanelEl.id){
  filtersPanelEl.id = 'filtersPanel';
}




// Optional: bei Klick außerhalb das Panel schließen
document.addEventListener('click', (e)=>{
  const panel = document.querySelector('.filters');
  if (!panel || !panel.classList.contains('open')) return;
  const insideBtn = e.target.closest?.('#filtersToggleBtn');
  const insidePanel = e.target.closest?.('.filters');
  if (!insideBtn && !insidePanel) panel.classList.remove('open');
});

// ===== Settings (Topbar & Drawer) =====
function showSettingsModal(){
  if (opacityRange) { opacityRange.value = String(prefs.glassAlphaStrong.toFixed(2)); opacityValue.textContent = prefs.glassAlphaStrong.toFixed(2); }
  if (cardOpacityRange) { cardOpacityRange.value = String(prefs.cardAlpha.toFixed(2)); cardOpacityValue.textContent = prefs.cardAlpha.toFixed(2); }
  markActiveTheme(prefs.theme);
  markActiveMode(prefs.mode);
  openModal(settingsModal);
}

if (openSettingsBtn) openSettingsBtn.addEventListener("click", (e)=>{ e.preventDefault(); closeDrawer(); setTimeout(showSettingsModal, 200); });
if (openSettingsTop) openSettingsTop.addEventListener("click", (e)=>{ e.preventDefault(); showSettingsModal(); });

if (settingsCancel) settingsCancel.addEventListener("click", (e)=>{ e.preventDefault(); closeModal(settingsModal); });
if (settingsForm) settingsForm.addEventListener("submit", (e)=>{ e.preventDefault(); savePrefs(); closeModal(settingsModal); });

if (opacityRange) opacityRange.addEventListener("input", ()=>{
  const v = Number(opacityRange.value);
  opacityValue.textContent = v.toFixed(2);
  prefs.glassAlphaStrong = clamp(v, .3, .95);
  applyPrefs();
});
if (cardOpacityRange) cardOpacityRange.addEventListener("input", ()=>{
  const v = Number(cardOpacityRange.value);
  cardOpacityValue.textContent = v.toFixed(2);
  prefs.cardAlpha = clamp(v, .3, .98);
  applyPrefs();
});
if (themeGrid) themeGrid.addEventListener("click", (e)=>{
  const btn = e.target.closest(".theme-swatch");
  if (!btn) return;
  const t = btn.dataset.theme;
  if (!THEME_MAP[t]) return;
  prefs.theme = t;
  applyPrefs();
});
// === Darstellung umschalten (light|dark|galaxy) ===
if (modeSegment) modeSegment.addEventListener("click", (e)=>{
  const b = e.target.closest(".seg-btn");
  if (!b) return;
  const m = b.dataset.mode;
  if (!["light","dark","galaxy"].includes(m)) return;
  prefs.mode = m;
  applyPrefs();
});


// Settings-UI utils
function markActiveTheme(key){
  [...document.querySelectorAll(".theme-swatch")].forEach(el=>{
    el.classList.toggle("selected", el.dataset.theme === key);
    const theme = THEME_MAP[el.dataset.theme];
    const dot = el.querySelector("span");
    if (dot && theme) dot.style.background = `linear-gradient(135deg, ${theme.accent2}, ${theme.accent})`;
  });
}
function markActiveMode(){
  const buttons = modeSegment?.querySelectorAll(".seg-btn") || [];
  buttons.forEach(b=>{
    const active = b.getAttribute("data-mode") === prefs.mode;
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

// ===== Modal infra (shared) =====
function openModal(m){
  if (!m) return;
  m.classList.remove("closing");
  m.classList.add("open");
  m.setAttribute("aria-hidden","false");
}

function closeModal(m){
  if (!m || !m.classList.contains("open")) return;

  // in "closing" wechseln, damit CSS-Out-Animation läuft
  m.classList.add("closing");
  m.classList.remove("open");

  const dlg = m.querySelector(".modal-dialog");
  const done = () => {
    m.classList.remove("closing");
    m.setAttribute("aria-hidden","true");
    dlg?.removeEventListener("animationend", done);
  };

  // Auf das Ende der Out-Animation warten (Fallback-Timeout, falls kein Event feuert)
  if (dlg){
    dlg.addEventListener("animationend", done, { once:true });
  } else {
    setTimeout(done, 200);
  }
}

document.addEventListener("click", (e)=>{
  if (e.target.classList?.contains("modal-backdrop")){
    const m = e.target.parentElement; if (m) closeModal(m);
  }
});
document.addEventListener("keydown", (e)=>{
  if (e.key === "Escape"){
    if (settingsModal?.classList.contains("open")) closeModal(settingsModal);
    if (modal?.classList.contains("open")) closeModal(modal);
  }
});

// Initialwerte setzen, wenn Modal geöffnet wird
function hydrateLayoutControls(){
  if (cardScaleRange){
    cardScaleRange.value = String(prefs.ui.cardScale.toFixed(2));
    if (cardScaleValue) cardScaleValue.textContent = prefs.ui.cardScale.toFixed(2);
  }
  if (sideWidthRange){
    sideWidthRange.value = String(prefs.ui.sideW);
    if (sideWidthValue) sideWidthValue.textContent = prefs.ui.sideW + "px";
  }
}
if (openSettingsBtn) openSettingsBtn.addEventListener("click", ()=> setTimeout(hydrateLayoutControls, 10));
if (openSettingsTop) openSettingsTop.addEventListener("click", ()=> setTimeout(hydrateLayoutControls, 10));

if (cardScaleRange) cardScaleRange.addEventListener("input", ()=>{
  const v = clamp(Number(cardScaleRange.value), 0.85, 1.35);
  prefs.ui.cardScale = v;
  if (cardScaleValue) cardScaleValue.textContent = v.toFixed(2);
  applyPrefs(); savePrefs();
});
if (sideWidthRange) sideWidthRange.addEventListener("input", ()=>{
  const v = clamp(Number(sideWidthRange.value), 220, 520);
  prefs.ui.sideW = v;
  if (sideWidthValue) sideWidthValue.textContent = v + "px";
  applyPrefs(); savePrefs();
});


// ===== List actions =====
let _renameTarget = null; // aktuell zu benennende Liste

function renameList(list){
  _renameTarget = list;
  const m = document.getElementById("renameModal");
  const inp = document.getElementById("renameInput");
  const form = document.getElementById("renameForm");
  if (!m || !inp || !form) return;

  // Titel/Value setzen
  inp.value = list.name || "";
  openModal(m);

  // Fokus + Cursor ans Ende
  requestAnimationFrame(() => {
    inp.focus();
    try {
      const v = inp.value || "";
      inp.setSelectionRange(v.length, v.length);
    } catch(_) {}
  });
}

// Event-Wiring für das Rename-Modal (einmalig)
(function wireRenameModal(){
  const m = document.getElementById("renameModal");
  const form = document.getElementById("renameForm");
  const inp = document.getElementById("renameInput");
  const cancelBtn = document.getElementById("renameCancel");

  if (!m || !form || !inp || form._wired) return;
  form._wired = true;

  // Bestätigen (Submit)
  form.addEventListener("submit", (e)=>{
    e.preventDefault();
    const name = (inp.value || "").trim();
    if (_renameTarget && name){
      _renameTarget.name = name;
      saveState();
      renderLists();
    }
    closeModal(m);
    _renameTarget = null;
  });

  // Abbrechen
  cancelBtn?.addEventListener("click", ()=> {
    closeModal(m);
    _renameTarget = null;
  });

  // ESC schließt bereits global via closeModal-Handler
})();


// ===== UI Events =====
if (addListBtn) addListBtn.addEventListener("click", ()=>{
  const newList = { id: uid(), name: "Neue Liste", items: [] };
  state.lists.push(newList);
  state.selectedListId = newList.id;
  saveState();
  renderLists(); // nur Listen neu zeichnen, damit wir das Element gleich finden
  startInlineRename(newList.id); // direkt in Inline-Edit springen
  renderItems(); // Items-Panel passend zur neuen Auswahl
});


if (addItemBtn) addItemBtn.addEventListener("click", ()=>{
  if (!getSelectedList()){ alert("Bitte zuerst links eine Liste anlegen oder auswählen."); return; }
  if (isMobile()){
    openQuickAddSheet();
  } else {
    openItemModal("create");
  }
});


// Suche & Filter triggern Re-Render
[searchInput, sortBy, statusFilter, dueFilter, prioFilter].forEach(el => {
  if (!el) return;
  const ev = el.tagName === "INPUT" ? "input" : "change";
  el.addEventListener(ev, ()=>{
    updateFilterActiveStates();
    renderItems();
  });
});


/* ===== Fancy Select: hübsche Listboxen für Filter ===== */
function initFancySelect(selectEl, options){
  if (!selectEl) return null;

  const wrap = document.createElement("div");
  wrap.className = "fs";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "fs-btn pressable";
  btn.innerHTML = `<span class="fs-label"></span>
    <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`;
  const menu = document.createElement("ul");
  menu.className = "fs-menu"; menu.setAttribute("role","listbox");

  options.forEach(o=>{
    const li = document.createElement("li");
    li.textContent = o.label; li.dataset.value = o.value; li.tabIndex = 0;
    menu.appendChild(li);
  });

  const parent = selectEl.parentNode;
  parent.insertBefore(wrap, selectEl);
  wrap.appendChild(btn);
  wrap.appendChild(menu);
  wrap.appendChild(selectEl);
  selectEl.classList.add("visually-hidden");

  function updateLabel(){
    const curr = options.find(o=>o.value===selectEl.value) || options[0];
    wrap.querySelector(".fs-label").textContent = curr.label;
    [...menu.children].forEach(li => li.classList.toggle("selected", li.dataset.value === selectEl.value));
  }
  function open(){ wrap.classList.add("open"); }
  function close(){ wrap.classList.remove("open"); }
  function setValue(val){
    if (selectEl.value === val) { close(); return; }
    selectEl.value = val;
    selectEl.dispatchEvent(new Event("change", { bubbles:true }));
    updateLabel(); close();
  }

  btn.addEventListener("click", ()=> wrap.classList.toggle("open"));
  menu.addEventListener("click", (e)=>{
    const li = e.target.closest("li"); if (!li) return;
    setValue(li.dataset.value);
  });
  document.addEventListener("click", (e)=>{ if (!wrap.contains(e.target)) close(); });

  btn.addEventListener("keydown", (e)=>{
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " "){
      e.preventDefault(); open();
      (menu.querySelector(".selected") || menu.firstElementChild)?.focus();
    }
  });
  menu.addEventListener("keydown", (e)=>{
    const items = [...menu.children];
    let idx = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown"){ e.preventDefault(); items[Math.min(idx+1, items.length-1)].focus(); }
    else if (e.key === "ArrowUp"){ e.preventDefault(); items[Math.max(idx-1, 0)].focus(); }
    else if (e.key === "Enter"){ e.preventDefault(); const val = document.activeElement?.dataset.value; if (val) setValue(val); }
    else if (e.key === "Escape"){ e.preventDefault(); close(); btn.focus(); }
  });

  updateLabel();
  return { update: updateLabel, open, close, wrap };
  
}
initFancySelect(sortBy, [
  { value:"none",   label:"Sortierung: Aus" }, // NEU
  { value:"due",    label:"Fälligkeit" },
  { value:"status", label:"Status" },
  { value:"prio",   label:"Priorität" },
  { value:"title",  label:"A–Z (Titel)" },
]);

initFancySelect(statusFilter, [
  { value:"all",   label:"Status: Alle" },
  { value:"open",  label:"Nur offen" },
  { value:"done",  label:"Nur erledigt" },
]);
initFancySelect(dueFilter, [
  { value:"all",     label:"Fälligkeit: Alle" },
  { value:"today",   label:"Heute" },
  { value:"overdue", label:"Überfällig" },
]);
initFancySelect(prioFilter, [
  { value:"all",  label:"Priorität: Alle" },
  { value:"low",  label:"Niedrig" },
  { value:"med",  label:"Mittel" },
  { value:"high", label:"Dringend" },
]);

// …nach initFancySelect(...) Aufrufen:
updateFilterActiveStates();

// dann wie gehabt:
applyPrefs();
render();


function updateFilterActiveStates(){
  const mark = (el, active) => {
    if (!el) return;
    const wrap = el.closest?.(".fs") || el.parentElement;
    if (wrap) wrap.classList.toggle("active", !!active);
  };

  // "all" = Standard → nicht aktiv
  mark(statusFilter, statusFilter && statusFilter.value !== "all");
  mark(dueFilter,    dueFilter    && dueFilter.value    !== "all");
  mark(prioFilter,   prioFilter   && prioFilter.value   !== "all");

  if (searchInput){
    const on = !!searchInput.value.trim();
    searchInput.classList.toggle("is-active", on);
  }
}


// ===== First run =====
if (!Array.isArray(state.lists) || state.lists.length === 0){
  const demo = { id: uid(), name: "Liste 1", items: [] };
  state.lists = [demo];
  state.selectedListId = demo.id;
  saveState();
} else {
  // Falls selectedListId fehlt/ungültig, erste Liste wählen
  if (!state.selectedListId || !getSelectedList()){
    state.selectedListId = state.lists[0].id;
    saveState();
  }
}

// ==== Notebook-Öffnungspräferenz ====
// Standard: gleicher Tab (false) – falls noch nicht vorhanden
if (typeof prefs.openNotebookInNewTab !== "boolean"){
  prefs.openNotebookInNewTab = false;
  savePrefs && savePrefs();
}

// Sidebar-Button → Notizbuch öffnen
const openNotebookBtn = q("#openNotebookBtn");
if (openNotebookBtn){
  openNotebookBtn.addEventListener("click", ()=>{
    const target = prefs.openNotebookInNewTab ? "_blank" : "_self";
    window.open("notebook.html", target);
  });
}

// Einstellungen-UI für Öffnungsmodus
const openNotebookSegment = q("#openNotebookSegment");
function markOpenNotebookMode(){
  if (!openNotebookSegment) return;
  [...openNotebookSegment.querySelectorAll(".seg-btn")].forEach(b=>{
    const active = (prefs.openNotebookInNewTab && b.dataset.open==="new")
                || (!prefs.openNotebookInNewTab && b.dataset.open==="same");
    b.classList.toggle("active", active);
  });
}
if (openNotebookSegment){
  openNotebookSegment.addEventListener("click", (e)=>{
    const b = e.target.closest(".seg-btn"); if (!b) return;
    prefs.openNotebookInNewTab = (b.dataset.open === "new");
    markOpenNotebookMode();
    savePrefs && savePrefs();
  });

  // Wenn Settings geöffnet werden, UI hydrieren
  if (typeof openSettingsBtn !== "undefined" && openSettingsBtn){
    openSettingsBtn.addEventListener("click", ()=> setTimeout(markOpenNotebookMode, 10));
  }
  if (typeof openSettingsTop !== "undefined" && openSettingsTop){
    openSettingsTop.addEventListener("click", ()=> setTimeout(markOpenNotebookMode, 10));
  }
}


// Apply prefs + initial render

applyPrefs();

render();
