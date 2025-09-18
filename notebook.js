// ===== Helpers & Shared Prefs =====
function q(sel, root=document){ return root.querySelector(sel); }
function loadJSON(key){ try{ return JSON.parse(localStorage.getItem(key)); }catch{ return null; } }
function saveJSON(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function isNum(n){ return typeof n === "number" && !isNaN(n); }
function setCSS(name,val){ document.documentElement.style.setProperty(name, val); }
const uid = () => Math.random().toString(36).slice(2, 10);

const PREFS_KEY   = "bucketPrefs_v2";   // vorhandene Prefs wiederverwenden
const NOTEBOOK_KEY = "notebookData_v1"; // eigener Namespace
const BUCKET_STORAGE_KEY = "bucketData_v5";

const THEME_MAP = {
  blue:{accent:"#22b0ff",accent2:"#7c4dff"}, pink:{accent:"#ff7ab8",accent2:"#ff4d97"},
  yellow:{accent:"#ffd33d",accent2:"#ffb302"}, red:{accent:"#ff6b6b",accent2:"#ff3b3b"},
  green:{accent:"#2ecc71",accent2:"#00c853"}, teal:{accent:"#2ad4c9",accent2:"#00bfa5"},
  orange:{accent:"#ff9f43",accent2:"#ff7f11"}, violet:{accent:"#8b5cf6",accent2:"#7c3aed"},
  indigo:{accent:"#6366f1",accent2:"#4338ca"}, lavender:{accent:"#c4b5fd",accent2:"#a78bfa"},
  mint:{accent:"#10b981",accent2:"#34d399"}, lime:{accent:"#84cc16",accent2:"#22c55e"},
  amber:{accent:"#f59e0b",accent2:"#fbbf24"}, copper:{accent:"#b45309",accent2:"#f59e0b"},
  coral:{accent:"#fb7185",accent2:"#f43f5e"}, fuchsia:{accent:"#d946ef",accent2:"#a21caf"},
  ocean:{accent:"#06b6d4",accent2:"#3b82f6"}, forest:{accent:"#16a34a",accent2:"#065f46"},
  slate:{accent:"#64748b",accent2:"#94a3b8"},
};

// --- Farbstreifen-Palette für Seiten + Helper ---
const PAGE_COLORS = [
  "#22b0ff","#7c4dff","#ffd33d","#ff6b6b","#2ecc71",
  "#06b6d4","#f59e0b","#d946ef","#16a34a","#94a3b8"
];
const pickPageColor = () => PAGE_COLORS[Math.floor(Math.random()*PAGE_COLORS.length)];


const storedPrefs = loadJSON(PREFS_KEY) || {};
const prefs = {
  theme: THEME_MAP[storedPrefs.theme] ? storedPrefs.theme : "blue",
  glassAlphaStrong: isNum(storedPrefs.glassAlphaStrong) ? clamp(storedPrefs.glassAlphaStrong, .3, .95) : 0.75,
  cardAlpha: isNum(storedPrefs.cardAlpha) ? clamp(storedPrefs.cardAlpha, .3, .98) : 0.82,
  mode: (storedPrefs.mode === "light" || storedPrefs.mode === "dark") ? storedPrefs.mode : "dark",
  bg: (["zurich","geneva","luzern","lugano","zug"].includes(storedPrefs.bg) ? storedPrefs.bg : "zurich"),
  ui: {
  cardScale: isNum(storedPrefs.ui?.cardScale) ? clamp(storedPrefs.ui.cardScale, 0.85, 1.35) : 1,
  // NEU: Notebook-eigene Sidebarbreite (unabhängig von Bucket)
  nbSideW: isNum(storedPrefs.ui?.nbSideW)
              ? clamp(storedPrefs.ui.nbSideW, 360, 700)
              // Fallback: falls du in alten Prefs schon "sideW" hattest, einmalig übernehmen
              : (isNum(storedPrefs.ui?.sideW) ? clamp(storedPrefs.ui.sideW, 360, 700) : 520)
  }
};

function savePrefs(){
  const base = loadJSON(PREFS_KEY) || {};
  // UI-Teil sanft mergen: alles behalten, nur nbSideW aktualisieren
  const mergedUI = { ...(base.ui || {}), ...(prefs.ui || {}) };
  saveJSON(PREFS_KEY, { ...base, ...prefs, ui: mergedUI });
}

function applyPrefs(){
  const t = THEME_MAP[prefs.theme] || THEME_MAP.blue;
  setCSS("--accent", t.accent); setCSS("--accent-2", t.accent2);
  const strong = prefs.glassAlphaStrong;
  setCSS("--glass-strong-alpha", strong);
  setCSS("--glass-alpha", clamp(strong - 0.17, .2, .95));
  setCSS("--card-alpha", prefs.cardAlpha);
  setCSS("--sidebar-w", (prefs.ui?.nbSideW || 280) + "px");
  setCSS("--card-scale", prefs.ui?.cardScale || 1);
  setCSS("--bg-url", `url("background/${prefs.bg}.png")`);
  document.documentElement.setAttribute("data-theme", prefs.mode);

  // Settingsfelder hydrieren (falls geöffnet)
  q("#opacityRange") && (q("#opacityRange").value = String(strong.toFixed(2)));
  q("#opacityValue") && (q("#opacityValue").textContent = strong.toFixed(2));
  q("#cardOpacityRange") && (q("#cardOpacityRange").value = String(prefs.cardAlpha.toFixed(2)));
  q("#cardOpacityValue") && (q("#cardOpacityValue").textContent = prefs.cardAlpha.toFixed(2));
  markActiveTheme(prefs.theme);
  markActiveMode(prefs.mode);

    // Sidebar-Breite ins Modal/HUD spiegeln
const sw = String(prefs.ui?.nbSideW || 520);
q("#sidebarWidthRange") && (q("#sidebarWidthRange").value = sw);
q("#sidebarWidthValue") && (q("#sidebarWidthValue").textContent = `${sw} px`);

}
function markActiveTheme(key){
  [...document.querySelectorAll(".theme-swatch")].forEach(el=>{
    el.classList.toggle("selected", el.dataset.theme === key);
    const theme = THEME_MAP[el.dataset.theme];
    const dot = el.querySelector("span");
    if (dot && theme) dot.style.background = `linear-gradient(135deg, ${theme.accent2}, ${theme.accent})`;
  });
}
function markActiveMode(mode){
  [...document.querySelectorAll(".seg-btn")].forEach(b=> b.classList.toggle("active", b.dataset.mode === mode));
}

// ===== Notebook-State =====
function normalize(data){
  const src = (data && typeof data === "object") ? data : {};
  const notebooks = Array.isArray(src.notebooks) ? src.notebooks : [];
  const norm = notebooks.map(nb=>({
    id: String(nb.id || uid()),
    title: String(nb.title || "Neues Notizbuch"),
    open: !!nb.open,
    sections: (Array.isArray(nb.sections) ? nb.sections : []).map(sec=>({
      id: String(sec.id || uid()),
      title: String(sec.title || "Neuer Abschnitt"),
      pages: (Array.isArray(sec.pages) ? sec.pages : []).map(pg=>({
        id: String(pg.id || uid()),
        title: String(pg.title || "Neue Seite"),
        content: String(pg.content || ""),
        createdAt: Number(pg.createdAt || Date.now()),
        updatedAt: Number(pg.updatedAt || Date.now()),
        color: String(pg.color || "") // <— NEU
      }))
    }))
  }));
  const selected = { notebookId:null, sectionId:null, pageId:null };
  selected.notebookId = norm[0]?.id || null;
  selected.sectionId  = norm[0]?.sections[0]?.id || null;
  selected.pageId     = norm[0]?.sections[0]?.pages[0]?.id || null;
  return { notebooks: norm, selected };
}
let state = normalize(loadJSON(NOTEBOOK_KEY));
// Backfill: fehlende Farben einmalig vergeben
(function ensurePageColors(){
  let needsSave = false;
  state.notebooks.forEach(nb =>
    nb.sections.forEach(sec =>
      sec.pages.forEach(pg => {
        if (!pg.color) { pg.color = pickPageColor(); needsSave = true; }
      })
    )
  );
  if (needsSave) saveState();
})();


// First-run Seed
if (!state.notebooks.length){
  const nbId = uid(), secId = uid(), pageId = uid();
  state = {
    notebooks: [{
      id: nbId, title: "Mein Notizbuch", open: true,
      sections: [{ id: secId, title: "Allgemein", pages: [{ id: pageId, title: "Willkommen", content: "Deine erste Notiz!", createdAt: Date.now(), updatedAt: Date.now() }] }]
    }],
    selected: { notebookId: nbId, sectionId: secId, pageId: pageId }
  };
  saveJSON(NOTEBOOK_KEY, state);
}
function saveState(){ saveJSON(NOTEBOOK_KEY, state); }

// ===== Elements =====
const nbTree       = q("#nbTree");
const pageList     = q("#pageList");
const pageTitle    = q("#pageTitle");
const pageContent  = q("#pageContent");
const emptyState   = q("#emptyState");
const pageDate     = q("#pageDate");
const editorSheet  = q(".editor-sheet");
const addPageBtnSimple = q("#addPageBtnSimple");



// Ribbon / Toolbar
const editorRibbon = q("#editorRibbon");
const ffSelect     = q("#ffSelect");
const btnBold      = q("#btnBold");
const btnItalic    = q("#btnItalic");
const btnUnderline = q("#btnUnderline");
const fsSelect     = q("#fsSelect");


// Delete-Confirm Modal
const nbDeleteModal   = q("#nbDeleteModal");
const nbDeleteTitle   = q("#nbDeleteTitle");
const nbDeleteMsg     = q("#nbDeleteMsg");
const nbDeleteNeverAsk= q("#nbDeleteNeverAsk");
const nbDeleteCancel  = q("#nbDeleteCancel");
const nbDeleteOk      = q("#nbDeleteOk");

// Confirm + Status Modals
const nbConfirmModal  = q("#nbConfirmModal");
const nbConfirmOk     = q("#nbConfirmOk");
const nbConfirmCancel = q("#nbConfirmCancel");

const nbStatusModal   = q("#nbStatusModal");
const nbStatusTitle   = q("#nbStatusTitle");
const nbStatusSubtitle= q("#nbStatusSubtitle");
const nbStatusOk      = q("#nbStatusOk");

// Topbar-Buttons + Modal + Restore-Input
const nbBackupBtn    = q("#nbBackupBtn");
const nbRestoreBtn   = q("#nbRestoreBtn");
const nbBackupModal  = q("#nbBackupModal");
const nbBackupForm   = q("#nbBackupForm");
const nbBackupCancel = q("#nbBackupCancel");
const nbBackupSegment= q("#nbBackupSegment");
const nbRestoreInput = q("#nbRestoreInput");


// History-Modal
const historyModal = q("#historyModal");
const historyList  = q("#historyList");
const historyClose = q("#historyClose");


const nbTitleInput = q("#nbTitleInput");
const addNotebookBtn = q("#addNotebookBtn");
const addSectionBtn = q("#addSectionBtn");

// ===== Drag & Drop (global) =====
let dragState = null; // { type:"nb"|"sec"|"page", nbId?, secId?, pageId?, fromSecId? }
const listDropMarker = document.createElement("div");
listDropMarker.className = "list-drop-marker";

function startDrag(state, dt){
  dragState = state;
  try { dt.setData("text/plain", "drag"); } catch {}
  dt.effectAllowed = "move";
}
function endDrag(){
  dragState = null;
  if (listDropMarker.parentElement) listDropMarker.parentElement.removeChild(listDropMarker);
}

function getDragAfterElement(container, y, selector){
  const els = [...container.querySelectorAll(selector)];
  let closest = { offset: Number.NEGATIVE_INFINITY, element: null };
  for (const el of els){
    const box = el.getBoundingClientRect();
    const offset = y - (box.top + box.height/2);
    if (offset < 0 && offset > closest.offset) closest = { offset, element: el };
  }
  return closest.element;
}
function getFilteredDropIndex(container, marker, selector){
  if (!marker.parentElement) return -1;
  const nodes = [...container.children].filter(n => n.matches?.(selector));
  return nodes.indexOf(marker);
}


// Settings (shared)
const settingsModal = q("#settingsModal");
const openSettingsTop = q("#openSettingsTop");
const settingsForm = q("#settingsForm");
const settingsCancel = q("#settingsCancel");

// Backlink
q("#backBtn")?.addEventListener("click", ()=> { window.location.href = "index.html"; });

// ===== Renderers =====
function renderTree(){
  nbTree.innerHTML = "";
  state.notebooks.forEach(nb=>{
    // --- Notebook-Row ---
    const row = document.createElement("div");
    row.className = "list-row";
    row.dataset.type = "nb";
    row.dataset.nbId = nb.id;

    const btn = document.createElement("button");
    btn.className = "list-btn pressable nb-btn";
    if (nb.open) btn.classList.add("open");
    btn.dataset.id = nb.id;
    btn.innerHTML = `<span class="ico">📓</span><span class="text" data-role="title">${escapeHTML(nb.title)}</span>`;

    // Single-Click klappt auf/zu (mit Pulse)
    bindClickVsDbl(
      btn,
      ()=>{ pulseThen(btn, ()=>{ nb.open = !nb.open; saveState(); renderTree(); }); }
    );

    const actions = document.createElement("div");
    actions.className = "list-actions";

    const addS = document.createElement("button");
    addS.className = "icon xsmall pressable";
    addS.title = "Abschnitt hinzufügen";
    addS.textContent = "+";
    addS.addEventListener("click", (e)=>{
      e.stopPropagation();
      const s = { id: uid(), title: "Neuer Abschnitt", pages: [] };
      nb.sections.push(s);
      state.selected.notebookId = nb.id;
      state.selected.sectionId  = s.id;
      state.selected.pageId     = null;
      saveState(); renderAll();
    });

    const rename = document.createElement("button");
    rename.className = "icon xsmall pressable";
    rename.title = "Notizbuch umbenennen";
    rename.textContent = "✎";
    rename.addEventListener("click", (e)=>{
      e.stopPropagation();
      inlineRename(btn, nb.title, (val)=>{
        nb.title = val;
        saveState();
        renderTree();
      });
    });

    const del = document.createElement("button");
    del.className = "icon xsmall pressable";
    del.title = "Notizbuch löschen";
    del.textContent = "🗑";
    del.addEventListener("click", async (e)=>{
  e.stopPropagation();

  const answer = await confirmDeleteWithModal("notebook", nb.title);
  if (answer !== "ok") return;

  const i = state.notebooks.findIndex(x=>x.id===nb.id);
  if (i>-1) state.notebooks.splice(i,1);

  if (state.notebooks.length){
    state.selected.notebookId = state.notebooks[0].id;
    state.selected.sectionId  = state.notebooks[0]?.sections[0]?.id || null;
    state.selected.pageId     = state.notebooks[0]?.sections[0]?.pages[0]?.id || null;
  } else {
    state.selected = { notebookId:null, sectionId:null, pageId:null };
  }
  saveState(); renderAll();
});


    actions.append(addS, rename, del);

    // Drag-Handle + DnD für Notizbuch-Reihen
    const handle = document.createElement("button");
    handle.className = "drag-handle list";
    handle.title = "Ziehen zum Sortieren";
    handle.textContent = "⠿";
    handle.addEventListener("mousedown", ()=> row.draggable = true);
    row.addEventListener("dragstart", (e)=>{
      row.classList.add("dragging");
      startDrag({ type:"nb", nbId: nb.id }, e.dataTransfer);
    });
    row.addEventListener("dragend", ()=>{
      row.classList.remove("dragging");
      row.draggable = false;
      endDrag();
    });

    row.append(btn, actions, handle);
    nbTree.appendChild(row);

    // --- Abschnitte, wenn Notizbuch geöffnet ---
    if (nb.open){
      nb.sections.forEach(sec=>{
        const srow = document.createElement("div");
        srow.className = "list-row";
        srow.style.marginLeft = "16px";
        srow.dataset.type = "sec";
        srow.dataset.nbId = nb.id;
        srow.dataset.secId = sec.id;

        const sbtn = document.createElement("button");
        sbtn.className = "list-btn pressable sec-btn";
        sbtn.dataset.id = sec.id;
        sbtn.innerHTML = `<span class="ico">🗂️</span><span class="text" data-role="title">${escapeHTML(sec.title)}</span>`;

        // Klick: Abschnitt auswählen, ggf. erste Seite aktivieren
        bindClickVsDbl(
          sbtn,
          ()=>{ pulseThen(sbtn, ()=>{
            state.selected.notebookId = nb.id;
            state.selected.sectionId  = sec.id;
            state.selected.pageId     = sec.pages?.[0]?.id || null;
            saveState(); renderAll();
          });}
        );

        const sAct = document.createElement("div");
        sAct.className = "list-actions";

        const renameS = document.createElement("button");
        renameS.className = "icon xsmall pressable";
        renameS.title = "Abschnitt umbenennen";
        renameS.textContent = "✎";
        renameS.addEventListener("click", (e)=>{
          e.stopPropagation();
          inlineRename(sbtn, sec.title, (val)=>{
            sec.title = val;
            saveState();
            renderTree();
          });
        });

        const delS = document.createElement("button");
        delS.className = "icon xsmall pressable";
        delS.title = "Abschnitt löschen";
        delS.textContent = "🗑";
        delS.addEventListener("click", async (e)=>{
  e.stopPropagation();

  const answer = await confirmDeleteWithModal("section", sec.title);
  if (answer !== "ok") return;

  const idx = nb.sections.findIndex(x=>x.id===sec.id);
  if (idx>-1) nb.sections.splice(idx,1);

  if (state.selected.sectionId === sec.id){
    state.selected.sectionId = nb.sections[0]?.id || null;
    state.selected.pageId    = nb.sections[0]?.pages[0]?.id || null;
  }
  saveState(); renderAll();
});


        sAct.append(renameS, delS);

        // Drag-Handle + DnD für Abschnitt-Reihen
        const shandle = document.createElement("button");
        shandle.className = "drag-handle list";
        shandle.title = "Ziehen zum Sortieren";
        shandle.textContent = "⠿";
        shandle.addEventListener("mousedown", ()=> srow.draggable = true);
        srow.addEventListener("dragstart", (e)=>{
          srow.classList.add("dragging");
          startDrag({ type:"sec", nbId: nb.id, secId: sec.id }, e.dataTransfer);
        });
        srow.addEventListener("dragend", ()=>{
          srow.classList.remove("dragging");
          srow.draggable = false;
          endDrag();
        });

        srow.append(sbtn, sAct, shandle);
        nbTree.appendChild(srow);
      });
    }
  });

  highlightTree();
}

// --- DnD im Notebook/Abschnitt-Baum ---
nbTree.addEventListener("dragover", (e)=>{
  if (!dragState) return;
  e.preventDefault();

  let selector = "";
  if (dragState.type === "nb"){
    selector = '.list-row[data-type="nb"]';
  } else if (dragState.type === "sec"){
    selector = `.list-row[data-type="sec"][data-nb-id="${dragState.nbId}"]`;
  } else if (dragState.type === "page"){
    // Seite kann auf Abschnitt gedroppt werden (verschieben zwischen Abschnitten)
    selector = `.list-row[data-type="sec"]`;
  } else return;

  const after = getDragAfterElement(nbTree, e.clientY, selector);
  if (after == null) nbTree.appendChild(listDropMarker);
  else nbTree.insertBefore(listDropMarker, after);
});

nbTree.addEventListener("dragleave", (e)=>{
  const rel = e.relatedTarget || null;
  if (!rel || !nbTree.contains(rel)){
    if (listDropMarker.parentElement) listDropMarker.parentElement.removeChild(listDropMarker);
  }
});

nbTree.addEventListener("drop", (e)=>{
  if (!dragState) return;
  e.preventDefault();

  // Seite auf Abschnitt droppen -> verschieben
  if (dragState.type === "page"){
    const secRow = e.target.closest('.list-row[data-type="sec"]');
    if (secRow){
      movePageToSection(dragState.pageId, dragState.fromSecId, secRow.dataset.secId, null);
      endDrag();
      return;
    }
  }

  // Sortieren
  if (dragState.type === "nb"){
    const idx = getFilteredDropIndex(nbTree, listDropMarker, '.list-row[data-type="nb"]');
    if (idx >= 0) reorderNotebooks(idx);
  } else if (dragState.type === "sec"){
    const idx = getFilteredDropIndex(nbTree, listDropMarker, `.list-row[data-type="sec"][data-nb-id="${dragState.nbId}"]`);
    if (idx >= 0) reorderSections(dragState.nbId, idx);
  }
  endDrag();
});

// --- DnD in der Seitenliste (innerhalb eines Abschnitts) ---
pageList.addEventListener("dragover", (e)=>{
  if (dragState?.type !== "page") return;
  e.preventDefault();
  const after = getDragAfterElement(pageList, e.clientY, '.list-row[data-type="page"]:not(.dragging)');
  if (after == null) pageList.appendChild(listDropMarker);
  else pageList.insertBefore(listDropMarker, after);
});
pageList.addEventListener("dragleave", (e)=>{
  const rel = e.relatedTarget || null;
  if (!rel || !pageList.contains(rel)){
    if (listDropMarker.parentElement) listDropMarker.parentElement.removeChild(listDropMarker);
  }
});
pageList.addEventListener("drop", (e)=>{
  if (dragState?.type !== "page") return;
  e.preventDefault();
  const toIndex = getFilteredDropIndex(pageList, listDropMarker, '.list-row[data-type="page"]');
  reorderPagesInSection(dragState.fromSecId, dragState.pageId, toIndex);
  endDrag();
});


function reorderNotebooks(targetIndex){
  const i = state.notebooks.findIndex(nb => nb.id === dragState.nbId);
  if (i < 0) return;
  const [moved] = state.notebooks.splice(i, 1);
  const to = Math.min(Math.max(targetIndex, 0), state.notebooks.length);
  state.notebooks.splice(to, 0, moved);
  saveState(); renderTree();
}

function reorderSections(nbId, targetIndex){
  const nb = state.notebooks.find(n => n.id === nbId);
  if (!nb) return;
  const i = nb.sections.findIndex(s => s.id === dragState.secId);
  if (i < 0) return;
  const [moved] = nb.sections.splice(i, 1);
  const to = Math.min(Math.max(targetIndex, 0), nb.sections.length);
  nb.sections.splice(to, 0, moved);
  saveState(); renderTree();
}

function reorderPagesInSection(secId, pageId, toIndex){
  const nb = getSelectedNotebook(); if (!nb) return;
  const sec = nb.sections.find(s => s.id === secId);
  if (!sec) return;
  const i = sec.pages.findIndex(p => p.id === pageId);
  if (i < 0) return;
  const [moved] = sec.pages.splice(i, 1);
  const to = Math.min(Math.max(toIndex, 0), sec.pages.length);
  sec.pages.splice(to, 0, moved);
  saveState(); renderPages();
}

function movePageToSection(pageId, fromSecId, toSecId, beforePageId){
  if (fromSecId === toSecId) return;
  const nb = getSelectedNotebook(); if (!nb) return;
  const from = nb.sections.find(s => s.id === fromSecId);
  const to   = nb.sections.find(s => s.id === toSecId);
  if (!from || !to) return;

  const i = from.pages.findIndex(p => p.id === pageId);
  if (i < 0) return;
  const [moved] = from.pages.splice(i, 1);

  let idx = (beforePageId) ? to.pages.findIndex(p => p.id === beforePageId) : to.pages.length;
  if (idx < 0) idx = to.pages.length;
  to.pages.splice(idx, 0, moved);

  state.selected.sectionId = to.id;
  state.selected.pageId = moved.id;
  saveState(); renderAll();
}


function highlightTree(){
  const { notebookId, sectionId } = state.selected;
  [...nbTree.querySelectorAll(".list-btn")].forEach(b=>{
    const id = b.dataset.id;
    b.classList.toggle("active", id === notebookId || id === sectionId);
  });
}

function renderPages(){
  pageList.innerHTML = "";
  const sec = getSelectedSection();
  if (!sec){
    pageList.innerHTML = `<p class="hint">Wähle links ein Notizbuch und einen Abschnitt.</p>`;
    return;
  }

  sec.pages.forEach(pg=>{
    const row = document.createElement("div");
    row.className = "list-row";
    row.dataset.type = "page";
    row.dataset.pageId = pg.id;

    const btn = document.createElement("button");
    btn.className = "list-btn pressable page-btn";
    btn.dataset.id = pg.id;
    btn.style.setProperty("--page-stripe", pg.color || "var(--accent)");
    btn.innerHTML = `<span class="text" data-role="title">${escapeHTML(pg.title)}</span>`;
    btn.addEventListener("click", ()=>{
      state.selected.pageId = pg.id;
      saveState();
      renderEditor();
      highlightPages();
    });

    const actions = document.createElement("div");
    actions.className = "list-actions";

    const del = document.createElement("button");
    del.className = "icon xsmall pressable";
    del.title = "Seite löschen";
    del.textContent = "🗑";
    del.addEventListener("click", async (e)=>{
  e.stopPropagation();

  const answer = await confirmDeleteWithModal("page", pg.title);
  if (answer !== "ok") return;

  const i = sec.pages.findIndex(x=>x.id===pg.id);
  if (i>-1) sec.pages.splice(i,1);

  if (state.selected.pageId === pg.id){
    state.selected.pageId = sec.pages[0]?.id || null;
  }
  saveState(); renderAll();
});


    // Drag-Handle + DnD für Seiten
    const handle = document.createElement("button");
    handle.className = "drag-handle list";
    handle.title = "Ziehen zum Sortieren";
    handle.textContent = "⠿";
    handle.addEventListener("mousedown", ()=> row.draggable = true);
    row.addEventListener("dragstart", (e)=>{
      row.classList.add("dragging");
      startDrag({ type:"page", pageId: pg.id, fromSecId: sec.id }, e.dataTransfer);
    });
    row.addEventListener("dragend", ()=>{
      row.classList.remove("dragging");
      row.draggable = false;
      endDrag();
    });

    actions.appendChild(del);
    row.append(btn, actions, handle);
    pageList.appendChild(row);
  });

  highlightPages();
}

function highlightPages(){
  const pid = state.selected.pageId;
  [...pageList.querySelectorAll(".list-btn")].forEach(b=> b.classList.toggle("active", b.dataset.id === pid));
}

/* ===== Editor Animation Helpers (NEW) ===== */
let editorAnimating = false;
let lastRenderedPageId = null;

function playClassOnce(el, cls, durationMs){
  return new Promise(resolve=>{
    if (!el) return resolve();
    // remove the opposite class to avoid clashes
    el.classList.remove("editor-anim-in", "editor-anim-out");
    void el.offsetWidth; // reflow to restart animation
    el.classList.add(cls);
    const done = ()=>{ el.classList.remove(cls); el.removeEventListener("animationend", done); resolve(); };
    el.addEventListener("animationend", done);
    // fallback in case animationend is missed
    setTimeout(done, durationMs + 50);
  });
}

async function editorAppear(){
  if (!editorSheet) return;
  await playClassOnce(editorSheet, "editor-anim-in", 220);
}
async function editorDisappear(){
  if (!editorSheet) return;
  await playClassOnce(editorSheet, "editor-anim-out", 160);
}

function emptyShow(){
  if (!emptyState) return;
  emptyState.style.display = "block";
  emptyState.classList.remove("empty-anim-out");
  void emptyState.offsetWidth;
  emptyState.classList.add("empty-anim-in");
}
function emptyHide(){
  if (!emptyState) return;
  emptyState.classList.remove("empty-anim-in");
  void emptyState.offsetWidth;
  emptyState.classList.add("empty-anim-out");
  // nach kurzer Zeit aus dem Fluss nehmen
  setTimeout(()=>{ if (emptyState) emptyState.style.display = "none"; }, 140);
}

/* ===== Toolbar Setup (Bold/Italic/Underline + Font) ===== */
function setupToolbar(){
  if (!pageContent) return;

  // execCommand CSS-Modus aktivieren (schreibt <span style="...">)
  try{ document.execCommand("styleWithCSS", true); }catch{}

  // Buttons: Anwendung auf Auswahl / TypingStyle
  btnBold?.addEventListener("click", ()=>{
    document.execCommand("bold", false);
    updateToolbarState();
    scheduleSave();
  });
  btnItalic?.addEventListener("click", ()=>{
    document.execCommand("italic", false);
    updateToolbarState();
    scheduleSave();
  });
  btnUnderline?.addEventListener("click", ()=>{
    document.execCommand("underline", false);
    updateToolbarState();
    scheduleSave();
  });

  // Schriftart: wirkt auf Selektion oder zukünftigen Text
  ffSelect?.addEventListener("change", ()=>{
    const val = ffSelect.value;
    document.execCommand("fontName", false, val);
    updateToolbarState();
    scheduleSave();
  });

    // Textgröße (px) – wirkt auf Selektion oder zukünftigen Text
  const FS_MAP = {1:10, 2:12, 3:14, 4:16, 5:18, 6:24, 7:32, 8:48};
  const PX_TO_CMD = (px)=> {
    const entries = Object.entries(FS_MAP).map(([k,v])=>[Number(k), Number(v)]);
    // nächstliegende Stufe finden
    let best = entries[0][0];
    let minDiff = Infinity;
    for (const [k,v] of entries){
      const d = Math.abs(v - px);
      if (d < minDiff){ minDiff = d; best = k; }
    }
    return String(best);
  };
  const CMD_TO_PX = (cmd)=> FS_MAP[Number(cmd)] || 16;

  fsSelect?.addEventListener("change", ()=>{
    const px = Number(fsSelect.value) || 16;
    const cmd = PX_TO_CMD(px);
    document.execCommand("fontSize", false, cmd);
    updateToolbarState();
    scheduleSave();
  });


  // Auswahländerungen spiegeln Button-Zustände
  document.addEventListener("selectionchange", ()=>{
    if (!pageContent) return;
    // Nur updaten, wenn die aktive Selektion im Editor liegt
    const sel = document.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const anchor = sel.anchorNode;
    if (!anchor || !pageContent.contains(anchor)) return;
    updateToolbarState();
  });

  // PASTE: sanitizen (nur erlaubte Inline-Styles/Tags)
  pageContent.addEventListener("paste", (e)=>{
    e.preventDefault();
    const dt = (e.clipboardData || window.clipboardData);
    let html = dt?.getData("text/html");
    let text = dt?.getData("text/plain") || "";
    let out = "";
    if (html){
      out = sanitizeHTML(html);
    } else {
      out = textToHtml(text);
    }
    document.execCommand("insertHTML", false, out);
    scheduleSave();
  });
}

// Toolbar aktiv/inaktiv setzen
function updateToolbarState(){
  const b = qcState("bold");
  const i = qcState("italic");
  const u = qcState("underline");
  if (btnBold)      btnBold.setAttribute("aria-pressed", String(!!b));
  if (btnItalic)    btnItalic.setAttribute("aria-pressed", String(!!i));
  if (btnUnderline) btnUnderline.setAttribute("aria-pressed", String(!!u));

  // fontName kann in Browsern unterschiedlich zurückkommen (in Anführungszeichen / systemfont)
  const v = (qcValue("fontName") || "").replace(/["']/g,"").trim();
    // Textgröße (1–7 → px) in das Select spiegeln
  const fsCmd = qcValue("fontSize");        // i. d. R. "1".."7"
  if (fsCmd && fsSelect){
    const FS_MAP_R = {1:10, 2:12, 3:14, 4:16, 5:18, 6:24, 7:32, 8:48};
    const px = FS_MAP_R[Number(fsCmd)] || 16;
    fsSelect.value = String(px);
  }

  // Falls leer/unerwartet, nichts umstellen; sonst Dropdown bestmöglich matchen
  if (ffSelect && v){
    const found = [...ffSelect.options].find(o => o.value.toLowerCase() === v.toLowerCase());
    if (found) ffSelect.value = found.value;
  }
}

function renderEditor(){
  const pg = getSelectedPage();

  if (!pg){
    if (editorSheet && editorSheet.style.display !== "none"){
      editorDisappear().finally(()=>{
        if (editorSheet) editorSheet.style.display = "none";
        emptyShow();
      });
    } else {
      emptyShow();
    }
    pageTitle.value = "";
    pageTitle.disabled = true;
    if (pageContent){
      pageContent.innerHTML = "";
      pageContent.setAttribute("contenteditable", "false");
    }
    if (pageDate) pageDate.textContent = "";
    lastRenderedPageId = null;
    return;
  }

  if (emptyState && emptyState.style.display !== "none"){
    emptyHide();
  }

  const isNewPage = (lastRenderedPageId !== pg.id);
  const mustAnimateOut = isNewPage && editorSheet && editorSheet.style.display !== "none";

  const fillContent = ()=>{
    pageTitle.disabled = false;
    pageTitle.value = pg.title || "";
    if (pageContent){
      pageContent.setAttribute("contenteditable", "true");
      // HTML sicher einsetzen; Migration: Plain-Text → <br>
      const raw = pg.content || "";
      const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(raw);
      const safeHtml = looksLikeHtml ? sanitizeHTML(raw) : textToHtml(raw);
      pageContent.innerHTML = safeHtml;
    }
    if (pageDate) pageDate.textContent = fmtDate(pg.createdAt || Date.now());
    lastRenderedPageId = pg.id;
    updateToolbarState();
  };

  const ensureVisible = ()=>{
    if (editorSheet && editorSheet.style.display === "none"){
      editorSheet.style.display = "";
    }
  };

  if (!editorAnimating){
    editorAnimating = true;
    (async ()=>{
      if (mustAnimateOut) await editorDisappear();
      ensureVisible();
      fillContent();
      await editorAppear();
    })().finally(()=> editorAnimating = false);
  } else {
    ensureVisible();
    fillContent();
  }
}





// ===== Selectors =====
function getSelectedNotebook(){ return state.notebooks.find(b=>b.id===state.selected.notebookId) || null; }
function getSelectedSection(){ return getSelectedNotebook()?.sections.find(s=>s.id===state.selected.sectionId) || null; }
function getSelectedPage(){ return getSelectedSection()?.pages.find(p=>p.id===state.selected.pageId) || null; }

// ===== Inline Rename =====
function inlineRename(containerBtn, currentText, commit){
  const parent = containerBtn.parentNode;
  if (!parent) return;

  // Ersatz-Input an Stelle des Buttons einfügen
  const input = document.createElement("input");
  input.type = "text";
  input.value = currentText || "";
  input.className = "rename-field";

  // Button temporär herausnehmen, Input an dessen Stelle setzen
  parent.replaceChild(input, containerBtn);

  // Fokus setzen
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);

  // Commit/Cleanup-Logik
  let finished = false;
  function finish(ok){
    if (finished) return;
    finished = true;

    const newVal = (input.value || "").trim();

    // Nach Abschluss einfach neu rendern lassen (der Aufrufer macht das in commit())
    // Button muss nicht manuell zurückgesetzt werden, weil renderTree/renderAll die UI neu aufbaut.

    if (ok && newVal && newVal !== currentText){
      commit(newVal);   // -> darin speicherst du + renderTree()/renderAll()
    } else {
      // Kein Change / Abbruch -> einfach neu zeichnen
      // Wir rufen hier sicherheitshalber renderTree() – wenn du an der Stelle
      // in Abschnitten bist, kannst du auch renderAll() nehmen.
      if (typeof renderTree === "function") renderTree();
    }
  }

  input.addEventListener("keydown", (e)=>{
    if (e.key === "Enter"){ e.preventDefault(); finish(true); }
    else if (e.key === "Escape"){ e.preventDefault(); finish(false); }
    // Space (Leertaste) NICHT abfangen -> wird normal ins Feld geschrieben
  });

  // Blur = speichern (wie gehabt)
  input.addEventListener("blur", ()=> finish(true));
}


// ===== Create actions =====

// Notizbuch anlegen (falls vorhanden – unverändert)
addNotebookBtn?.addEventListener("click", ()=>{
  const title = (nbTitleInput?.value || "").trim() || "Neues Notizbuch";
  const nb = { id: uid(), title, open:true, sections: [] };
  state.notebooks.push(nb);
  state.selected.notebookId = nb.id;
  state.selected.sectionId = null;
  state.selected.pageId = null;
  if (nbTitleInput) nbTitleInput.value = "";
  saveState(); renderAll();
});
nbTitleInput?.addEventListener("keydown", (e)=>{ if (e.key==="Enter") addNotebookBtn?.click(); });

// Seiten anlegen – nur noch per großem Button
addPageBtnSimple?.addEventListener("click", ()=>{
  const sec = getSelectedSection();
  if (!sec){
    showStatus?.("Hinweis", "Bitte zuerst links einen Abschnitt wählen oder anlegen.");
    return;
  }
  const title = "Neue Seite";
  const pg = {
    id: uid(),
    title,
    content: "",             // leer; wird im Editor befüllt
    createdAt: Date.now(),
    updatedAt: Date.now(),
    color: pickPageColor()
  };
  // wie in der Seitenliste üblich: oben einfügen
  sec.pages.unshift(pg);

  // Auswahl auf die neue Seite setzen
  state.selected.pageId = pg.id;
  saveState();

  // UI aktualisieren
  renderPages();
  renderEditor();

  // Fokus direkt in den Editor setzen
  pageContent?.focus();
});


// ===== Editor autosave (debounce) =====
// === Autosave: Titel + Inhalt mit normalisierten Zeilenenden speichern (REPLACE) ===
// === Autosave: Titel + Inhalt mit Umbrüchen sicher speichern (REPLACE) ===
// === Autosave: Titel + Inhalt als SANITIERTES HTML speichern (REPLACE) ===
let saveTimer = null;
function scheduleSave(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(()=>{
    const pg = getSelectedPage();
    if (!pg) return;

    pg.title = (pageTitle.value || "").trim() || "Unbenannt";

    // Inhalt: HTML sicher sanitizen (aus contenteditable)
    let html = pageContent ? pageContent.innerHTML || "" : "";
    html = sanitizeHTML(html);
    pg.content = html;
    pg.updatedAt = Date.now();

    saveState();
    renderPages(); // Seitentitel aktualisieren
  }, 420);
}



pageTitle?.addEventListener("input", scheduleSave);
pageContent?.addEventListener("input", scheduleSave);

// ===== Settings (shared) =====
// === Modal-Helpers mit Animations-Support (REPLACE) ===
function openModal(m){
  if (!m) return;
  m.classList.remove("closing");
  m.classList.add("open");
  m.setAttribute("aria-hidden","false");
}

function closeModal(m){
  if (!m) return;
  // sanfte Ausblendung: zuerst "closing", dann nach Ende Klassen zurücksetzen
  m.classList.add("closing");
  const done = ()=> {
    m.classList.remove("open", "closing");
    m.setAttribute("aria-hidden","true");
    m.removeEventListener("animationend", done);
  };
  // falls animationend ausbleibt, fallback
  m.addEventListener("animationend", done);
  setTimeout(done, 350);
}

// Persistente Flags für "Nicht mehr fragen"
const CONFIRM_FLAGS_KEY = "notebookConfirmFlags_v1"; // { notebook:true, section:true, page:true }
let confirmFlags = loadJSON(CONFIRM_FLAGS_KEY) || { notebook:true, section:true, page:true };
function saveConfirmFlags(){ saveJSON(CONFIRM_FLAGS_KEY, confirmFlags); }


// ==== Modal-Helfer: Confirm als Promise ====
function confirmWithModal(modalEl, okBtn, cancelBtn){
  return new Promise((resolve)=>{
    if (!modalEl || !okBtn || !cancelBtn){ resolve(false); return; }

    function cleanup(){
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      modalEl.removeEventListener("click", onBackdrop);
      closeModal(modalEl);
    }
    function onOk(){ cleanup(); resolve(true); }
    function onCancel(){ cleanup(); resolve(false); }
    function onBackdrop(e){
      if (e.target.classList?.contains("modal-backdrop")) { cleanup(); resolve(false); }
    }

    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
    modalEl.addEventListener("click", onBackdrop);
    openModal(modalEl);
  });
}

// ==== Modal-Helfer: Status anzeigen ====
function showStatus(title, subtitle){
  if (!nbStatusModal) return;
  if (nbStatusTitle)   nbStatusTitle.textContent = title || "Erfolgreich";
  if (nbStatusSubtitle)nbStatusSubtitle.textContent = subtitle || "";
  function close(){
    nbStatusOk?.removeEventListener("click", close);
    nbStatusModal.removeEventListener("click", onBackdrop);
    closeModal(nbStatusModal);
  }
  function onBackdrop(e){
    if (e.target.classList?.contains("modal-backdrop")) close();
  }
  nbStatusOk?.addEventListener("click", close);
  nbStatusModal.addEventListener("click", onBackdrop);
  openModal(nbStatusModal);
}


openSettingsTop?.addEventListener("click", (e)=>{ e.preventDefault(); openModal(settingsModal); });
settingsCancel?.addEventListener("click", (e)=>{ e.preventDefault(); closeModal(settingsModal); });
settingsForm?.addEventListener("submit", (e)=>{ e.preventDefault(); savePrefs(); closeModal(settingsModal); });

document.addEventListener("keydown", (e)=>{
  if (e.key === "Escape" && settingsModal?.classList.contains("open")) closeModal(settingsModal);
});

// Controls innerhalb des Modals live anwenden
q("#opacityRange")?.addEventListener("input", (e)=>{ prefs.glassAlphaStrong = clamp(Number(e.target.value), .3, .95); applyPrefs(); });
q("#cardOpacityRange")?.addEventListener("input", (e)=>{ prefs.cardAlpha = clamp(Number(e.target.value), .3, .98); applyPrefs(); });
q("#themeGrid")?.addEventListener("click", (e)=>{ const b=e.target.closest(".theme-swatch"); if(!b) return; prefs.theme=b.dataset.theme; applyPrefs(); });
q("#modeSegment")?.addEventListener("click", (e)=>{ const b=e.target.closest(".seg-btn"); if(!b) return; const m=b.dataset.mode; if(m==="dark"||m==="light"){ prefs.mode=m; applyPrefs(); } });

// ==== Sidebar-Breite: Modal ↔ HUD, Live-Vorschau ====

// Elemente
const settingsModalEl = q("#settingsModal");
const sidebarWidthRange = q("#sidebarWidthRange");
const sidebarWidthValue = q("#sidebarWidthValue");
const sliderHud         = q("#sliderHud");
const sliderHudRange    = q("#sliderHudRange");
const sliderHudValue    = q("#sliderHudValue");
const sliderHudCancel   = q("#sliderHudCancel");

function applySidebarWidth(px){
  const v = clamp(Number(px), 360, 700);
  prefs.ui = prefs.ui || {};
  prefs.ui.nbSideW = v;                 // <— statt sideW

  setCSS("--sidebar-w", v + "px");

  if (sidebarWidthRange) sidebarWidthRange.value = String(v);
  if (sidebarWidthValue) sidebarWidthValue.textContent = `${v} px`;
}


// Overlay-UI dynamisch erzeugen (genau an Position des Modal-Reglers)
let rangeOverlayEl = null;
let overlayPrevValue = null;

function openRangeOverlayAtModalRange(){
  if (!settingsModalEl || !sidebarWidthRange) return;

  // Position & Größe der Range-Zeile ermitteln
  const rect = sidebarWidthRange.getBoundingClientRect();

  // Modal sofort ausblenden (Vorschau frei)
  settingsModalEl.classList.remove("open");
  settingsModalEl.setAttribute("aria-hidden","true");

  // Ausgangswert merken (für ESC-Abbruch)
  overlayPrevValue = Number(sidebarWidthRange.value) || (prefs.ui?.nbSideW ?? 520);


  // Overlay bauen
  rangeOverlayEl = document.createElement("div");
  rangeOverlayEl.id = "rangeOverlay";
  rangeOverlayEl.style.cssText = `
    position: fixed;
    left: ${rect.left}px;
    top: ${rect.top}px;
    width: ${rect.width}px;
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0;
    background: transparent;
  `;

  const valEl = document.createElement("span");
  valEl.id = "rangeOverlayValue";
  valEl.textContent = `${overlayPrevValue} px`;
  valEl.style.minWidth = "72px";
  valEl.style.textAlign = "right";
  valEl.style.fontWeight = "700";
  valEl.style.opacity = ".9";

  const input = document.createElement("input");
  input.type = "range";
  input.min  = "360";
  input.max  = "700";
  input.step = "2";
  input.value = String(overlayPrevValue);
  input.style.width = "100%";
  input.style.accentColor = "var(--accent)"; // dein grüner Regler

  rangeOverlayEl.append(valEl, input);
  document.body.appendChild(rangeOverlayEl);

  // Live: Breite setzen
  const onInput = (e)=>{
    const v = clamp(Number(e.target.value), 360, 700);
    applySidebarWidth(v);
    valEl.textContent = `${v} px`;
  };

  // Commit: speichern + Overlay schließen + Modal zurück
  const onCommit = ()=>{
    cleanupOverlay({save:true});
  };

  // Abbrechen (ESC/Blur): alten Wert zurück, Overlay schließen, Modal zurück
  const onCancel = (e)=>{
    if (!e || e.type === "blur" || (e.type === "keydown" && e.key === "Escape")){
      cleanupOverlay({save:false});
    }
  };

  // Events
input.addEventListener("input", onInput);

// Commit (pointerup) erst registrieren, WENN das Overlay-Input einmal
// "wirklich" geklickt/gedrückt wurde – verhindert Ghost-Commit vom alten Down.
const onOverlayPointerDown = ()=>{
  document.addEventListener("pointerup", onCommit, {once:true});
  input.removeEventListener("pointerdown", onOverlayPointerDown);
};
input.addEventListener("pointerdown", onOverlayPointerDown);

// Abbrechen per ESC oder Fenster-Verlust
window.addEventListener("blur", onCancel, {once:true});
document.addEventListener("keydown", onCancel);


  // Fokus auf Overlay-Range, damit man sofort weiterziehen kann
  input.focus();

  // Startwert live anwenden (falls nötig)
  applySidebarWidth(overlayPrevValue);

  // Aufräumer
  function cleanupOverlay({save}){
    document.removeEventListener("keydown", onCancel);
    rangeOverlayEl?.remove();
    rangeOverlayEl = null;

    if (!save){
      // alten Wert wiederherstellen
      const stored = loadJSON(PREFS_KEY) || {};
      const v = stored?.ui?.nbSideW ?? overlayPrevValue ?? 520;
      applySidebarWidth(v);
    }else{
      // speichern
      const p = loadJSON(PREFS_KEY) || {};
      p.ui = p.ui || {};
      p.ui.nbSideW = prefs.ui.nbSideW;
      saveJSON(PREFS_KEY, p);
    }

    // Modal zurück
    settingsModalEl.classList.add("open");
    settingsModalEl.setAttribute("aria-hidden","false");
    // Modal-Range und Label synchronisieren + Fokus zurückgeben
    sidebarWidthRange.value = String(prefs.ui.nbSideW);
    sidebarWidthValue.textContent = `${prefs.ui.nbSideW} px`;
    sidebarWidthRange.focus();
  }
}

// Start NUR per Pointer – Overlay im nächsten Frame öffnen,
// KEIN preventDefault, damit der Drag nahtlos weitergehen kann.
sidebarWidthRange?.addEventListener("pointerdown", ()=>{
  requestAnimationFrame(()=> openRangeOverlayAtModalRange());
});

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

// ===== Utils =====
function escapeHTML(str){ return (str || "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m])); }

function fmtDate(d){
  try{
    const dt = new Date(d);
    if (isNaN(dt)) return "";
    return dt.toLocaleDateString([], { year:"numeric", month:"2-digit", day:"2-digit" });
  }catch{ return ""; }
}

// === NEW: Zeilenenden konsistent machen (Windows \r\n → \n) ===
function normNL(s){
  return (s || "").replace(/\r\n?/g, "\n");
}

/* ===== HTML Sanitizer: erlaubt nur sichere Inline-Formatierungen ===== */
const ALLOWED_TAGS = new Set(["B","STRONG","I","EM","U","SPAN","BR","P", "DIV"]);
const ALLOWED_STYLES = ["font-family"]; // wir erlauben nur Schriftart
const ALLOWED_FONTS = ["Calibri","Arial","Times New Roman","Consolas","Courier New","Verdana"];

function sanitizeHTML(html){
  if (!html) return "";
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;

  function clean(node){
    // Textnode okay
    if (node.nodeType === Node.TEXT_NODE) return;
    // Unerlaubte Tags → unwrap (durch Text ersetzen)
    if (node.nodeType === Node.ELEMENT_NODE){
      const tag = node.tagName;
      if (!ALLOWED_TAGS.has(tag)){
        const txt = doc.createTextNode(node.textContent || "");
        node.replaceWith(txt);
        return;
      }
      // Nur erlaubte Attribute behalten
      for (const attr of [...node.attributes]){
        const name = attr.name.toLowerCase();
        if (name === "style"){
          // Style parsen und nur erlaubte Eigenschaft(en) mit Whitelist-Werten behalten
          const span = node; // element
          const s = span.getAttribute("style") || "";
          const keep = [];
          s.split(";").forEach(entry=>{
            const [prop, val] = entry.split(":").map(x=>x && x.trim());
            if (!prop || !val) return;
            const p = prop.toLowerCase();
            if (ALLOWED_STYLES.includes(p)){
              if (p === "font-family"){
                // Nur erlaubte Fonts (case-insensitive), mehrere Familien -> erste prüfen
                const fam = val.replace(/["']/g,"").split(",")[0].trim();
                if (ALLOWED_FONTS.some(f => f.toLowerCase() === fam.toLowerCase())){
                  keep.push(`${p}: ${fam}`);
                }
              }
            }
          });
          if (keep.length) span.setAttribute("style", keep.join("; "));
          else span.removeAttribute("style");
        } else {
          // Alle anderen Attribute entfernen
          node.removeAttribute(attr.name);
        }
      }
    }
    // Kinder rekursiv prüfen
    [...node.childNodes].forEach(clean);
  }

  [...root.childNodes].forEach(clean);
  return root.innerHTML;
}

/* Text → HTML (mit <br> für \n) */
function textToHtml(text){
  const esc = (text || "").replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m]));
  return esc.replace(/\n/g, "<br>");
}

/* QueryCommand State sicher lesen (Safari/Firefox Unterschiede) */
function qcState(cmd){
  try{ return document.queryCommandState(cmd); }catch{ return false; }
}
function qcValue(cmd){
  try{ return document.queryCommandValue(cmd); }catch{ return ""; }
}


// === NEW: Klaren Plain-Text mit sichtbaren Umbrüchen aus dem Editor holen ===
function getEditorText(){
  if (!pageContent) return "";
  // innerText bewahrt visuelle Zeilenumbrüche aus <div>/<br> viel zuverlässiger als textContent
  // normNL macht daraus überall konsistente \n
  return normNL(pageContent.innerText || "");
}



// --- Helper: Single-Click vs. Double-Click sauber trennen ---
function bindClickVsDbl(el, onClick, onDbl, delay = 0){
  let timer = null;
  el.addEventListener("click", (e)=>{
    // wenn gleich ein Doppelklick folgt, nicht sofort handeln
    if (e.detail > 1) return;
    clearTimeout(timer);
    timer = setTimeout(()=> onClick && onClick(e), delay);
  });
  el.addEventListener("dblclick", (e)=>{
    clearTimeout(timer);
    onDbl && onDbl(e);
  });
}

// Pulse abspielen und DANACH callback ausführen (mit Fallback)
function pulseThen(el, fn, fallbackMs = 220){
  if (!el) { fn?.(); return; }
  el.classList.remove("pulse");
  requestAnimationFrame(()=>{
    el.classList.add("pulse");
    let done = false;
    const finish = ()=> {
      if (done) return;
      done = true;
      el.classList.remove("pulse");
      fn?.();
    };
    el.addEventListener("animationend", finish, { once:true });
    // Sicherheits-Fallback, falls animationend ausbleibt
    setTimeout(finish, fallbackMs);
  });
}

/* === Modal Button Animations: Ripple + Keyboard Press (NEW) === */
function createRipple(e){
  const btn = e.currentTarget;
  // Position relativ zum Button bestimmen
  const rect = btn.getBoundingClientRect();
  const x = (e.clientX ?? (rect.left + rect.width/2)) - rect.left;
  const y = (e.clientY ?? (rect.top + rect.height/2)) - rect.top;

  const rip = document.createElement("span");
  rip.className = "ripple";
  const size = Math.max(rect.width, rect.height) * 1.2;
  rip.style.width = rip.style.height = `${size}px`;
  rip.style.left = `${x - size/2}px`;
  rip.style.top  = `${y - size/2}px`;

  // Entfernen nach Ende
  rip.addEventListener("animationend", ()=> rip.remove());
  btn.appendChild(rip);
}

function handlePointerDown(e){
  // Nur linke Maustaste / Touch
  if (e.button !== undefined && e.button !== 0) return;
  createRipple(e);
}

function handleKeyPress(e){
  // Keyboard-Ripple für Space/Enter
  if (e.key === " " || e.key === "Enter"){
    // simulierte Position: Button-Zentrum
    const rect = e.currentTarget.getBoundingClientRect();
    const fake = { currentTarget: e.currentTarget, clientX: rect.left + rect.width/2, clientY: rect.top + rect.height/2 };
    createRipple(fake);
  }
}

/**
 * Initialisiert Ripple/Press für alle Buttons innerhalb von Modals.
 * Ruft man einmal global auf; nutzt Event-Delegation über document.
 */
function setupModalButtonAnimations(){
  // Delegation: alle Klick-Targets innerhalb .modal, die wie Buttons aussehen
  const isTarget = (el)=> el && (el.matches(".modal .btn, .modal .pressable"));
  document.addEventListener("pointerdown", (e)=>{
    const t = e.target.closest(".btn, .pressable");
    if (t && isTarget(t)) handlePointerDown({ ...e, currentTarget: t });
  });
  document.addEventListener("keydown", (e)=>{
    const t = document.activeElement;
    if (t && isTarget(t)) handleKeyPress({ ...e, currentTarget: t });
  });
}


// === Backup-Button → Modal öffnen
if (nbBackupBtn && nbBackupModal){
  nbBackupBtn.addEventListener("click", ()=> openModal(nbBackupModal));
}

// Segment (Notebook/Bucket) aktiv markieren
if (nbBackupSegment){
  nbBackupSegment.addEventListener("click", (e)=>{
    const seg = e.target.closest(".seg-btn"); if (!seg) return;
    // visual active
    [...nbBackupSegment.querySelectorAll(".seg-btn")].forEach(b=> b.classList.remove("active"));
    seg.classList.add("active");
    // radio toggeln
    const v = seg.dataset.type;
    const input = seg.querySelector('input[type="radio"][name="backupType"]');
    if (input){ input.checked = true; input.value = v; }
  });
}

// Modal: Abbrechen
if (nbBackupCancel && nbBackupModal){
  nbBackupCancel.addEventListener("click", ()=> closeModal(nbBackupModal));
}

// Modal: Bestätigen → Backup erzeugen
if (nbBackupForm && nbBackupModal){
  nbBackupForm.addEventListener("submit", (e)=>{
    e.preventDefault();
    const selected = nbBackupForm.querySelector('input[name="backupType"]:checked');
    const type = selected ? selected.value : "notebook";
    closeModal(nbBackupModal);
    exportBackup(type);
  });
}

// === Restore-Button → Dateiauswahl
if (nbRestoreBtn && nbRestoreInput){
  nbRestoreBtn.addEventListener("click", ()=> nbRestoreInput.click());

  nbRestoreInput.addEventListener("change", async (e)=>{
    const file = e.target.files?.[0];
    if (!file) return;

    try{
      // 1) Bestätigungs-Modal anzeigen (Überschreiben)
      const ok = await confirmWithModal(nbConfirmModal, nbConfirmOk, nbConfirmCancel);
      if (!ok) return;

      // 2) Datei lesen
      const text = await file.text();

      // 3) Import durchführen
      const res = importBackupText(text);

      // 4) Status-Modal anzeigen
      if (res === "loaded"){
        showStatus("Erfolgreich", "Backup wurde erfolgreich geladen");
      }
    } finally {
      e.target.value = ""; // reset für erneuten Import derselben Datei
    }
  });
}


/* =======================
   BACKUP / RESTORE (Notebook & Bucket)
   ======================= */

// Helfer: Modal öffnen/schließen (nutzt deine vorhandene Modal-Klasse)
function openModal(m){ m.classList.add("open"); m.setAttribute("aria-hidden", "false"); }
function closeModal(m){ m.classList.remove("open"); m.setAttribute("aria-hidden", "true"); }
/**
 * Bestätigt das Löschen per Modal.
 * @param {"notebook"|"section"|"page"} type
 * @param {string} name  – wird in der Nachricht angezeigt
 * @returns {Promise<"ok"|"cancel">} – "ok" wenn bestätigt
 * 
 * Beachtet die persistente Checkbox "Nicht mehr fragen":
 *   - Wenn confirmFlags[type] === false, wird sofort "ok" zurückgegeben.
 *   - Wenn Checkbox im Modal aktiv, wird confirmFlags[type] auf false gesetzt (persistiert).
 */
function confirmDeleteWithModal(type, name){
  return new Promise((resolve)=>{
    // Schon deaktiviert? → sofort durchwinken
    if (confirmFlags?.[type] === false){
      resolve("ok");
      return;
    }

    // Texte setzen
    const titleMap = { notebook: "Notizbuch löschen?", section: "Abschnitt löschen?", page: "Seite löschen?" };
    const whatMap  = { notebook: "Notizbuch",          section: "Abschnitt",         page: "Seite" };

    if (nbDeleteTitle) nbDeleteTitle.textContent = titleMap[type] || "Wirklich löschen?";
    if (nbDeleteMsg)   nbDeleteMsg.textContent   = `${whatMap[type] || "Element"} „${name || ""}“ wird dauerhaft gelöscht. Dieser Schritt kann nicht rückgängig gemacht werden.`;
    if (nbDeleteNeverAsk) nbDeleteNeverAsk.checked = false;

    // Listener aufsetzen
    function cleanup(){
      nbDeleteOk.removeEventListener("click", onOk);
      nbDeleteCancel.removeEventListener("click", onCancel);
      nbDeleteModal.removeEventListener("click", onBackdrop);
      closeModal(nbDeleteModal);
    }
    function onOk(){
      // „Nicht mehr fragen“ übernehmen
      if (nbDeleteNeverAsk?.checked){
        confirmFlags[type] = false;
        saveConfirmFlags();
      }
      cleanup();
      resolve("ok");
    }
    function onCancel(){ cleanup(); resolve("cancel"); }
    function onBackdrop(e){
      if (e.target.classList?.contains("modal-backdrop")) { cleanup(); resolve("cancel"); }
    }

    nbDeleteOk.addEventListener("click", onOk);
    nbDeleteCancel.addEventListener("click", onCancel);
    nbDeleteModal.addEventListener("click", onBackdrop);
    openModal(nbDeleteModal);
  });
}

// Backup-Datei erzeugen & herunterladen
function downloadJSON(obj, filename){
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=> URL.revokeObjectURL(a.href), 1500);
  a.remove();
}

function tsName(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const dd= String(d.getDate()).padStart(2,"0");
  const hh= String(d.getHours()).padStart(2,"0");
  const mi= String(d.getMinutes()).padStart(2,"0");
  return `${y}-${m}-${dd}-${hh}${mi}`;
}

// === Export ===
function exportBackup(type /* "notebook" | "bucket" */){
  const wrapper = {
    __type: "unified-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    storage: {}
  };

  if (type === "notebook"){
    // aktueller Notebook-State aus dem RAM
    wrapper.storage[NOTEBOOK_KEY] = state;
    // Prefs mitnehmen, damit Theme/Mode konsistent ist
    const prefsObj = loadJSON(PREFS_KEY);
    if (prefsObj) wrapper.storage[PREFS_KEY] = prefsObj;

    downloadJSON(wrapper, `backup-notebook-${tsName()}.json`);
    return;
  }

  if (type === "bucket"){
    // reines Storage lesen (die Bucket-Seite ist hier nicht geladen)
    const bucketState = loadJSON(BUCKET_STORAGE_KEY);
    if (!bucketState){
      alert("Keine Bucket-Daten gefunden (lokaler Speicher leer).");
      return;
    }
    wrapper.storage[BUCKET_STORAGE_KEY] = bucketState;

    const prefsObj = loadJSON(PREFS_KEY);
    if (prefsObj) wrapper.storage[PREFS_KEY] = prefsObj;

    downloadJSON(wrapper, `backup-bucket-${tsName()}.json`);
    return;
  }

  // Nach erfolgreichem Export:
showToast({
  title: 'Erfolgreich',
  subtitle: 'Erfolgreich exportiert',
  duration: 5000,                  // 5s, gerne anpassen
  accentColor: '#22c55e'           // grün für die Progressbar (optional)
});

}
// Backup Import
function importBackupText(text){
  let data;
  try{
    data = JSON.parse(text);
  }catch(e){
    showStatus("Fehler", "Ungültige Datei – kein gültiges JSON.");
    return "error";
  }

  // Wrapper-Format?
  if (data && typeof data === "object" && data.storage && typeof data.storage === "object"){
    const st = data.storage;

    // Prefs (optional)
    if (st[PREFS_KEY]){
      localStorage.setItem(PREFS_KEY, JSON.stringify(st[PREFS_KEY]));
    }

    // Notebook
    if (st[NOTEBOOK_KEY]){
      const nbNormalized = normalize(st[NOTEBOOK_KEY]);
      state = nbNormalized;
      saveState(); renderAll();
    }

    // Bucket
    if (st[BUCKET_STORAGE_KEY]){
      localStorage.setItem(BUCKET_STORAGE_KEY, JSON.stringify(st[BUCKET_STORAGE_KEY]));
    }

    return "loaded"; // erfolgreich
  }

  // Raw Notebook
  if (data && Array.isArray(data.notebooks)){
    state = normalize(data);
    saveState(); renderAll();
    return "loaded";
  }

  // Raw Bucket
  if (data && Array.isArray(data.lists)){
    localStorage.setItem(BUCKET_STORAGE_KEY, JSON.stringify(data));
    return "loaded";
  }

  showStatus("Fehler", "Unbekanntes Datenformat – kein passender Bereich gefunden.");
  return "error";
}



// ===== Init =====
applyPrefs();
function renderAll(){ renderTree(); renderPages(); renderEditor(); }
renderAll();
setupModalButtonAnimations();   // <-- aktiviert Ripple/Hover/Press für Modal-Buttons
// Toolbar jetzt aktivieren (nachdem DOM/Editor existieren)
setupToolbar();
updateToolbarState();
applySidebarWidth(prefs.ui?.nbSideW || 520);

