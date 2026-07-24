// ── ROOTS Dialog (confirm + prompt) – self-contained, ersetzt window.confirm/prompt ──
function _rootsDlgEnsure(){
  if(document.getElementById('roots-dlg-overlay'))return;
  var css="#roots-dlg-overlay{display:none;position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:1.25rem}#roots-dlg-overlay.open{display:flex}#roots-dlg-box{background:var(--bg,#fff);border:1px solid var(--line,#e2e8f0);border-radius:20px;box-shadow:var(--shadow-modal,0 20px 60px rgba(15,23,42,.2));max-width:380px;width:100%;padding:1.75rem 1.5rem 1.5rem;text-align:center;font-family:inherit;animation:rootsDlgIn .2s cubic-bezier(.22,1,.36,1)}@keyframes rootsDlgIn{from{opacity:0;transform:scale(.95) translateY(10px)}to{opacity:1;transform:none}}#roots-dlg-icon{width:48px;height:48px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:1.15rem;margin:0 auto .85rem;background:#fef2f2;color:#dc2626}#roots-dlg-icon.warning{background:#fffbeb;color:#d97706}#roots-dlg-icon.info{background:var(--brand-light,#eff6ff);color:var(--brand,#206efb)}#roots-dlg-title{font-size:1.05rem;font-weight:700;color:var(--ink,#0f172a);margin:0 0 .4rem}#roots-dlg-desc{font-size:.875rem;color:var(--muted,#64748b);line-height:1.5;margin:0 0 1.25rem}#roots-dlg-input{width:100%;height:44px;padding:0 .9rem;border:1px solid var(--line,#e2e8f0);border-radius:10px;font-family:inherit;font-size:.95rem;color:var(--ink,#0f172a);background:var(--bg,#fff);outline:none;box-sizing:border-box;margin:0 0 1.25rem}#roots-dlg-input:focus{border-color:var(--brand,#206efb)}#roots-dlg-actions{display:flex;gap:.6rem}#roots-dlg-cancel{flex:1;padding:.75rem 1rem;border:1px solid var(--line,#e2e8f0);border-radius:10px;background:transparent;font-family:inherit;font-weight:600;font-size:.875rem;color:var(--ink,#0f172a);cursor:pointer}#roots-dlg-cancel:hover{border-color:var(--brand,#206efb);color:var(--brand,#206efb)}#roots-dlg-ok{flex:1;padding:.75rem 1rem;border:none;border-radius:10px;font-family:inherit;font-weight:600;font-size:.875rem;color:#fff;background:#dc2626;cursor:pointer}#roots-dlg-ok:hover{opacity:.88}#roots-dlg-ok.warning{background:#d97706}#roots-dlg-ok.info{background:var(--brand,#206efb)}";
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  var ov=document.createElement('div');ov.id='roots-dlg-overlay';
  ov.innerHTML='<div id="roots-dlg-box"><div id="roots-dlg-icon"></div><h2 id="roots-dlg-title"></h2><p id="roots-dlg-desc"></p><input id="roots-dlg-input" style="display:none"/><div id="roots-dlg-actions"><button type="button" id="roots-dlg-cancel">Abbrechen</button><button type="button" id="roots-dlg-ok">OK</button></div></div>';
  document.body.appendChild(ov);
}
function rootsConfirm(o){o=o||{};return new Promise(function(res){_rootsDlgEnsure();var ov=document.getElementById('roots-dlg-overlay'),ic=document.getElementById('roots-dlg-icon'),ok=document.getElementById('roots-dlg-ok'),ca=document.getElementById('roots-dlg-cancel'),inp=document.getElementById('roots-dlg-input');inp.style.display='none';var v=o.variant||'danger';document.getElementById('roots-dlg-title').textContent=o.title||'Wirklich fortfahren?';var d=document.getElementById('roots-dlg-desc');d.textContent=o.desc||'';d.style.display=o.desc?'':'none';ic.className=v==='danger'?'':v;ic.innerHTML='<i class="fa-solid '+(o.icon||'fa-trash')+'"></i>';ok.className=v==='danger'?'':v;ok.textContent=o.okLabel||'Bestätigen';ov.classList.add('open');var done=function(val){ov.classList.remove('open');ok.onclick=ca.onclick=ov.onclick=null;document.removeEventListener('keydown',k);res(val)};var k=function(e){if(e.key==='Escape')done(false)};ok.onclick=function(){done(true)};ca.onclick=function(){done(false)};ov.onclick=function(e){if(e.target===ov)done(false)};document.addEventListener('keydown',k)})}
function rootsPrompt(o){o=o||{};return new Promise(function(res){_rootsDlgEnsure();var ov=document.getElementById('roots-dlg-overlay'),ic=document.getElementById('roots-dlg-icon'),ok=document.getElementById('roots-dlg-ok'),ca=document.getElementById('roots-dlg-cancel'),inp=document.getElementById('roots-dlg-input');document.getElementById('roots-dlg-title').textContent=o.title||'Eingabe';var d=document.getElementById('roots-dlg-desc');d.textContent=o.label||'';d.style.display=o.label?'':'none';ic.className='info';ic.innerHTML='<i class="fa-solid '+(o.icon||'fa-pen')+'"></i>';ok.className='info';ok.textContent=o.okLabel||'Speichern';inp.style.display='';inp.value=o.value||'';ov.classList.add('open');setTimeout(function(){inp.focus();inp.select()},50);var done=function(val){ov.classList.remove('open');ok.onclick=ca.onclick=ov.onclick=inp.onkeydown=null;document.removeEventListener('keydown',k);res(val)};var k=function(e){if(e.key==='Escape')done(null)};ok.onclick=function(){done(inp.value)};ca.onclick=function(){done(null)};ov.onclick=function(e){if(e.target===ov)done(null)};inp.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();done(inp.value)}};document.addEventListener('keydown',k)})}

function sb() { return window.__rootsSupabaseClient; }

const SOP_TOKENLESS = window.RootsUserBridge?.TOKENLESS_EMBED === true;

async function sopBroker(payload) {
    if (!SOP_TOKENLESS) throw new Error('Broker ist nicht aktiv');
    return window.RootsUserBridge.request('sop', payload);
}

function createBlobUrl(base64Data, mimeType) {
    try {
        const byteString = atob(base64Data.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], {type: mimeType});
        return URL.createObjectURL(blob);
    } catch(e) {
        return base64Data;
    }
}

const createCardData = (title) => ({
    title: title,
    sections: [
        { name: "Ziel", icon: "fa-solid fa-bullseye", items: [{text: "Ziel hier definieren...", attachments: []}] },
        { name: "Subschritte", icon: "fa-solid fa-list-check", items: [{text: "Erster Schritt...", attachments: []}] },
        { name: "Assets", icon: "fa-solid fa-file-lines", items: [] },
        { name: "Tools, Templates & Frameworks", icon: "fa-solid fa-screwdriver-wrench", items: [] },
        { name: "Erfolgreich wenn", icon: "fa-regular fa-circle-check", items: [{text: "Erfolgskriterium definieren...", attachments: []}] }
    ]
});

const createCardWithSteps = (title, steps) => {
    const card = createCardData(title);
    const section = card.sections.find(sec => sec.name === "Subschritte");
    if (section && Array.isArray(steps) && steps.length) {
        section.items = steps.map(text => ({ text, attachments: [] }));
    }
    return card;
};

const DEFAULT_DATA = [
    {
        title: "Track 1 – Pre-Engagement", class: "track-pre",
        phases: [
            { name: "Anbahnung", cards: [
                createCardData("Bedarfserkennung / Problem Sensing"),
                createCardData("Erstgespräch / ROOTS Vorstellung"),
            ] },
            { name: "Exploration", cards: [
                createCardData("Problem Verstehen"),
                createCardData("Zielstellung klären"),
                createCardData("Initiale Analyse"),
                createCardData("Initiale Hypothese(n)"),
            ] },
            { name: "Pitch", cards: [
                createCardData("Projektablauf skizzieren"),
                createCardData("KVA aufsetzen"),
                createCardData("Kundenpitch oder E-Mail Kommunikation"),
            ] },
        ]
    },
    {
        title: "Track 2 – Execution", class: "track-ops",
        phases: [
            { name: "Ramp-up", cards: [ createCardWithSteps("Ramp-up", [
                "Vertrag",
                "Team-Staffing, Rollenverteilung",
                "Detaillierter Workplan & Projektplan",
                "Zugänge",
                "Daten",
                "Kick-off / Client-Onboarding & Erwartungsmanagement",
            ]) ] },
            { name: "Analyse", cards: [ createCardWithSteps("Analyse", [
                "Datenanforderung & -erhebung",
                "IST-Analyse",
                "Benchmarking",
            ]) ] },
            { name: "Synthese", cards: [ createCardWithSteps("Synthese", [
                "„So-What“-Extraktion aus Analysen",
                "Storyline (Pyramid Principle)",
                "Priorisierung",
                "Business-Case",
                "Roadmap & Next Steps",
                "Executive Summary",
            ]) ] },
            { name: "Delivery", cards: [ createCardWithSteps("Delivery", [
                "Charting",
                "(Steering-Committee) Präsentation(en)",
                "ggf. Q&A im JFX",
                "Elevator Test für kommunikative Stärke der Empfehlung",
                "Auslieferung / Sign-off",
            ]) ] },
            { name: "Implementierung", cards: [ createCardWithSteps("Implementierung", [
                "Capability Building & Training",
                "Change-Management",
                "Governance",
                "Pilot-Design & Durchführung",
                "Monitoring",
            ]) ] },
        ]
    },
    {
        title: "Track 3 – Post-Engagement", class: "track-post",
        phases: [
            { name: "Closeout", cards: [ createCardWithSteps("Closeout", [
                "Finale Übergabe",
                "Rechnung",
                "Team-Feedback & Evaluation (NPS)",
                "Internes Review & Learnings",
                "Interne Margin-Analyse",
            ]) ] },
            { name: "Follow-up", cards: [ createCardWithSteps("Follow-up", [
                "KPI-Tracking",
                "Case-Study-Entwicklung",
                "Nachfrage weiterer Beratungsbedarf",
            ]) ] },
        ]
    }
];

let isOffline = false;
let originalEditContent = "";
let lastLoadedRevisionId = null;
let lastLoadedRevisionAt = null;
let sopBootDone = false;
let activeRichTextEditor = null;
let pendingRichTextControl = null;
let searchDebounceTimer = null;
let activeInlineEdit = null;
let sopViewMode = 'edit';
let readModeIndex = 0;
let sopNav = { trackIndex: 0, phaseIndex: null };
let sopNavHover = { trackIndex: null, phaseIndex: null };
let sopNavRefreshTimer = null;

const SOP_TRACK_NAV_CLASS = {
    'track-pre': 'sop-nav-track--pre',
    'track-ops': 'sop-nav-track--ops',
    'track-post': 'sop-nav-track--post'
};

// --- TOAST SYSTEM ---
function showToast(message, type = 'info', undoCallback = null) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = type === 'success' ? 'fa-solid fa-check' : (type === 'error' ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-circle-info');
    toast.innerHTML = `<i class="${icon}"></i> <span>${message}</span>`;
    if (undoCallback) {
        const btn = document.createElement('button');
        btn.className = 'toast-undo-btn';
        btn.innerText = 'Rückgängig';
        btn.onclick = () => { undoCallback(); toast.remove(); };
        toast.appendChild(btn);
    }
    container.appendChild(toast);
    setTimeout(() => { if(toast.parentElement) toast.remove(); }, 5000);
}

// --- LOCAL STORAGE AUTO-SAVE ---
function saveToLocal() {
    const data = serializeBoardFromDOM();
    try { localStorage.setItem('roots_sop_autosave_v2', JSON.stringify(data)); } catch (_) { /* sandboxed iframe: no localStorage */ }
    updateSectionItemCounts();
    updateCardMetaChips();
}

function loadFromLocal() {
    try {
        const saved = localStorage.getItem('roots_sop_autosave_v2');
        return saved ? JSON.parse(saved) : null;
    } catch (_) {
        return null;
    }
}

function fmtRevisionDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
        + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function showBoardLoading(message = 'SOP wird geladen…') {
    const board = document.getElementById('main-board');
    if (!board) return;
    board.innerHTML = `<div style="text-align:center;padding:50px"><i class="fa-solid fa-spinner fa-spin" style="font-size:2rem;color:var(--brand)"></i><p style="margin-top:1rem;color:var(--muted);font-size:.9rem">${message}</p></div>`;
}

function applyRevisionSnapshot(snapshot, meta = {}) {
    if (!Array.isArray(snapshot) || snapshot.length === 0) {
        renderBoard(DEFAULT_DATA);
        return false;
    }
    renderBoard(snapshot);
    saveToLocal();
    lastLoadedRevisionId = meta.id || null;
    lastLoadedRevisionAt = meta.created_at || null;
    return true;
}

async function loadLatestRevision() {
    const client = sb();
    if (!client && !SOP_TOKENLESS) {
        setOnlineStatus(false);
        renderBoard(loadFromLocal() || DEFAULT_DATA);
        showToast('Supabase nicht verbunden. Lokale Kopie geladen.', 'error');
        return;
    }

    if (!SOP_TOKENLESS) {
        const { data: { session } } = await client.auth.getSession();
        if (!session) { showBoardLoading('Bitte anmelden…'); return; }
    }

    showBoardLoading();

    try {
        let data;
        if (SOP_TOKENLESS) data = await sopBroker({ action: 'latest' });
        else {
            const result = await client.from('sop_revisions')
                .select('id, snapshot, created_at, label, author_name')
                .order('created_at', { ascending: false }).limit(1).maybeSingle();
            if (result.error) throw result.error;
            data = result.data;
        }

        if (data && applyRevisionSnapshot(data.snapshot, data)) {
            setOnlineStatus(true);
            return;
        }

        setOnlineStatus(true);
        renderBoard(DEFAULT_DATA);
        saveToLocal();
    } catch (error) {
        console.error('loadLatestRevision', error);
        setOnlineStatus(false);
        const localData = loadFromLocal();
        renderBoard(localData || DEFAULT_DATA);
        showToast('Cloud-Laden fehlgeschlagen. Lokale Kopie wird angezeigt.', 'error');
    }
}

function setupDashboardUI() {
    const board = document.getElementById('main-board');
    if (board && !board._sopInputBound) {
        board._sopInputBound = true;
        board.addEventListener('input', saveToLocal);
    }
    const rtToolbar = document.getElementById('rt-fullscreen-toolbar');
    if (rtToolbar) rtToolbar.innerHTML = buildRichTextToolbar(false, false);
    setupInlineEditMouseFix();
    document.addEventListener('paste', handleEditorPaste);
    document.addEventListener('keydown', handleGlobalKeydown);
    checkOnboarding();
    if (!window._sopPollInterval) {
        window._sopPollInterval = setInterval(pollForChanges, 30000);
    }

    const readBtn = document.getElementById('sop-mode-read-btn');
    const editBtn = document.getElementById('sop-mode-edit-btn');
    if (readBtn && !readBtn._sopBound) {
        readBtn._sopBound = true;
        readBtn.addEventListener('click', () => setSopViewMode('read'));
    }
    if (editBtn && !editBtn._sopBound) {
        editBtn._sopBound = true;
        editBtn.addEventListener('click', () => setSopViewMode('edit'));
    }
    const navTree = document.getElementById('sop-nav-tree');
    if (navTree && !navTree._sopBound) {
        navTree._sopBound = true;
        navTree.addEventListener('click', handleSopNavClick);
    }
    setupSopNavHoverSync();
    setupReadEmbedInteractions();
    document.getElementById('read-mode-prev')?.addEventListener('click', readModePrev);
    document.getElementById('read-mode-next')?.addEventListener('click', readModeNext);
}

function initDashboard() {
    setupDashboardUI();
    showBoardLoading();
}

function bootSopAfterAuth() {
    if (sopBootDone) return;
    sopBootDone = true;
    loadLatestRevision();
}

function setOnlineStatus(online) {
    isOffline = !online;
    const badge = document.getElementById('roots-sync-status') || document.getElementById('sync-status');
    if (!badge) return;
    badge.classList.remove('online', 'offline');
    badge.classList.add(online ? 'online' : 'offline');
    badge.title = online ? 'Online' : 'Offline – Änderungen werden lokal gespeichert';
    badge.innerHTML = online
        ? '<i class="fa-solid fa-cloud"></i> Online'
        : '<i class="fa-solid fa-triangle-exclamation"></i> Offline (Lokal)';
}

document.addEventListener('DOMContentLoaded', initDashboard);

const _origRootsLoadAndMount = window.RootsUser?._loadAndMount?.bind(window.RootsUser);
if (window.RootsUser && _origRootsLoadAndMount) {
    window.RootsUser._loadAndMount = async function (client) {
        await _origRootsLoadAndMount(client);
        bootSopAfterAuth();
    };
}
document.addEventListener('DOMContentLoaded', () => {
    sb()?.auth.getSession().then(({ data: { session } }) => {
        if (session) bootSopAfterAuth();
    });
});

function setupInlineEditMouseFix() {
    document.addEventListener('mousedown', (e) => {
        const editBtn = e.target.closest('.edit-pen, .edit-title-icon, .edit-item-icon');
        if (editBtn) e.preventDefault();
    });
}

// --- COLLABORATION POLLING ---
async function pollForChanges() {
    const client = sb();
    if ((!client && !SOP_TOKENLESS) || isOffline) return;
    try {
        let data;
        if (SOP_TOKENLESS) data = await sopBroker({ action: 'head' });
        else {
            const { data: sessionData } = await client.auth.getSession();
            if (!sessionData.session) return;
            const result = await client.from('sop_revisions').select('id, created_at')
                .order('created_at', { ascending: false }).limit(1).maybeSingle();
            if (result.error) return;
            data = result.data;
        }
        if (!data) return;
        if (lastLoadedRevisionId && data.id !== lastLoadedRevisionId) {
            showToast('Eine neuere Version ist verfügbar!', 'info', () => { location.reload(); });
        } else if (!lastLoadedRevisionId && data.created_at && data.created_at !== lastLoadedRevisionAt) {
            showToast('Eine neuere Version ist verfügbar!', 'info', () => { location.reload(); });
        }
    } catch (e) { /* ignore poll errors */ }
}

// --- ONBOARDING ---
function checkOnboarding() {
    try {
        if (!localStorage.getItem('roots_sop_onboarding_done')) {
            showToast("Willkommen! Klicke auf die Stift-Icons, um Texte zu bearbeiten.", "info");
            localStorage.setItem('roots_sop_onboarding_done', 'true');
        }
    } catch (_) { /* sandboxed iframe: no localStorage */ }
}

// --- ESCAPE & KEYDOWN HANDLING ---
function handleGlobalKeydown(e) {
    if (e.key === 'Escape') {
        const richTextModal = document.getElementById('rt-fullscreen-modal');
        if (richTextModal && richTextModal.style.display === 'flex') { closeRichTextFullscreen(); return; }
        const fsOverlay = document.getElementById('fs-overlay');
        if (fsOverlay.classList.contains('show')) { closeFullscreen(); return; }
        if (document.body.classList.contains('sop-mode-read')) { setSopViewMode('edit'); return; }
        const visibleModal = document.querySelector('.modal-overlay[style*="display: flex"]');
        if (visibleModal) { closeModal(visibleModal.id); return; }
        if (activeInlineEdit) { finishInlineEdit(activeInlineEdit.icon, activeInlineEdit.target, false); return; }
        document.getElementById('item-add-menu').classList.remove('show');
        const exportMenu = document.getElementById('export-menu');
        if (exportMenu) exportMenu.classList.remove('show');
    }

    if (document.body.classList.contains('sop-mode-read') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;
        e.preventDefault();
        if (e.key === 'ArrowLeft') readModePrev();
        else readModeNext();
        return;
    }

    if (e.key === 'Enter') {
        const tagModal = document.getElementById('tag-modal');
        if (tagModal && tagModal.style.display === 'flex' && document.activeElement === document.getElementById('modal-tag-name')) { confirmTagAdd(); return; }
        const linkModal = document.getElementById('link-modal');
        if (linkModal && linkModal.style.display === 'flex' && (document.activeElement === document.getElementById('modal-link-url') || document.activeElement === document.getElementById('modal-link-name'))) { confirmLinkAdd(); return; }
        const rtLinkModal = document.getElementById('rt-link-modal');
        if (rtLinkModal && rtLinkModal.style.display === 'flex' && document.activeElement === document.getElementById('rt-link-input')) { confirmRichTextLink(); return; }
        const rtTableModal = document.getElementById('rt-table-modal');
        if (rtTableModal && rtTableModal.style.display === 'flex' && (document.activeElement === document.getElementById('rt-table-rows') || document.activeElement === document.getElementById('rt-table-cols'))) { confirmRichTextTable(); return; }
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
    if (id === 'rt-link-modal' || id === 'rt-table-modal') pendingRichTextControl = null;
}

// --- EDIT HANDLING ---
function getEditableTarget(el) {
    if (!el) return null;
    if (el.dataset.editSelector) {
        const scope = el.dataset.editScope ? el.closest(el.dataset.editScope) : null;
        const root = scope || el.closest('.sop-card, .phase-col, .track, .field, .item-container, .tag') || document;
        return root.querySelector(el.dataset.editSelector);
    }
    if (el._editTarget && el._editTarget.isConnected) return el._editTarget;
    const wrapTarget = el.closest('.edit-wrap')?.querySelector('.edit-target');
    if (wrapTarget) return wrapTarget;
    if (el.classList.contains('action-btn-small')) return el.closest('.item-row')?.querySelector('.edit-target') || null;
    return el.previousElementSibling;
}

function finishInlineEdit(el, target, save = true) {
    if (!target) return;
    const handlers = target._editHandlers || {};
    target.removeEventListener('input', handlers.input);
    target.removeEventListener('keydown', handlers.keydown);
    target.removeEventListener('blur', handlers.blur);
    target._editHandlers = null;
    if (!save && target.dataset.originalText !== undefined) target.innerText = target.dataset.originalText;
    delete target.dataset.originalText;
    target.contentEditable = "false";
    el.classList.remove('fa-floppy-disk');
    el.classList.add('fa-pen');
    if (activeInlineEdit && activeInlineEdit.target === target) activeInlineEdit = null;
    const isNavLabel = target.closest('.track-name') || target.closest('.phase-label');
    saveToLocal();
    if (isNavLabel) scheduleSopNavRefresh();
}

function startInlineEdit(el, target, maxLength = 500) {
    if (activeInlineEdit && activeInlineEdit.target !== target) finishInlineEdit(activeInlineEdit.icon, activeInlineEdit.target, true);
    originalEditContent = target.innerText;
    target.dataset.originalText = target.innerText;
    target.contentEditable = "true";
    target.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(target);
    selection.removeAllRanges();
    selection.addRange(range);
    el.classList.remove('fa-pen');
    el.classList.add('fa-floppy-disk');
    const inputHandler = function() {
        if (this.innerText.length > maxLength) {
            this.innerText = this.innerText.substring(0, maxLength);
            const sel = window.getSelection();
            const r = document.createRange();
            r.selectNodeContents(this);
            r.collapse(false);
            sel.removeAllRanges();
            sel.addRange(r);
            showToast(`Maximal ${maxLength} Zeichen erlaubt.`, 'error');
        }
    };
    const keydownHandler = function(ev) {
        if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); finishInlineEdit(el, target, true); target.blur(); }
        if (ev.key === 'Escape') { ev.preventDefault(); finishInlineEdit(el, target, false); target.blur(); }
    };
    const blurHandler = function() {
        if (target.contentEditable === "true") finishInlineEdit(el, target, true);
    };
    target._editHandlers = { input: inputHandler, keydown: keydownHandler, blur: blurHandler };
    target.addEventListener('input', inputHandler);
    target.addEventListener('keydown', keydownHandler);
    target.addEventListener('blur', blurHandler);
    activeInlineEdit = { icon: el, target };
}

function makeEditable(el, event, maxLength = 500) {
    if(event) event.stopPropagation();
    const target = getEditableTarget(el);
    if (!target) return;
    el._editTarget = target;
    if (target.contentEditable === "true" || el.classList.contains('fa-floppy-disk')) {
        finishInlineEdit(el, target, true);
        target.blur();
        return;
    }
    startInlineEdit(el, target, maxLength);
}

// --- SOFT DELETE ---
function softDelete(element, itemName) {
    element.style.display = 'none';
    saveToLocal();
    let isDeleted = true;
    showToast(`${itemName} gelöscht`, 'info', () => {
        element.style.display = '';
        isDeleted = false;
        saveToLocal();
    });
    setTimeout(() => {
        if (isDeleted && element.parentElement) { element.remove(); saveToLocal(); }
    }, 5000);
}

function deleteCard(btn, event) {
    event.stopPropagation();
    softDelete(btn.closest('.sop-card'), 'Karte');
}

// --- SEARCH ---
function normalizeForSearch(value = '') {
    return String(value).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

function filterCardsDebounced(query) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => filterCards(query), 100);
}

function filterCards(query) {
    const searchInput = document.getElementById('global-search');
    const normalizedQuery = normalizeForSearch(query);
    let matchCount = 0;
    document.querySelectorAll('.sop-card').forEach(card => {
        card.classList.remove('search-match', 'search-nomatch');
        if (!normalizedQuery) return;
        const text = normalizeForSearch(card.innerText);
        if (text.includes(normalizedQuery)) { card.classList.add('search-match'); matchCount += 1; }
        else card.classList.add('search-nomatch');
    });
    if (searchInput) searchInput.title = normalizedQuery ? `${matchCount} Treffer` : '';
}

// --- TAG MODAL ---
function confirmTagAdd() {
    const name = document.getElementById('modal-tag-name').value.trim();
    if (!name) { showToast("Bitte einen Tag-Namen eingeben.", "error"); return; }
    if (!currentAttachWrapper) return;
    currentAttachWrapper.insertAdjacentHTML('beforeend',
        `<span class="attachment-item tag" data-type="tag" data-name="${name}">
            <span class="edit-target">${name}</span>
            <i class="fa-solid fa-pen edit-pen" onclick="makeEditable(this, event)"></i>
            <i class="fa-solid fa-xmark tag-delete-btn" onclick="softDelete(this.closest('.tag'), 'Tag')"></i>
        </span>`
    );
    document.getElementById('tag-modal').style.display = 'none';
    saveToLocal();
}

function escapeHtml(value = '') {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escapeAttr(value = '') {
    return escapeHtml(value).replace(/`/g, '&#96;');
}

function plainTextFromRichHtml(html, max) {
    const d = document.createElement('div');
    d.innerHTML = sanitizeRichTextHTML(html || '');
    const t = (d.textContent || '').replace(/\s+/g, ' ').trim();
    if (!max) return t;
    if (t.length <= max) return t;
    return t.slice(0, max) + '…';
}

function buildCompactLinkHtml(url, name) {
    return `<div class="attachment-item attachment-compact attachment-link preview-box" data-type="link" data-url="${escapeAttr(url)}" data-name="${escapeAttr(name)}">
    <div class="attachment-compact-main"><i class="fa-solid fa-link" style="color:var(--brand);"></i> <a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer" style="font-weight:600;">${escapeHtml(name)}</a>
    <span style="color:var(--muted); font-size:0.78rem; display:block; margin-top:2px; word-break:break-all;">${escapeHtml(url)}</span>
    </div>
    <div class="attachment-compact-actions">
        <button type="button" class="ac-btn" title="Vollbild" aria-label="Vollbild" onclick="openFullscreenFromDOM(this)" data-mime="link" data-url="${escapeAttr(url)}"><i class="fa-solid fa-expand" aria-hidden="true"></i></button>
        <button type="button" class="ac-btn danger" title="Entfernen" aria-label="Entfernen" onclick="softDelete(this.closest('.attachment-item'), 'Link')"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>
    </div>
</div>`;
}

function buildCompactFileHtml(name, base64Data, mime) {
    const isViewable = String(mime || '').startsWith('image/') || mime === 'application/pdf';
    return `<div class="attachment-item attachment-compact preview-box" data-type="file" data-name="${escapeAttr(name)}" data-mime="${escapeAttr(mime || '')}">
        <textarea class="hidden-base64-data" style="display:none;">${base64Data}</textarea>
        <div class="attachment-compact-main">
            <i class="fa-solid fa-paperclip" style="color:var(--brand);"></i>
            <span style="font-weight:600; word-break:break-word;">${escapeHtml(name)}</span>
            <span style="color:var(--muted); font-size:0.78rem;">${escapeHtml(mime || 'Datei')}</span>
        </div>
        <div class="attachment-compact-actions">
            ${isViewable ? `<button type="button" class="ac-btn" title="Vollbild" aria-label="Vollbild" onclick="openFullscreenFromDOM(this)" data-mime="${escapeAttr(mime || '')}"><i class="fa-solid fa-expand" aria-hidden="true"></i></button>` : ''}
            <button type="button" class="ac-btn danger" title="Entfernen" aria-label="Entfernen" onclick="softDelete(this.closest('.attachment-item'), 'Datei')"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>
        </div>
    </div>`;
}

function sanitizeRichTextLink(href = '') {
    const value = String(href || '').trim();
    if (!value) return '#';
    if (/^(https?:\/\/|mailto:|#|\/)/i.test(value)) return value;
    return '#';
}

function sanitizeRichTextHTML(html = '') {
    const allowedTags = new Set(['P','BR','STRONG','B','EM','I','U','S','STRIKE','UL','OL','LI','H1','H2','H3','BLOCKQUOTE','PRE','CODE','TABLE','THEAD','TBODY','TR','TH','TD','A','HR','DIV','SPAN']);
    const template = document.createElement('template');
    template.innerHTML = String(html || '');
    const cleanNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent || '');
        if (node.nodeType !== Node.ELEMENT_NODE) return document.createDocumentFragment();
        const tag = node.tagName.toUpperCase();
        if (tag === 'SCRIPT' || tag === 'STYLE') return document.createDocumentFragment();
        if (!allowedTags.has(tag)) {
            const fragment = document.createDocumentFragment();
            Array.from(node.childNodes).forEach((child) => fragment.appendChild(cleanNode(child)));
            return fragment;
        }
        const clean = document.createElement(tag.toLowerCase());
        if (tag === 'A') {
            clean.setAttribute('href', sanitizeRichTextLink(node.getAttribute('href') || ''));
            clean.setAttribute('target', '_blank');
            clean.setAttribute('rel', 'noopener noreferrer');
        }
        Array.from(node.childNodes).forEach((child) => clean.appendChild(cleanNode(child)));
        return clean;
    };
    const output = document.createElement('div');
    Array.from(template.content.childNodes).forEach((child) => output.appendChild(cleanNode(child)));
    return output.innerHTML;
}

function insertHTMLAtCursor(html = '') {
    if (typeof document.execCommand === 'function') {
        try { if (document.execCommand('insertHTML', false, html)) return; } catch (e) {}
    }
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const fragment = document.createDocumentFragment();
    let node = null, lastNode = null;
    while ((node = tmp.firstChild)) { lastNode = fragment.appendChild(node); }
    range.insertNode(fragment);
    if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

function insertPlainTextAtCursor(text = '', keepLineBreaks = true) {
    const raw = String(text || '');
    const normalized = keepLineBreaks ? raw.replace(/\r\n?/g, '\n') : raw.replace(/[\r\n]+/g, ' ');
    if (typeof document.execCommand === 'function') {
        try { if (document.execCommand('insertText', false, normalized)) return; } catch (e) {}
    }
    insertHTMLAtCursor(escapeHtml(normalized).replace(/\n/g, '<br>'));
}

function handleEditorPaste(event) {
    const rawTarget = event.target;
    const targetEl = rawTarget instanceof Element ? rawTarget : (rawTarget && rawTarget.parentElement ? rawTarget.parentElement : null);
    const editableTarget = targetEl ? targetEl.closest('[contenteditable="true"]') : null;
    if (!editableTarget) return;
    event.preventDefault();
    const clipboard = event.clipboardData || window.clipboardData;
    const plainText = clipboard ? clipboard.getData('text/plain') : '';
    const htmlText = clipboard ? clipboard.getData('text/html') : '';
    const isRichText = editableTarget.classList.contains('rt-editor') || editableTarget.id === 'rt-fullscreen-editor';
    if (isRichText) {
        const sanitized = htmlText ? sanitizeRichTextHTML(htmlText) : '';
        if (sanitized.trim()) insertHTMLAtCursor(sanitized);
        else insertPlainTextAtCursor(plainText, true);
    } else {
        insertPlainTextAtCursor(plainText, false);
    }
    editableTarget.dispatchEvent(new Event('input', { bubbles: true }));
}

function getRichTextEditorFromControl(control) {
    const container = control.closest('.rt-container');
    return container ? container.querySelector('.rt-editor') : null;
}

function runRichTextCommand(control, command, value = null) {
    const editor = getRichTextEditorFromControl(control);
    if (!editor) return;
    editor.focus();
    document.execCommand(command, false, value);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
}

function applyRichTextBlock(selectEl) {
    const blockTag = selectEl.value || 'P';
    runRichTextCommand(selectEl, 'formatBlock', `<${blockTag}>`);
}

function applyRichTextColor(inputEl, command) {
    runRichTextCommand(inputEl, command, inputEl.value);
}

function insertRichTextLink(control) {
    pendingRichTextControl = control;
    const input = document.getElementById('rt-link-input');
    input.value = 'https://';
    document.getElementById('rt-link-modal').style.display = 'flex';
    setTimeout(() => input.focus(), 30);
}

function confirmRichTextLink() {
    let url = document.getElementById('rt-link-input').value;
    if (!url || !pendingRichTextControl) { showToast("Bitte zuerst eine URL eingeben.", "error"); return; }
    url = url.trim();
    if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) url = `https://${url}`;
    runRichTextCommand(pendingRichTextControl, 'createLink', url);
    closeModal('rt-link-modal');
    pendingRichTextControl = null;
}

function insertRichTextTable(control) {
    pendingRichTextControl = control;
    document.getElementById('rt-table-rows').value = '3';
    document.getElementById('rt-table-cols').value = '3';
    document.getElementById('rt-table-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('rt-table-rows').focus(), 30);
}

function confirmRichTextTable() {
    if (!pendingRichTextControl) return;
    const rows = Math.max(1, Math.min(12, parseInt(document.getElementById('rt-table-rows').value || '3', 10) || 3));
    const cols = Math.max(1, Math.min(8, parseInt(document.getElementById('rt-table-cols').value || '3', 10) || 3));
    let table = '<table><thead><tr>';
    for (let c = 0; c < cols; c++) table += `<th>Spalte ${c + 1}</th>`;
    table += '</tr></thead><tbody>';
    for (let r = 0; r < rows; r++) {
        table += '<tr>';
        for (let c = 0; c < cols; c++) table += `<td>Zelle ${r + 1}.${c + 1}</td>`;
        table += '</tr>';
    }
    table += '</tbody></table><p><br></p>';
    runRichTextCommand(pendingRichTextControl, 'insertHTML', table);
    closeModal('rt-table-modal');
    pendingRichTextControl = null;
}

function insertRichTextCodeBlock(control) {
    const editor = getRichTextEditorFromControl(control);
    if (!editor) return;
    editor.focus();
    const selectedText = window.getSelection ? window.getSelection().toString() : '';
    const codeContent = escapeHtml(selectedText || 'Code hier einfügen...');
    document.execCommand('insertHTML', false, `<pre><code>${codeContent}</code></pre>`);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
}

function buildRichTextToolbar(includeDelete = true, includeFullscreen = true) {
    const deleteBtn = includeDelete
        ? `<button class="rt-btn" onmousedown="event.preventDefault()" style="color:var(--danger);" onclick="softDelete(this.closest('.rt-container'), 'Textblock')" title="Textblock löschen"><i class="fa-solid fa-trash"></i></button>`
        : '';
    const fullscreenBtn = includeFullscreen
        ? `<button class="rt-btn" onmousedown="event.preventDefault()" onclick="openRichTextFullscreen(this)" title="Vollbild bearbeiten"><i class="fa-solid fa-expand"></i></button>`
        : '';
    return `
        <div class="rt-toolbar-group">
            <select class="rt-select" onchange="applyRichTextBlock(this)" title="Textstil">
                <option value="P">Absatz</option>
                <option value="H1">Headline 1</option>
                <option value="H2">Headline 2</option>
                <option value="H3">Headline 3</option>
                <option value="BLOCKQUOTE">Zitat</option>
            </select>
        </div>
        <div class="rt-toolbar-group">
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'undo')" title="Rückgängig"><i class="fa-solid fa-rotate-left"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'redo')" title="Wiederholen"><i class="fa-solid fa-rotate-right"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'bold')" title="Fett"><i class="fa-solid fa-bold"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'italic')" title="Kursiv"><i class="fa-solid fa-italic"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'underline')" title="Unterstrichen"><i class="fa-solid fa-underline"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'strikeThrough')" title="Durchgestrichen"><i class="fa-solid fa-strikethrough"></i></button>
        </div>
        <div class="rt-toolbar-group">
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'insertUnorderedList')" title="Aufzählung"><i class="fa-solid fa-list-ul"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'insertOrderedList')" title="Nummerierte Liste"><i class="fa-solid fa-list-ol"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'outdent')" title="Ausrückung verringern"><i class="fa-solid fa-outdent"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'indent')" title="Ausrückung erhöhen"><i class="fa-solid fa-indent"></i></button>
        </div>
        <div class="rt-toolbar-group">
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'justifyLeft')" title="Linksbündig"><i class="fa-solid fa-align-left"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'justifyCenter')" title="Zentriert"><i class="fa-solid fa-align-center"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'justifyRight')" title="Rechtsbündig"><i class="fa-solid fa-align-right"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'justifyFull')" title="Blocksatz"><i class="fa-solid fa-align-justify"></i></button>
        </div>
        <div class="rt-toolbar-group">
            <input type="color" class="rt-color-input" title="Textfarbe" value="#1f2937" onchange="applyRichTextColor(this, 'foreColor')">
            <input type="color" class="rt-color-input" title="Hintergrundfarbe" value="#fff59d" onchange="applyRichTextColor(this, 'hiliteColor')">
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="insertRichTextLink(this)" title="Link einfügen"><i class="fa-solid fa-link"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="insertRichTextTable(this)" title="Tabelle einfügen"><i class="fa-solid fa-table"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="insertRichTextCodeBlock(this)" title="Codeblock einfügen"><i class="fa-solid fa-code"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'insertHorizontalRule')" title="Trennlinie"><i class="fa-solid fa-minus"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'removeFormat')" title="Formatierung entfernen"><i class="fa-solid fa-text-slash"></i></button>
        </div>
        <div style="flex:1 1 auto;"></div>
        <div class="rt-toolbar-group">${fullscreenBtn}${deleteBtn}</div>
    `;
}

function renderRichTextAttachment(html = 'Text hier eingeben...') {
    const safe = sanitizeRichTextHTML(html);
    const hint = plainTextFromRichHtml(html, 200);
    return `<div class="attachment-item rt-container rt-container-compact" data-type="richtext">
        <div class="rt-compact-hint"><i class="fa-solid fa-font" style="color:var(--brand); margin-right:6px;" aria-hidden="true"></i><span>${escapeHtml(hint || 'Formatierter Text – Inhalt in der Karte unten bearbeiten')}</span></div>
        <div class="rt-toolbar">${buildRichTextToolbar(true, true)}</div>
        <div class="rt-editor" contenteditable="true">${safe}</div>
    </div>`;
}

function openRichTextFullscreen(control) {
    const editor = getRichTextEditorFromControl(control);
    if (!editor) return;
    activeRichTextEditor = editor;
    const fullscreenEditor = document.getElementById('rt-fullscreen-editor');
    fullscreenEditor.innerHTML = editor.innerHTML;
    document.getElementById('rt-fullscreen-modal').style.display = 'flex';
    setTimeout(() => fullscreenEditor.focus(), 20);
}

function syncRichTextFullscreen() {
    if (!activeRichTextEditor) return;
    const fullscreenEditor = document.getElementById('rt-fullscreen-editor');
    activeRichTextEditor.innerHTML = fullscreenEditor.innerHTML;
    saveToLocal();
}

function closeRichTextFullscreen() {
    syncRichTextFullscreen();
    document.getElementById('rt-fullscreen-modal').style.display = 'none';
    activeRichTextEditor = null;
}

// --- EXPORT ---
function openExportMenu(btn, event) {
    event.stopPropagation();
    const menu = document.getElementById('export-menu');
    menu.classList.toggle('show');
}

function exportJSON() {
    document.getElementById('export-menu').classList.remove('show');
    const data = serializeBoardFromDOM();
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `roots-sop-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function exportMarkdown() {
    document.getElementById('export-menu').classList.remove('show');
    const data = serializeBoardFromDOM();
    let md = `# ROOTS Consulting — SOP Dashboard\n\n> Exportiert: ${new Date().toLocaleString('de-DE')}\n\n---\n\n`;
    data.forEach((track, tIdx) => {
        md += `## Track ${tIdx + 1}: ${track.title}\n\n`;
        (track.phases || []).forEach(phase => {
            md += `### Phase: ${phase.name}\n\n`;
            (phase.cards || []).forEach(card => {
                md += `#### 📋 ${card.title}\n\n`;
                (card.sections || []).forEach(sec => {
                    md += `**${sec.name}**\n\n`;
                    (sec.items || []).forEach(item => {
                        md += `- ${item.text}\n`;
                        (item.attachments || []).forEach(att => {
                            if (att.type === 'link') md += `  - 🔗 [${att.name}](${att.url})\n`;
                            if (att.type === 'tag') md += `  - 🏷️ \`${att.name}\`\n`;
                            if (att.type === 'file') md += `  - 📎 ${att.name}\n`;
                        });
                    });
                    md += '\n';
                });
                md += '---\n\n';
            });
        });
    });
    const blob = new Blob([md], {type: "text/markdown;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `roots-sop-${new Date().toISOString().slice(0,10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Markdown exportiert!", "success");
}

function _loadHtml2Canvas(callback) {
    if (typeof html2canvas !== 'undefined') { callback(); return; }
    showToast("Lädt Bibliothek...", "info");
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s.onload = callback;
    s.onerror = () => showToast("Bibliothek konnte nicht geladen werden.", "error");
    document.head.appendChild(s);
}

function exportPNG() {
    document.getElementById('export-menu').classList.remove('show');
    _loadHtml2Canvas(() => {
        showToast("Screenshot wird erstellt...", "info");
        html2canvas(document.getElementById('main-board'), { scale: 1.5, useCORS: true, backgroundColor: '#f4f7fb' })
        .then(canvas => {
            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/png');
            a.download = `roots-sop-${new Date().toISOString().slice(0,10)}.png`;
            a.click();
            showToast("PNG exportiert!", "success");
        }).catch(() => showToast("PNG-Export fehlgeschlagen.", "error"));
    });
}

function exportJPEG() {
    document.getElementById('export-menu').classList.remove('show');
    _loadHtml2Canvas(() => {
        showToast("Screenshot wird erstellt...", "info");
        html2canvas(document.getElementById('main-board'), { scale: 1.5, useCORS: true, backgroundColor: '#ffffff' })
        .then(canvas => {
            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/jpeg', 0.92);
            a.download = `roots-sop-${new Date().toISOString().slice(0,10)}.jpg`;
            a.click();
            showToast("JPEG exportiert!", "success");
        }).catch(() => showToast("JPEG-Export fehlgeschlagen.", "error"));
    });
}

function exportSVG() {
    document.getElementById('export-menu').classList.remove('show');
    const data = serializeBoardFromDOM();
    const CARD_W = 260, CARD_H = 80, PHASE_PAD = 20, TRACK_PAD = 30;
    let svgParts = [], y = 60;
    const colors = { 'track-pre': '#206efb', 'track-ops': '#0f6b57', 'track-post': '#5b21b6' };
    data.forEach((track, tIdx) => {
        const col = colors[track.class] || '#206efb';
        svgParts.push(`<rect x="10" y="${y}" width="98%" height="30" rx="8" fill="${col}22" stroke="${col}" stroke-width="1.5"/>`);
        svgParts.push(`<text x="20" y="${y+20}" font-size="13" font-weight="bold" fill="${col}">${track.title}</text>`);
        y += 40;
        let x = 20;
        (track.phases || []).forEach(phase => {
            svgParts.push(`<text x="${x+5}" y="${y+12}" font-size="9" font-weight="bold" fill="#64748b">${phase.name.toUpperCase()}</text>`);
            let cy = y + 20;
            (phase.cards || []).forEach(card => {
                svgParts.push(`<rect x="${x}" y="${cy}" width="${CARD_W}" height="${CARD_H}" rx="8" fill="white" stroke="#e2e8f0" stroke-width="1"/>`);
                svgParts.push(`<text x="${x+10}" y="${cy+22}" font-size="11" font-weight="bold" fill="#0f172a">${card.title.substring(0,32)}</text>`);
                const secCount = (card.sections||[]).reduce((a,s)=>a+s.items.length,0);
                svgParts.push(`<text x="${x+10}" y="${cy+40}" font-size="9" fill="#64748b">${secCount} Einträge</text>`);
                cy += CARD_H + 10;
            });
            x += CARD_W + PHASE_PAD;
        });
        y += 300 + TRACK_PAD;
    });
    const totalW = Math.max(...data.map(t => (t.phases||[]).length)) * (CARD_W + PHASE_PAD) + 60;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${y+50}" style="font-family:system-ui,sans-serif;">\n<rect width="100%" height="100%" fill="#f4f7fb"/>\n<text x="20" y="35" font-size="16" font-weight="bold" fill="#0f172a">ROOTS Consulting — SOP Dashboard</text>\n${svgParts.join('\n')}\n</svg>`;
    const blob = new Blob([svg], {type: "image/svg+xml"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `roots-sop-${new Date().toISOString().slice(0,10)}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("SVG exportiert!", "success");
}

function exportPrint() {
    document.getElementById('export-menu').classList.remove('show');
    window.print();
}

function renderSnapshotAttachment(att) {
    if (att.type === 'link') {
        const url = escapeAttr(att.url || '');
        const name = escapeHtml(att.name || att.url || 'Link');
        return `<div class="snapshot-preview-box"><div class="snapshot-preview-header"><span><i class="fa-solid fa-globe"></i> <a href="${url}" target="_blank">${name}</a></span></div><iframe src="${url}" loading="lazy"></iframe><div class="snapshot-fallback">Falls die Vorschau blockiert ist: <a href="${url}" target="_blank">Link im neuen Tab öffnen</a></div></div>`;
    }
    if (att.type === 'file') {
        const mime = att.mime || '';
        const name = escapeHtml(att.name || 'Datei');
        const data = escapeAttr(att.data || '');
        if (mime.startsWith('image/')) return `<div class="snapshot-preview-box"><div class="snapshot-preview-header"><span><i class="fa-solid fa-image"></i> ${name}</span></div><img src="${data}" alt="${name}"></div>`;
        if (mime === 'application/pdf') return `<div class="snapshot-preview-box"><div class="snapshot-preview-header"><span><i class="fa-solid fa-file-pdf"></i> ${name}</span></div><embed src="${data}" type="application/pdf"></embed></div>`;
        return `<div class="snapshot-preview-box"><div class="snapshot-preview-header"><span><i class="fa-solid fa-file"></i> ${name}</span> <a href="${data}" download="${escapeAttr(att.name || 'datei')}">Download</a></div><iframe src="${data}" loading="lazy"></iframe></div>`;
    }
    if (att.type === 'tag') return `<span class="snapshot-tag"><i class="fa-solid fa-tag"></i> ${escapeHtml(att.name || '')}</span>`;
    if (att.type === 'richtext') return `<div class="snapshot-richtext">${sanitizeRichTextHTML(att.html || '')}</div>`;
    return '';
}

function buildHTMLSnapshot(data) {
    const tracksHtml = data.map((track, tIdx) => {
        const phasesHtml = (track.phases || []).map(phase => {
            const cardsHtml = (phase.cards || []).map(card => {
                const sectionsHtml = (card.sections || []).map(section => {
                    const itemsHtml = (section.items || []).map(item => {
                        const attachmentsHtml = (item.attachments || []).map(renderSnapshotAttachment).join('');
                        return `<div class="snapshot-item"><div class="snapshot-item-title">› ${escapeHtml(item.text || '')}</div><div class="snapshot-attachments">${attachmentsHtml}</div></div>`;
                    }).join('');
                    return `<section class="snapshot-section"><h5>${escapeHtml(section.name || '')}</h5>${itemsHtml}</section>`;
                }).join('');
                return `<article class="snapshot-card"><h4>${escapeHtml(card.title || '')}</h4>${sectionsHtml}</article>`;
            }).join('');
            return `<div class="snapshot-phase"><h3>${escapeHtml(phase.name || '')}</h3>${cardsHtml}</div>`;
        }).join('');
        return `<section class="snapshot-track"><h2>Track ${tIdx + 1}: ${escapeHtml(track.title || '')}</h2>${phasesHtml}</section>`;
    }).join('');

    return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>ROOTS SOP Snapshot</title><style>body{margin:0;padding:24px;font-family:Arial,sans-serif;background:#f4f7fb;color:#0f172a;}.snapshot-track{background:#fff;border:1px solid #dbe3ef;border-radius:10px;margin-bottom:22px;padding:18px;}.snapshot-track h2{margin:0 0 14px 0;color:#206efb;}.snapshot-phase{border-top:1px solid #e2e8f0;padding-top:12px;margin-top:12px;}.snapshot-card{border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:12px;}.snapshot-section{margin-bottom:12px;}.snapshot-item{margin-bottom:10px;}.snapshot-preview-box{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;}.snapshot-preview-box iframe,.snapshot-preview-box embed,.snapshot-preview-box img{width:100%;height:460px;border:0;display:block;}.snapshot-tag{display:inline-flex;align-items:center;gap:6px;border:1px solid #cbd5e1;background:#f8fafc;border-radius:999px;padding:4px 10px;font-size:.8rem;}.snapshot-richtext{border:1px solid #e2e8f0;border-radius:8px;padding:12px;line-height:1.6;}</style></head><body><h1>ROOTS SOP Snapshot</h1><div>Exportiert: ${escapeHtml(new Date().toLocaleString('de-DE'))}</div>${tracksHtml}</body></html>`;
}

function exportHTMLSnapshot() {
    document.getElementById('export-menu').classList.remove('show');
    const data = serializeBoardFromDOM();
    const html = buildHTMLSnapshot(data);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `roots-sop-snapshot-${new Date().toISOString().slice(0,10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("HTML Snapshot exportiert!", "success");
}

// --- RENDER LOGIC ---
function clampSopNav(data) {
    if (!data || !data.length) {
        sopNav = { trackIndex: 0, phaseIndex: null };
        return;
    }
    if (sopNav.trackIndex < 0 || sopNav.trackIndex >= data.length) sopNav.trackIndex = 0;
    const phases = data[sopNav.trackIndex]?.phases || [];
    if (sopNav.phaseIndex !== null && (sopNav.phaseIndex < 0 || sopNav.phaseIndex >= phases.length)) {
        sopNav.phaseIndex = null;
    }
}

function getSopTrackNavClass(trackClass) {
    return SOP_TRACK_NAV_CLASS[trackClass] || '';
}

function renderSopNavTree(data) {
    const tree = document.getElementById('sop-nav-tree');
    if (!tree) return;
    clampSopNav(data);
    let html = '';
    data.forEach((track, tIdx) => {
        const navClass = getSopTrackNavClass(track.class);
        const shortTitle = (track.title || '').replace(/^Track\s*\d+\s*:\s*/i, '').trim() || track.title || `Track ${tIdx + 1}`;
        const trackActive = tIdx === sopNav.trackIndex;
        html += `<div class="sop-nav-track-group" data-track-group="${tIdx}">
            <button type="button" class="dash-nav-item ${navClass}${trackActive ? ' active' : ''}${trackActive && sopNav.phaseIndex !== null ? ' sop-nav-parent-active' : ''}" data-nav-type="track" data-track-index="${tIdx}">
                <i class="fa-solid fa-folder-tree" aria-hidden="true"></i>
                <span>${escapeHtml(shortTitle)}</span>
            </button>
            <div class="sop-nav-phases">`;
        (track.phases || []).forEach((phase, pIdx) => {
            const phaseActive = tIdx === sopNav.trackIndex && sopNav.phaseIndex === pIdx;
            html += `<button type="button" class="dash-nav-item dash-nav-item--sub ${navClass}${phaseActive ? ' active' : ''}" data-nav-type="phase" data-track-index="${tIdx}" data-phase-index="${pIdx}">
                <i class="fa-solid fa-circle" aria-hidden="true"></i>
                <span>${escapeHtml(phase.name || `Phase ${pIdx + 1}`)}</span>
            </button>`;
        });
        html += `</div></div>`;
    });
    tree.innerHTML = html;
    applySopNavHoverHighlight();
}

function applySopNavHoverHighlight() {
    document.querySelectorAll('#sop-nav-tree [data-nav-type]').forEach(btn => {
        const tIdx = parseInt(btn.dataset.trackIndex, 10);
        const isTrack = btn.dataset.navType === 'track';
        const pIdx = btn.dataset.phaseIndex !== undefined ? parseInt(btn.dataset.phaseIndex, 10) : null;
        let hover = false;
        if (sopNavHover.phaseIndex !== null && !Number.isNaN(sopNavHover.phaseIndex)) {
            hover = isTrack
                ? tIdx === sopNavHover.trackIndex
                : tIdx === sopNavHover.trackIndex && pIdx === sopNavHover.phaseIndex;
        } else if (sopNavHover.trackIndex !== null && !Number.isNaN(sopNavHover.trackIndex)) {
            hover = isTrack && tIdx === sopNavHover.trackIndex;
        }
        btn.classList.toggle('sop-nav-hover', hover);
    });
}

function setSopNavHover(trackIndex, phaseIndex = null) {
    if (Number.isNaN(trackIndex)) return;
    sopNavHover = { trackIndex, phaseIndex: phaseIndex !== null && !Number.isNaN(phaseIndex) ? phaseIndex : null };
    applySopNavHoverHighlight();
}

function clearSopNavHover() {
    if (sopNavHover.trackIndex === null && sopNavHover.phaseIndex === null) return;
    sopNavHover = { trackIndex: null, phaseIndex: null };
    applySopNavHoverHighlight();
}

function setupSopNavHoverSync() {
    const board = document.getElementById('main-board');
    if (!board || board._sopNavHoverBound) return;
    board._sopNavHoverBound = true;

    board.addEventListener('mouseover', (e) => {
        if (sopViewMode === 'read') return;
        const phaseCol = e.target.closest('.phase-col:not(.add-phase-col)');
        if (phaseCol) {
            setSopNavHover(
                parseInt(phaseCol.dataset.trackIndex, 10),
                parseInt(phaseCol.dataset.phaseIndex, 10)
            );
            return;
        }
        const track = e.target.closest('.track');
        if (track) {
            setSopNavHover(parseInt(track.dataset.trackIndex, 10), null);
        }
    });

    board.addEventListener('mouseleave', () => clearSopNavHover());
}

function updateSopNavActiveStates() {
    document.querySelectorAll('#sop-nav-tree [data-nav-type]').forEach(btn => {
        const tIdx = parseInt(btn.dataset.trackIndex, 10);
        const isTrack = btn.dataset.navType === 'track';
        const pIdx = btn.dataset.phaseIndex !== undefined ? parseInt(btn.dataset.phaseIndex, 10) : null;
        const trackSelected = tIdx === sopNav.trackIndex;
        const active = isTrack
            ? trackSelected
            : trackSelected && sopNav.phaseIndex === pIdx;
        btn.classList.toggle('active', active);
        btn.classList.toggle('sop-nav-parent-active', isTrack && trackSelected && sopNav.phaseIndex !== null);
    });
}

function syncReadModeIndexFromSopNav() {
    const steps = getReadModeSteps();
    if (!steps.length) return;
    let idx = -1;
    if (sopNav.phaseIndex !== null) {
        idx = steps.findIndex(s => s.trackIndex === sopNav.trackIndex && s.phaseIndex === sopNav.phaseIndex);
    } else {
        idx = steps.findIndex(s => s.trackIndex === sopNav.trackIndex);
    }
    if (idx >= 0) readModeIndex = idx;
}

function syncSopNavFromReadModeIndex() {
    const steps = getReadModeSteps();
    const step = steps[readModeIndex];
    if (!step) return;
    sopNav.trackIndex = step.trackIndex;
    sopNav.phaseIndex = step.phaseIndex;
}

function updateSopNavTitle() {
    const titleEl = document.getElementById('dash-view-title');
    const subEl = document.getElementById('dash-view-subtitle');
    if (!titleEl || !subEl) return;
    if (sopViewMode === 'read') {
        const steps = getReadModeSteps();
        const step = steps[readModeIndex];
        if (!step) {
            titleEl.textContent = 'SOP Lesemodus';
            subEl.textContent = 'Track und Phase wählen';
            return;
        }
        titleEl.textContent = step.trackTitle;
        subEl.textContent = `${step.phaseName} · Schritt ${readModeIndex + 1} von ${steps.length}`;
        return;
    }
    const data = serializeBoardFromDOM();
    const track = data[sopNav.trackIndex];
    if (!track) {
        titleEl.textContent = 'SOP Dashboard';
        subEl.textContent = 'Track und Phase wählen';
        return;
    }
    titleEl.textContent = track.title;
    if (sopNav.phaseIndex === null) {
        const count = (track.phases || []).length;
        subEl.textContent = count === 1 ? '1 Phase' : `${count} Phasen`;
    } else {
        const phase = track.phases?.[sopNav.phaseIndex];
        subEl.textContent = phase?.name || 'Phase wählen';
    }
}

function applySopNavFilter() {
    const board = document.getElementById('main-board');
    if (!board) return;
    board.querySelectorAll('.track').forEach((trackEl, tIdx) => {
        const hideTrack = tIdx !== sopNav.trackIndex;
        trackEl.classList.toggle('sop-nav-filter-hidden', hideTrack);
        if (hideTrack) return;
        trackEl.querySelectorAll('.phase-col:not(.add-phase-col)').forEach((phaseEl, pIdx) => {
            const hidePhase = sopNav.phaseIndex !== null && pIdx !== sopNav.phaseIndex;
            phaseEl.classList.toggle('sop-nav-filter-hidden', hidePhase);
        });
    });
    board.classList.toggle('sop-single-phase', sopNav.phaseIndex !== null);
    updateSopNavActiveStates();
    updateSopNavTitle();
    if (sopNav.phaseIndex !== null) {
        const phaseEl = board.querySelector(
            `.track[data-track-index="${sopNav.trackIndex}"] .phase-col[data-phase-index="${sopNav.phaseIndex}"]`
        );
        phaseEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
}

function handleSopNavClick(e) {
    const btn = e.target.closest('[data-nav-type]');
    if (!btn) return;
    clearSopNavHover();
    const trackIndex = parseInt(btn.dataset.trackIndex, 10);
    if (Number.isNaN(trackIndex)) return;
    if (btn.dataset.navType === 'track') {
        sopNav.trackIndex = trackIndex;
        sopNav.phaseIndex = null;
    } else {
        sopNav.trackIndex = trackIndex;
        sopNav.phaseIndex = parseInt(btn.dataset.phaseIndex, 10);
    }
    if (sopViewMode === 'read') {
        syncReadModeIndexFromSopNav();
        updateSopNavActiveStates();
        updateSopNavTitle();
        refreshReadModeView();
    } else {
        applySopNavFilter();
    }
}

function scheduleSopNavRefresh() {
    clearTimeout(sopNavRefreshTimer);
    sopNavRefreshTimer = setTimeout(() => {
        const data = serializeBoardFromDOM();
        renderSopNavTree(data);
        applySopNavFilter();
    }, 150);
}

function renderBoard(data) {
    const container = document.getElementById('main-board');
    container.innerHTML = '';
    data.forEach((track, tIdx) => {
        let trackHtml = `<div class="track ${track.class}" data-track-index="${tIdx}"><div class="track-header"><div class="track-badge">Track ${tIdx + 1}</div><div class="track-name edit-wrap"><span class="edit-target">${track.title}</span><i class="fa-solid fa-pen edit-pen" onclick="makeEditable(this, event, 100)"></i></div></div>
        <div class="phases-wrapper">
            <div class="scroll-arrow left" onclick="scrollRow(this, -300)"><i class="fa-solid fa-chevron-left"></i></div>
            <div class="phases-row" onscroll="updateScrollArrows(this)">`;
        if(track.phases) {
            track.phases.forEach((phase, pIdx) => {
                trackHtml += `<div class="phase-col" data-track-index="${tIdx}" data-phase-index="${pIdx}"><div class="phase-label edit-wrap"><span class="edit-target" title="${phase.name}">${phase.name}</span><i class="fa-solid fa-pen edit-pen" onclick="makeEditable(this, event, 40)"></i></div><div class="phase-cards">${renderCards(phase.cards)}<button class="add-entry-btn" onclick="addCard(this)"><i class="fa-solid fa-plus"></i> Neue Karte</button></div></div>`;
            });
        }
        trackHtml += `<div class="phase-col add-phase-col" style="justify-content:center; align-items:center; min-width: 200px; padding: 20px;"><button class="add-entry-btn" onclick="addPhase(this)"><i class="fa-solid fa-plus"></i> Phase hinzufügen</button></div>`;
        trackHtml += `</div><div class="scroll-arrow right" onclick="scrollRow(this, 300)"><i class="fa-solid fa-chevron-right"></i></div></div></div>`;
        container.insertAdjacentHTML('beforeend', trackHtml);
    });
    clampSopNav(data);
    renderSopNavTree(data);
    applySopNavFilter();
    updateCardMetaChips();
    updateSectionItemCounts();
    setTimeout(() => { document.querySelectorAll('.phases-row').forEach(updateScrollArrows); }, 100);
}

function scrollRow(btn, amount) {
    const row = btn.parentElement.querySelector('.phases-row');
    row.scrollBy({ left: amount, behavior: 'smooth' });
}

function updateScrollArrows(rowOrEvent) {
    const row = rowOrEvent.target || rowOrEvent;
    const wrapper = row.closest('.phases-wrapper');
    if (!wrapper) return;
    const leftArrow = wrapper.querySelector('.scroll-arrow.left');
    const rightArrow = wrapper.querySelector('.scroll-arrow.right');
    if (row.scrollLeft > 0) leftArrow.classList.add('visible');
    else leftArrow.classList.remove('visible');
    if (Math.ceil(row.scrollLeft) < row.scrollWidth - row.clientWidth - 5) {
        rightArrow.classList.add('visible');
        wrapper.classList.add('can-scroll-right');
    } else {
        rightArrow.classList.remove('visible');
        wrapper.classList.remove('can-scroll-right');
    }
}

function renderCards(cardsArray) {
    if(!cardsArray) return '';
    return cardsArray.map(cardObj => {
        let sectionsHtml = (cardObj.sections || []).map(sec => {
            let itemsHtml = sec.items.map(subItem => {
                let atts = (subItem.attachments || []).map(att => {
                    if (att.type === 'link') {
                        return buildCompactLinkHtml(att.url, att.name);
                    } else if (att.type === 'file') {
                        return buildCompactFileHtml(att.name, att.data, att.mime);
                    } else if (att.type === 'tag') {
                        return `<span class="attachment-item tag" data-type="tag" data-name="${att.name}"><span class="edit-target">${att.name}</span><i class="fa-solid fa-pen edit-pen" onclick="makeEditable(this, event)"></i><i class="fa-solid fa-xmark tag-delete-btn" onclick="softDelete(this.closest('.tag'), 'Tag')"></i></span>`;
                    } else if (att.type === 'richtext') {
                        return renderRichTextAttachment(att.html);
                    }
                    return '';
                }).join('');
                return `<li class="item-container"><div class="item-row"><div class="edit-wrap"><span class="edit-target">${subItem.text}</span></div><div class="item-actions"><i class="fa-solid fa-pen action-btn-small edit-item-icon" onclick="makeEditable(this, event, 500)" data-edit-selector=".edit-target" data-edit-scope=".item-row"></i><i class="fa-solid fa-plus action-btn-small" onclick="openItemMenu(this, event)"></i><i class="fa-solid fa-trash action-btn-small delete-btn" onclick="softDelete(this.closest('.item-container'), 'Eintrag')"></i></div></div><div class="item-attachments-wrapper tags-container">${atts}</div></li>`;
            }).join('');
            return `<div class="field" data-section-name="${sec.name}" data-section-icon="${sec.icon}"><div class="field-label"><div class="field-header-flex"><span><i class="${sec.icon} main-icon" aria-hidden="true"></i> ${sec.name} <span class="item-count">${sec.items.length}</span></span><button class="add-entry-btn" style="width:auto; padding:0px 4px; color:var(--brand); border:none;" onclick="addListItem(this)"><i class="fa-solid fa-plus"></i></button></div></div><div class="field-content"><ul class="section-item-list">${itemsHtml}</ul></div></div>`;
        }).join('');
        return `<div class="sop-card"><div class="card-trigger" onclick="this.parentElement.classList.toggle('open')"><div class="card-header-main"><div class="card-title-wrap"><div class="card-title"><span class="edit-target">${cardObj.title}</span></div></div><div class="card-actions"><i class="fa-solid fa-pen action-icon edit-title-icon" onclick="makeEditable(this, event, 80)" data-edit-selector=".card-title .edit-target" data-edit-scope=".sop-card" title="Titel bearbeiten"></i><i class="fa-solid fa-arrow-up-right-from-square action-icon" style="color: var(--brand);" onclick="openCardDetails(this, event)" title="Großansicht"></i><i class="fa-solid fa-trash action-icon" style="color: var(--danger);" onclick="deleteCard(this, event)" title="Karte löschen"></i><i class="fa-solid fa-chevron-down action-icon chevron-icon"></i></div></div><div class="card-meta-chips"></div></div><div class="card-body">${sectionsHtml}</div></div>`;
    }).join('');
}

function renderCardDetailAttachment(att) {
    const type = att.dataset.type;
    if (type === 'link') {
        const url = att.dataset.url || '';
        const rawName = att.dataset.name || url;
        return `<div class="preview-box detail-preview-box" data-type="link" data-url="${escapeAttr(url)}" data-name="${escapeAttr(rawName)}"><div class="preview-header"><span><i class="fa-solid fa-globe"></i> <a href="${url}" target="_blank" style="color:inherit;text-decoration:none;">${escapeHtml(rawName)}</a></span></div><iframe src="${url}" loading="lazy" onload="iframeLoaded(this)" onerror="showIframeFallback(this)"></iframe><div class="iframe-fallback" style="display:none; padding:20px; text-align:center; color:var(--muted); font-size:0.85rem;"><i class="fa-solid fa-lock" style="font-size:2rem; display:block; margin-bottom:8px;"></i>Diese Seite erlaubt keine Einbettung.<br><a href="${url}" target="_blank" style="color:var(--brand);">Im neuen Tab öffnen →</a></div></div>`;
    }
    if (type === 'file') {
        const mime = att.dataset.mime || '';
        const name = escapeHtml(att.dataset.name || 'Datei');
        const base64 = att.querySelector('.hidden-base64-data') ? att.querySelector('.hidden-base64-data').value : att.dataset.filedata;
        const displayUrl = (mime === 'application/pdf') ? createBlobUrl(base64 || '', mime) : (base64 || '');
        if (mime.startsWith('image/')) return `<div class="preview-box detail-preview-box"><div class="preview-header"><span><i class="fa-solid fa-image"></i> ${name}</span></div><img src="${displayUrl}" alt="${name}"></div>`;
        if (mime === 'application/pdf') return `<div class="preview-box detail-preview-box"><div class="preview-header"><span><i class="fa-solid fa-file-pdf"></i> ${name}</span></div><embed src="${displayUrl}" type="application/pdf"></embed></div>`;
        return `<div class="preview-box detail-preview-box"><div class="preview-header"><span><i class="fa-solid fa-file"></i> ${name}</span></div><iframe src="${displayUrl}" loading="lazy"></iframe></div>`;
    }
    if (type === 'tag') return `<span style="background:var(--status-bg); border:1px solid var(--line); border-radius:999px; padding:4px 12px; font-size:0.8rem; width:fit-content; color:var(--status-text);"><i class="fa-solid fa-tag"></i> ${escapeHtml(att.dataset.name || '')}</span>`;
    if (type === 'richtext') {
        const rich = att.querySelector('.rt-editor');
        return `<div class="detail-richtext">${sanitizeRichTextHTML(rich ? rich.innerHTML : '')}</div>`;
    }
    return '';
}

function openCardDetails(btn, event) {
    event.stopPropagation();
    const card = btn.closest('.sop-card');
    const title = card.querySelector('.card-title .edit-target').innerText;
    document.getElementById('card-detail-title').innerHTML = `<i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> ${escapeHtml(title)}`;
    let bodyHtml = '';
    card.querySelectorAll('.field').forEach(fieldEl => {
        const secName = fieldEl.dataset.sectionName;
        const secIcon = fieldEl.dataset.sectionIcon;
        bodyHtml += `<div class="card-detail-section"><h3><i class="${secIcon}"></i> ${escapeHtml(secName)}</h3><div class="card-detail-atts">`;
        fieldEl.querySelectorAll('li.item-container').forEach(itemEl => {
            const textEl = itemEl.querySelector('.item-row .edit-target');
            if (!textEl) return;
            bodyHtml += `<div style="margin-bottom: 5px; font-weight: 500; color: var(--ink);">› ${escapeHtml(textEl.innerText)}</div>`;
            bodyHtml += `<div style="padding-left: 15px; display:flex; flex-direction:column; gap:10px; margin-bottom:15px;">`;
            itemEl.querySelectorAll('.attachment-item').forEach(att => { bodyHtml += renderCardDetailAttachment(att); });
            bodyHtml += `</div>`;
        });
        bodyHtml += `</div></div>`;
    });
    document.getElementById('card-detail-body').innerHTML = bodyHtml;
    document.getElementById('card-detail-modal').style.display = 'flex';
}

function openFullscreenFromDOM(btn) {
    const attItem = btn.closest('.attachment-item');
    let mime = (attItem && attItem.dataset.mime) ? attItem.dataset.mime : (btn.dataset.mime || '');
    let type = (mime.startsWith('image/') || mime === 'image') ? 'image' : ((mime === 'application/pdf' || mime === 'pdf') ? 'pdf' : 'link');
    let url;
    if (type === 'link') url = btn.dataset.url || (attItem ? attItem.dataset.url : '');
    else {
        let base64 = attItem ? (attItem.querySelector('.hidden-base64-data') ? attItem.querySelector('.hidden-base64-data').value : attItem.dataset.filedata) : btn.dataset.url;
        url = (type === 'pdf') ? createBlobUrl(base64, mime) : base64;
    }
    openFullscreen(url, type);
}

function openFullscreen(url, type) {
    const overlay = document.getElementById('fs-overlay');
    const container = document.getElementById('fs-container');
    if (type === 'image') {
        container.innerHTML = `<img src="${url}" class="fullscreen-content" alt="">`;
    } else if (type === 'pdf') {
        container.innerHTML = `<embed src="${url}" type="application/pdf" class="fullscreen-content" title="PDF">`;
    } else {
        container.innerHTML = `<iframe src="${url}" class="fullscreen-content" title="Vorschau"></iframe>`;
    }
    overlay.classList.add('show');
}

function closeFullscreen() { document.getElementById('fs-overlay').classList.remove('show'); }

function confirmLinkAdd() {
    if (!currentAttachWrapper) return;
    let url = document.getElementById('modal-link-url').value.trim();
    let name = document.getElementById('modal-link-name').value.trim();
    if (!url || url === 'https://') { showToast("Bitte eine gültige URL eingeben.", "error"); return; }
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    if (!name) name = url;
    const html = buildCompactLinkHtml(url, name);
    currentAttachWrapper.insertAdjacentHTML('beforeend', html);
    document.getElementById('link-modal').style.display = 'none';
    saveToLocal();
}

function iframeLoaded(iframe) {
    const src = (iframe.getAttribute('src') || '').trim();
    if (!src || src === 'about:blank') { showIframeFallback(iframe); return; }
    const fallback = iframe.nextElementSibling;
    if (fallback && fallback.classList.contains('iframe-fallback')) fallback.style.display = 'none';
}

function showIframeFallback(iframe) {
    iframe.style.display = 'none';
    const fallback = iframe.nextElementSibling;
    if (fallback && fallback.classList.contains('iframe-fallback')) fallback.style.display = 'block';
}

function handleItemAttach(type) {
    document.getElementById('item-add-menu').classList.remove('show');
    if (!currentAttachWrapper) return;
    if (type === 'link') {
        document.getElementById('modal-link-url').value = 'https://';
        document.getElementById('modal-link-name').value = '';
        document.getElementById('link-modal').style.display = 'flex';
        document.getElementById('modal-link-url').focus();
    } else if (type === 'file') {
        document.getElementById('global-file-input').click();
    } else if (type === 'tag') {
        document.getElementById('modal-tag-name').value = '';
        document.getElementById('tag-modal').style.display = 'flex';
        setTimeout(() => document.getElementById('modal-tag-name').focus(), 50);
    } else if (type === 'richtext') {
        currentAttachWrapper.insertAdjacentHTML('beforeend', renderRichTextAttachment('Text hier eingeben...'));
        saveToLocal();
    }
}

async function restoreRevision(id) {
    if (!await rootsConfirm({ title: 'Version laden?', desc: 'Ungespeicherte Änderungen gehen verloren.', okLabel: 'Laden', variant: 'warning', icon: 'fa-clock-rotate-left' })) return;
    const client = sb();
    if (!client && !SOP_TOKENLESS) { showToast('Supabase nicht verbunden.', 'error'); return; }

    try {
        let data;
        if (SOP_TOKENLESS) data = await sopBroker({ action: 'get', id });
        else {
            const result = await client.from('sop_revisions')
                .select('id, snapshot, created_at, author_name').eq('id', id).single();
            if (result.error) throw result.error;
            data = result.data;
        }
        if (!data || !Array.isArray(data.snapshot) || data.snapshot.length === 0) {
            showToast('Ungültiges Snapshot-Format.', 'error');
            return;
        }

        applyRevisionSnapshot(data.snapshot, data);
        document.getElementById('revision-modal').style.display = 'none';
        setOnlineStatus(true);
        showToast(`Version von ${data.author_name || 'Unbekannt'} geladen.`, 'success');
    } catch (error) {
        console.error('restoreRevision', error);
        showToast('Fehler beim Laden der Version.', 'error');
    }
}

function updateCardMetaChips() {
    document.querySelectorAll('.sop-card').forEach(card => {
        const chipsContainer = card.querySelector('.card-meta-chips');
        if(!chipsContainer) return;
        const items = card.querySelectorAll('.item-container').length;
        const atts = card.querySelectorAll('.attachment-item').length;
        let html = '';
        if(items > 0) html += `<span class="meta-chip"><i class="fa-solid fa-list-check" aria-hidden="true"></i> ${items}</span>`;
        if(atts > 0) html += `<span class="meta-chip"><i class="fa-solid fa-paperclip" aria-hidden="true"></i> ${atts}</span>`;
        chipsContainer.innerHTML = html;
    });
}

function updateSectionItemCounts() {
    document.querySelectorAll('.field').forEach(field => {
        const countEl = field.querySelector('.item-count');
        if (!countEl) return;
        let count = 0;
        field.querySelectorAll('li.item-container').forEach(item => { if (item.style.display !== 'none') count += 1; });
        countEl.textContent = String(count);
    });
}

function addCard(btn) {
    const html = renderCards([createCardData("Neue Karte")]);
    btn.insertAdjacentHTML('beforebegin', html);
    saveToLocal();
}

function addPhase(btn) {
    const trackPhasesRow = btn.closest('.phases-row');
    const trackEl = btn.closest('.track');
    const tIdx = trackEl ? parseInt(trackEl.dataset.trackIndex, 10) : 0;
    const phaseCount = trackEl ? trackEl.querySelectorAll('.phase-col:not(.add-phase-col)').length : 0;
    const newPhaseHtml = `<div class="phase-col" data-track-index="${tIdx}" data-phase-index="${phaseCount}"><div class="phase-label edit-wrap"><span class="edit-target" title="Neue Phase">Neue Phase</span><i class="fa-solid fa-pen edit-pen" onclick="makeEditable(this, event, 40)"></i></div><div class="phase-cards"><button class="add-entry-btn" onclick="addCard(this)"><i class="fa-solid fa-plus"></i> Neue Karte</button></div></div>`;
    btn.closest('.add-phase-col').insertAdjacentHTML('beforebegin', newPhaseHtml);
    updateScrollArrows(trackPhasesRow);
    saveToLocal();
    scheduleSopNavRefresh();
}

function addListItem(btn) {
    const list = btn.closest('.field').querySelector('.section-item-list');
    const html = `<li class="item-container"><div class="item-row"><div class="edit-wrap"><span class="edit-target">Neuer Punkt</span></div><div class="item-actions"><i class="fa-solid fa-pen action-btn-small edit-item-icon" onclick="makeEditable(this, event, 500)" data-edit-selector=".edit-target" data-edit-scope=".item-row"></i><i class="fa-solid fa-plus action-btn-small" onclick="openItemMenu(this, event)"></i><i class="fa-solid fa-trash action-btn-small delete-btn" onclick="softDelete(this.closest('.item-container'), 'Eintrag')"></i></div></div><div class="item-attachments-wrapper tags-container"></div></li>`;
    list.insertAdjacentHTML('beforeend', html);
    saveToLocal();
}

// --- CLOUD SAVE ---
function saveRevisionToCloud() {
    if (isOffline) { showToast('Offline: Speichern in der Cloud nicht möglich.', 'error'); return; }
    const input = document.getElementById('modal-author-name');
    const profile = window.RootsUser?.getProfile?.();
    if (input) input.value = profile?.full_name || '';
    document.getElementById('save-modal').style.display = 'flex';
    setTimeout(() => input?.focus(), 80);
}

async function confirmSaveRevision() {
    const authorName = document.getElementById('modal-author-name')?.value.trim();
    if (!authorName) { showToast('Bitte einen Namen eingeben.', 'error'); return; }
    const client = sb();
    if (!client && !SOP_TOKENLESS) { showToast('Supabase nicht verbunden.', 'error'); return; }

    closeModal('save-modal');
    const btn = document.getElementById('main-save-btn');
    const btnHtml = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Speichere...';

    try {
        const snapshot = serializeBoardFromDOM();
        const authorId = window.RootsUser?.getProfile?.()?.id || null;
        const tsLabel = new Date().toLocaleDateString('de-DE', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        let data;
        if (SOP_TOKENLESS) data = await sopBroker({ action: 'create', snapshot });
        else {
            const result = await client.from('sop_revisions').insert({
                author_name: authorName, author_id: authorId,
                label: `${authorName} · ${tsLabel}`, snapshot
            }).select('id, created_at').single();
            if (result.error) throw result.error;
            data = result.data;
        }

        lastLoadedRevisionId = data.id;
        lastLoadedRevisionAt = data.created_at;
        saveToLocal();
        setOnlineStatus(true);
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Gespeichert';
            setTimeout(() => { btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Speichern'; }, 3000);
        }
        showToast('Erfolgreich in der Cloud gespeichert!', 'success');
    } catch (e) {
        console.error('confirmSaveRevision', e);
        showToast('Speichern fehlgeschlagen: ' + (e.message || 'Unbekannter Fehler'), 'error');
        if (btn) btn.innerHTML = btnHtml || '<i class="fa-solid fa-cloud-arrow-up"></i> Speichern';
    }
}

// --- REVISIONS ---
async function openRevisions() {
    const listEl = document.getElementById('revision-list');
    listEl.innerHTML = '<div style="text-align:center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i></div>';
    document.getElementById('revision-modal').style.display = 'flex';

    const client = sb();
    if (!client && !SOP_TOKENLESS) {
        listEl.innerHTML = '<p style="color:var(--danger); padding: 10px;">Supabase nicht verbunden.</p>';
        return;
    }

    try {
        let data;
        if (SOP_TOKENLESS) data = await sopBroker({ action: 'list' });
        else {
            const result = await client.from('sop_revisions')
                .select('id, author_name, label, created_at')
                .order('created_at', { ascending: false }).limit(50);
            if (result.error) throw result.error;
            data = result.data;
        }

        listEl.innerHTML = '';
        if (!data || data.length === 0) {
            listEl.innerHTML = '<p style="padding: 10px;">Keine Versionen.</p>';
            return;
        }

        data.forEach((rev, index) => {
            const isCurrent = (rev.id === lastLoadedRevisionId) || (index === 0 && !lastLoadedRevisionId)
                ? '<span style="color:var(--brand); font-weight:bold; font-size:0.8rem; margin-left:10px;">(Aktuell)</span>'
                : '';
            const dateStr = fmtRevisionDate(rev.created_at);
            const restoreBtn = index === 0 && rev.id === lastLoadedRevisionId
                ? ''
                : `<button class="rev-restore-btn" onclick="restoreRevision('${rev.id}')">Laden</button>`;
            listEl.insertAdjacentHTML('beforeend', `<div class="revision-item"><div class="revision-header"><div class="rev-date"><i class="fa-regular fa-clock"></i> ${dateStr} <span style="background:var(--brand-light); color:var(--brand-dark); padding:2px 8px; border-radius:999px; font-size:0.75rem;"><i class="fa-solid fa-user"></i> ${rev.author_name || 'Unbekannt'}</span> ${isCurrent}</div>${restoreBtn}</div></div>`);
        });
    } catch (error) {
        console.error('openRevisions', error);
        listEl.innerHTML = '<p style="color:var(--danger); padding: 10px;">Konnte Verlauf nicht laden.</p>';
    }
}

// --- SERIALIZE ---
function serializeBoardFromDOM() {
    let newData = [];
    document.querySelectorAll('.track').forEach(trackEl => {
        let trackClass = Array.from(trackEl.classList).find(c => c.startsWith('track-') && c !== 'track');
        let trackObj = { title: trackEl.querySelector('.track-name .edit-target').innerText, class: trackClass, phases: [] };
        trackEl.querySelectorAll('.phase-col').forEach(phaseEl => {
            if (phaseEl.classList.contains('add-phase-col')) return;
            let phaseObj = { name: phaseEl.querySelector('.phase-label .edit-target').innerText, cards: [] };
            phaseEl.querySelectorAll('.sop-card').forEach(cardEl => {
                if (cardEl.style.display === 'none') return;
                let cardObj = { title: cardEl.querySelector('.card-title .edit-target').innerText, sections: [] };
                cardEl.querySelectorAll('.field').forEach(fieldEl => {
                    let sectionObj = { name: fieldEl.dataset.sectionName, icon: fieldEl.dataset.sectionIcon, items: [] };
                    fieldEl.querySelectorAll('li.item-container').forEach(itemEl => {
                        if (itemEl.style.display === 'none') return;
                        let textTarget = itemEl.querySelector('.item-row .edit-target');
                        if (!textTarget) return;
                        let subItemObj = { text: textTarget.innerText, attachments: [] };
                        itemEl.querySelectorAll('.attachment-item').forEach(attEl => {
                            if (attEl.style.display === 'none') return;
                            let type = attEl.dataset.type;
                            if (type === 'link') subItemObj.attachments.push({ type: 'link', url: attEl.dataset.url, name: attEl.dataset.name });
                            else if (type === 'file') subItemObj.attachments.push({ type: 'file', data: attEl.querySelector('.hidden-base64-data') ? attEl.querySelector('.hidden-base64-data').value : attEl.dataset.filedata, name: attEl.dataset.name, mime: attEl.dataset.mime });
                            else if (type === 'tag') subItemObj.attachments.push({ type: 'tag', name: attEl.querySelector('.edit-target').innerText });
                            else if (type === 'richtext') subItemObj.attachments.push({ type: 'richtext', html: sanitizeRichTextHTML(attEl.querySelector('.rt-editor').innerHTML) });
                        });
                        sectionObj.items.push(subItemObj);
                    });
                    cardObj.sections.push(sectionObj);
                });
                phaseObj.cards.push(cardObj);
            });
            trackObj.phases.push(phaseObj);
        });
        newData.push(trackObj);
    });
    return newData;
}

function getReadModeSteps() {
    const data = serializeBoardFromDOM();
    const steps = [];
    (data || []).forEach((track, trackIndex) => {
        (track.phases || []).forEach((phase, phaseIndex) => {
            steps.push({
                trackTitle: track.title,
                trackClass: track.class || 'track-pre',
                trackIndex,
                phaseIndex,
                phaseName: phase.name,
                cards: phase.cards || []
            });
        });
    });
    return steps;
}

function buildReadEmbedRow(label, iconClass, actionsHtml, dataAttrs = '') {
    return `<div class="read-embed-row read-embed-target"${dataAttrs}>
        <div class="read-embed-meta"><i class="${iconClass}" aria-hidden="true"></i><span class="read-embed-title">${escapeHtml(label)}</span></div>
        <div class="read-embed-actions">${actionsHtml}</div>
    </div>`;
}

function renderReadAttachmentData(att) {
    if (att.type === 'link') {
        const url = att.url || '';
        const label = att.name || url || 'Link';
        const actions = `<button type="button" class="read-embed-action" data-read-embed-action="toggle">Anzeigen</button>
            <a class="read-embed-action read-embed-action--link" href="${escapeAttr(url)}" target="_blank" rel="noopener">Neuer Tab</a>`;
        return buildReadEmbedRow(label, 'fa-solid fa-globe', actions, ` data-embed-kind="link" data-embed-url="${escapeAttr(url)}"`);
    }
    if (att.type === 'file') {
        const mime = att.mime || '';
        const name = att.name || 'Datei';
        const data = att.data || '';
        const displayUrl = (mime === 'application/pdf') ? createBlobUrl(data, mime) : data;
        if (mime.startsWith('image/')) {
            const actions = `<button type="button" class="read-embed-action" data-read-embed-action="toggle">Anzeigen</button>
                <a class="read-embed-action read-embed-action--link" href="${escapeAttr(displayUrl)}" target="_blank" rel="noopener">Neuer Tab</a>`;
            return `<div class="read-embed-block">
                ${buildReadEmbedRow(name, 'fa-solid fa-image', actions, ` data-embed-kind="image" data-embed-url="${escapeAttr(displayUrl)}"`)}
                <div class="read-embed-preview"><img class="read-embed-image" src="${displayUrl}" alt="${escapeAttr(name)}"></div>
            </div>`;
        }
        if (mime === 'application/pdf') {
            const actions = `<button type="button" class="read-embed-action" data-read-embed-action="toggle">Anzeigen</button>
                <a class="read-embed-action read-embed-action--link" href="${escapeAttr(displayUrl)}" target="_blank" rel="noopener" download="${escapeAttr(name)}">Download</a>`;
            return buildReadEmbedRow(name, 'fa-solid fa-file-pdf', actions, ` data-embed-kind="pdf" data-embed-url="${escapeAttr(displayUrl)}"`);
        }
        return `<div class="read-file-fallback"><a class="read-file-open" href="${escapeAttr(displayUrl)}" target="_blank" rel="noopener" download="${escapeAttr(name)}"><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i><span>${escapeHtml(name)} öffnen</span></a></div>`;
    }
    if (att.type === 'tag') {
        return `<span class="read-tag"><i class="fa-solid fa-tag" aria-hidden="true"></i>${escapeHtml(att.name || '')}</span>`;
    }
    if (att.type === 'richtext') {
        return `<div class="read-richtext-wrap">${sanitizeRichTextHTML(att.html || '')}</div>`;
    }
    return '';
}

function openReadEmbedFullscreen(target) {
    if (!target) return;
    const url = target.dataset.embedUrl || target.closest('.read-embed-block')?.querySelector('.read-embed-image')?.src;
    if (!url) return;
    const kind = target.dataset.embedKind || 'link';
    openFullscreen(url, kind === 'image' ? 'image' : (kind === 'pdf' ? 'pdf' : 'link'));
}

function setupReadEmbedInteractions() {
    const body = document.getElementById('read-mode-body');
    if (!body || body._readEmbedBound) return;
    body._readEmbedBound = true;
    body.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-read-embed-action]');
        if (!btn) return;
        const target = btn.closest('.read-embed-target');
        if (!target) return;
        if (btn.dataset.readEmbedAction === 'toggle') openReadEmbedFullscreen(target);
    });
}

function buildReadModeCardHtml(card) {
    let h = `<article class="read-card"><header class="read-card-header"><h3 class="read-card-title">${escapeHtml(card.title || '')}</h3></header><div class="read-card-body">`;
    (card.sections || []).forEach((sec) => {
        h += `<div class="read-field"><div class="read-field-label"><i class="${sec.icon || 'fa-solid fa-file-lines'}" aria-hidden="true"></i> ${escapeHtml(sec.name || '')}</div><ul class="read-item-list">`;
        (sec.items || []).forEach((item) => {
            const atts = (item.attachments || []).map((a) => renderReadAttachmentData(a)).join('');
            h += `<li class="read-item-row">`;
            h += `<div class="read-item-main"><span class="read-item-text">${escapeHtml(item.text || '')}</span></div>`;
            if (atts) h += `<div class="read-item-attachments">${atts}</div>`;
            h += `</li>`;
        });
        h += `</ul></div>`;
    });
    h += `</div></article>`;
    return h;
}

function buildReadModePhaseHtml(step) {
    const cards = step.cards || [];
    if (cards.length === 0) {
        return `<div class="read-phase"><p class="read-empty">In dieser Phase sind noch keine Karten.</p></div>`;
    }
    return `<div class="read-phase"><div class="read-phase-cards">${cards.map((c) => buildReadModeCardHtml(c)).join('')}</div></div>`;
}

function refreshReadModeView() {
    const steps = getReadModeSteps();
    const elBody = document.getElementById('read-mode-body');
    const prevBtn = document.getElementById('read-mode-prev');
    const nextBtn = document.getElementById('read-mode-next');
    if (!elBody) return;
    syncSopNavFromReadModeIndex();
    renderSopNavTree(serializeBoardFromDOM());
    updateSopNavActiveStates();
    updateSopNavTitle();
    if (steps.length === 0) {
        elBody.innerHTML = '<div class="read-body-inner"><div class="read-phase"><p class="read-empty">Noch kein SOP-Inhalt – wechsle in den Bearbeiten-Modus.</p></div></div>';
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        return;
    }
    if (readModeIndex >= steps.length) readModeIndex = steps.length - 1;
    if (readModeIndex < 0) readModeIndex = 0;
    const step = steps[readModeIndex];

    elBody.innerHTML = `<div class="read-body-inner">${buildReadModePhaseHtml(step)}</div>`;
    if (prevBtn) prevBtn.disabled = readModeIndex === 0;
    if (nextBtn) nextBtn.disabled = readModeIndex >= steps.length - 1;
    elBody.scrollTop = 0;
}

function readModePrev() {
    if (readModeIndex > 0) {
        readModeIndex--;
        syncSopNavFromReadModeIndex();
        refreshReadModeView();
    }
}

function readModeNext() {
    const steps = getReadModeSteps();
    if (readModeIndex < steps.length - 1) {
        readModeIndex++;
        syncSopNavFromReadModeIndex();
        refreshReadModeView();
    }
}

function setSopViewMode(mode) {
    const isRead = mode === 'read';
    sopViewMode = isRead ? 'read' : 'edit';
    document.body.classList.toggle('sop-mode-read', isRead);
    const rb = document.getElementById('sop-mode-read-btn');
    const eb = document.getElementById('sop-mode-edit-btn');
    if (rb) rb.setAttribute('aria-pressed', isRead);
    if (eb) eb.setAttribute('aria-pressed', !isRead);
    if (isRead) {
        syncReadModeIndexFromSopNav();
        renderSopNavTree(serializeBoardFromDOM());
        updateSopNavActiveStates();
        updateSopNavTitle();
        refreshReadModeView();
    } else {
        clearSopNavHover();
        renderSopNavTree(serializeBoardFromDOM());
        applySopNavFilter();
    }
}

// --- DROPDOWN / MENU ---
let currentAttachWrapper = null;
function openItemMenu(btn, event) {
    event.stopPropagation();
    const menu = document.getElementById('item-add-menu');
    if (menu.classList.contains('show') && menu._openedBy === btn) {
        menu.classList.remove('show');
        menu.style.removeProperty('top');
        menu.style.removeProperty('left');
        return;
    }
    currentAttachWrapper = btn.closest('.item-container').querySelector('.item-attachments-wrapper');
    menu._openedBy = btn;
    menu.classList.add('show');
    const rect = btn.getBoundingClientRect();
    let top = rect.bottom + window.scrollY + 5;
    let left = rect.left + window.scrollX - 50;
    if (left + menu.offsetWidth > window.innerWidth) left = window.innerWidth - menu.offsetWidth - 10;
    if (top + menu.offsetHeight > window.innerHeight + window.scrollY) top = rect.top + window.scrollY - menu.offsetHeight - 5;
    menu.style.top = top + 'px';
    menu.style.left = left + 'px';
}

document.addEventListener('click', function(e) {
    const itemMenu = document.getElementById('item-add-menu');
    if (itemMenu && itemMenu.classList.contains('show') && !itemMenu.contains(e.target)) itemMenu.classList.remove('show');
    const exportMenu = document.getElementById('export-menu');
    if (exportMenu && exportMenu.classList.contains('show') && !exportMenu.contains(e.target)) exportMenu.classList.remove('show');
});

// --- FILE UPLOAD ---
document.getElementById('global-file-input').addEventListener('change', function(e) {
    if (!this.files || !this.files[0] || !currentAttachWrapper) { this.value = ''; return; }
    const file = this.files[0];
    if (file.size > 5 * 1024 * 1024) { showToast("Maximal 5 MB erlaubt.", "error"); this.value = ''; return; }
    const placeholder = document.createElement('div');
    placeholder.style.cssText = 'border:1px solid var(--line);border-radius:8px;padding:20px;text-align:center;color:var(--muted);font-size:0.85rem;';
    placeholder.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="font-size:1.5rem;display:block;margin-bottom:8px;color:var(--brand);"></i>${file.name} wird verarbeitet...`;
    currentAttachWrapper.appendChild(placeholder);
    const reader = new FileReader();
    reader.onload = function(event) {
        placeholder.remove();
        const base64Data = event.target.result;
        const html = buildCompactFileHtml(file.name, base64Data, file.type);
        currentAttachWrapper.insertAdjacentHTML('beforeend', html);
        saveToLocal();
    };
    reader.onerror = () => { placeholder.remove(); showToast("Datei konnte nicht gelesen werden.", "error"); };
    reader.readAsDataURL(file);
    this.value = '';
});

document.getElementById('main-board').addEventListener('dblclick', e => {
    const preview = e.target.closest('.preview-box');
    if (!preview) return;
    const iframe = preview.querySelector('iframe');
    const img = preview.querySelector('img');
    const embed = preview.querySelector('embed');
    if (img) openFullscreen(img.src, 'image');
    else if (iframe) openFullscreen(iframe.src, 'link');
    else if (embed) openFullscreen(embed.src, 'pdf');
});
