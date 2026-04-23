const API_BASE_URL = 'https://PGoutzeris.pythonanywhere.com';

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
        { name: "Ziel", icon: "ri-focus-2-line", items: [{text: "Ziel hier definieren...", attachments: []}] },
        { name: "Subschritte", icon: "ri-list-check", items: [{text: "Erster Schritt...", attachments: []}] },
        { name: "Assets", icon: "ri-file-list-3-line", items: [] },
        { name: "Tools, Templates & Frameworks", icon: "ri-tools-line", items: [] },
        { name: "Erfolgreich wenn", icon: "ri-checkbox-circle-line", items: [{text: "Erfolgskriterium definieren...", attachments: []}] }
    ]
});

const DEFAULT_DATA = [
    {
        title: "Track 1: Pre-Engagement", class: "track-pre",
        phases: [
            { name: "Anbahnung", cards: [ createCardData("ROOTS Vorstellung"), createCardData("Zielstellung klären"), createCardData("Initiale Analyse") ] },
            { name: "Exploration", cards: [ createCardData("Bedarfsanalyse / Problem Framing"), createCardData("Onboarding-Skizze & Aufwand"), createCardData("Website & Online-Analyse"), createCardData("Initiale Spezifikationen") ] },
            { name: "Pitch", cards: [ createCardData("Angebotsgestaltung & Präsentation"), createCardData("Pitch Benchmarking"), createCardData("Onboarding Admin & Vertrag") ] }
        ]
    },
    {
        title: "Track 2: Execution", class: "track-ops",
        phases: [
            { name: "Ramp-up", cards: [ createCardData("Projektstruktur aufbauen"), createCardData("Briefing & Content-Plan") ] },
            { name: "Analyse", cards: [ createCardData("Performance-Analyse"), createCardData("Zielgruppen-Insights") ] },
            { name: "Synthese", cards: [ createCardData("Erkenntnisse bündeln"), createCardData("Strategie-Update") ] },
            { name: "Delivery", cards: [ createCardData("Content-Produktion"), createCardData("Ausspielung & Community Management") ] },
            { name: "Implementierung", cards: [ createCardData("Kampagnen-Setup"), createCardData("Tool-Integration & Automatisierung") ] }
        ]
    },
    {
        title: "Track 3: Post-Engagement", class: "track-post",
        phases: [
            { name: "Closeout", cards: [ createCardData("Finales Reporting & Übergabe"), createCardData("Interne Retro & Learnings"), createCardData("Kundenfeedback einholen") ] },
            { name: "Follow-Up", cards: [ createCardData("Beziehungspflege & Check-ins"), createCardData("Upsell & Folgeauftrag"), createCardData("Case Study & Referenz") ] }
        ]
    }
];

let isOffline = false;
let originalEditContent = "";
let lastLoadTimestamp = null;
let activeRichTextEditor = null;
let pendingRichTextControl = null;
let searchDebounceTimer = null;
let activeInlineEdit = null;
let sopViewMode = 'edit';
let readModeIndex = 0;

// --- TOAST SYSTEM ---
function showToast(message, type = 'info', undoCallback = null) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = type === 'success' ? 'ri-check-line' : (type === 'error' ? 'ri-error-warning-line' : 'ri-information-line');
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
    localStorage.setItem('roots_sop_autosave', JSON.stringify(data));
    updateSectionItemCounts();
    updateCardMetaChips();
}

function loadFromLocal() {
    const saved = localStorage.getItem('roots_sop_autosave');
    return saved ? JSON.parse(saved) : null;
}

// --- INITIALIZATION ---
async function initDashboard() {
    const localData = loadFromLocal();
    try {
        const response = await fetch(`${API_BASE_URL}/api/latest`);
        const result = await response.json();
        if (result.status === 'success' && result.data && result.data.length > 0) {
            renderBoard(result.data);
            lastLoadTimestamp = result.timestamp || Date.now();
        } else {
            renderBoard(DEFAULT_DATA);
        }
        setOnlineStatus(true);
    } catch (error) {
        setOnlineStatus(false);
        renderBoard(localData || DEFAULT_DATA);
        showToast("Offline-Modus. Änderungen werden lokal gespeichert.", "error");
    }

    document.getElementById('main-board').addEventListener('input', saveToLocal);
    document.getElementById('rt-fullscreen-toolbar').innerHTML = buildRichTextToolbar(false, false);
    setupInlineEditMouseFix();
    document.addEventListener('paste', handleEditorPaste);
    document.addEventListener('keydown', handleGlobalKeydown);
    checkOnboarding();
    setInterval(pollForChanges, 30000);

    const readBtn = document.getElementById('sop-mode-read-btn');
    const editBtn = document.getElementById('sop-mode-edit-btn');
    if (readBtn) readBtn.addEventListener('click', () => setSopViewMode('read'));
    if (editBtn) editBtn.addEventListener('click', () => setSopViewMode('edit'));
    document.getElementById('read-mode-prev')?.addEventListener('click', readModePrev);
    document.getElementById('read-mode-next')?.addEventListener('click', readModeNext);
    window.addEventListener('resize', () => {
        if (document.body.classList.contains('sop-mode-read')) sizeReadPreviewHeights();
    });
}

function setOnlineStatus(online) {
    isOffline = !online;
    const badge = document.getElementById('sync-status');
    if (!badge) return;
    badge.classList.remove('online', 'offline');
    badge.classList.add(online ? 'online' : 'offline');
    badge.title = online ? 'Online' : 'Offline – Änderungen werden lokal gespeichert';
    badge.innerHTML = online
        ? '<i class="ri-cloud-line"></i> Online'
        : '<i class="ri-cloud-off-line"></i> Offline (Lokal)';
}

document.addEventListener('DOMContentLoaded', initDashboard);

function setupInlineEditMouseFix() {
    document.addEventListener('mousedown', (e) => {
        const editBtn = e.target.closest('.edit-pen, .edit-title-icon, .edit-item-icon');
        if (editBtn) e.preventDefault();
    });
}

// --- COLLABORATION POLLING ---
async function pollForChanges() {
    if (isOffline) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/latest`);
        const result = await response.json();
        if (result.status === 'success' && result.timestamp && result.timestamp !== lastLoadTimestamp) {
            showToast("Eine neuere Version ist verfügbar!", "info", () => { location.reload(); });
            lastLoadTimestamp = result.timestamp;
        }
    } catch(e) {}
}

// --- ONBOARDING ---
function checkOnboarding() {
    if (!localStorage.getItem('roots_sop_onboarding_done')) {
        showToast("Willkommen! Klicke auf die Stift-Icons, um Texte zu bearbeiten.", "info");
        localStorage.setItem('roots_sop_onboarding_done', 'true');
    }
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
    el.classList.remove('ri-save-line');
    el.classList.add('ri-pencil-line');
    if (activeInlineEdit && activeInlineEdit.target === target) activeInlineEdit = null;
    saveToLocal();
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
    el.classList.remove('ri-pencil-line');
    el.classList.add('ri-save-line');
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
    if (target.contentEditable === "true" || el.classList.contains('ri-save-line')) {
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
            <i class="ri-pencil-line edit-pen" onclick="makeEditable(this, event)"></i>
            <i class="ri-close-line tag-delete-btn" onclick="softDelete(this.closest('.tag'), 'Tag')"></i>
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
    <div class="attachment-compact-main"><i class="ri-link" style="color:var(--brand);"></i> <a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer" style="font-weight:600;">${escapeHtml(name)}</a>
    <span style="color:var(--muted); font-size:0.78rem; display:block; margin-top:2px; word-break:break-all;">${escapeHtml(url)}</span>
    </div>
    <div class="attachment-compact-actions">
        <button type="button" class="ac-btn" title="Vollbild" aria-label="Vollbild" onclick="openFullscreenFromDOM(this)" data-mime="link" data-url="${escapeAttr(url)}"><i class="ri-fullscreen-line" aria-hidden="true"></i></button>
        <button type="button" class="ac-btn danger" title="Entfernen" aria-label="Entfernen" onclick="softDelete(this.closest('.attachment-item'), 'Link')"><i class="ri-delete-bin-line" aria-hidden="true"></i></button>
    </div>
</div>`;
}

function buildCompactFileHtml(name, base64Data, mime) {
    const isViewable = String(mime || '').startsWith('image/') || mime === 'application/pdf';
    return `<div class="attachment-item attachment-compact preview-box" data-type="file" data-name="${escapeAttr(name)}" data-mime="${escapeAttr(mime || '')}">
        <textarea class="hidden-base64-data" style="display:none;">${base64Data}</textarea>
        <div class="attachment-compact-main">
            <i class="ri-attachment-2" style="color:var(--brand);"></i>
            <span style="font-weight:600; word-break:break-word;">${escapeHtml(name)}</span>
            <span style="color:var(--muted); font-size:0.78rem;">${escapeHtml(mime || 'Datei')}</span>
        </div>
        <div class="attachment-compact-actions">
            ${isViewable ? `<button type="button" class="ac-btn" title="Vollbild" aria-label="Vollbild" onclick="openFullscreenFromDOM(this)" data-mime="${escapeAttr(mime || '')}"><i class="ri-fullscreen-line" aria-hidden="true"></i></button>` : ''}
            <button type="button" class="ac-btn danger" title="Entfernen" aria-label="Entfernen" onclick="softDelete(this.closest('.attachment-item'), 'Datei')"><i class="ri-delete-bin-line" aria-hidden="true"></i></button>
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
        ? `<button class="rt-btn" onmousedown="event.preventDefault()" style="color:var(--danger);" onclick="softDelete(this.closest('.rt-container'), 'Textblock')" title="Textblock löschen"><i class="ri-delete-bin-line"></i></button>`
        : '';
    const fullscreenBtn = includeFullscreen
        ? `<button class="rt-btn" onmousedown="event.preventDefault()" onclick="openRichTextFullscreen(this)" title="Vollbild bearbeiten"><i class="ri-fullscreen-line"></i></button>`
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
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'undo')" title="Rückgängig"><i class="ri-arrow-go-back-line"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'redo')" title="Wiederholen"><i class="ri-arrow-go-forward-line"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'bold')" title="Fett"><i class="ri-bold"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'italic')" title="Kursiv"><i class="ri-italic"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'underline')" title="Unterstrichen"><i class="ri-underline"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'strikeThrough')" title="Durchgestrichen"><i class="ri-strikethrough"></i></button>
        </div>
        <div class="rt-toolbar-group">
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'insertUnorderedList')" title="Aufzählung"><i class="ri-list-unordered"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'insertOrderedList')" title="Nummerierte Liste"><i class="ri-list-ordered"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'outdent')" title="Ausrückung verringern"><i class="ri-indent-decrease"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'indent')" title="Ausrückung erhöhen"><i class="ri-indent-increase"></i></button>
        </div>
        <div class="rt-toolbar-group">
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'justifyLeft')" title="Linksbündig"><i class="ri-align-left"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'justifyCenter')" title="Zentriert"><i class="ri-align-center"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'justifyRight')" title="Rechtsbündig"><i class="ri-align-right"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'justifyFull')" title="Blocksatz"><i class="ri-align-justify"></i></button>
        </div>
        <div class="rt-toolbar-group">
            <input type="color" class="rt-color-input" title="Textfarbe" value="#1f2937" onchange="applyRichTextColor(this, 'foreColor')">
            <input type="color" class="rt-color-input" title="Hintergrundfarbe" value="#fff59d" onchange="applyRichTextColor(this, 'hiliteColor')">
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="insertRichTextLink(this)" title="Link einfügen"><i class="ri-link"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="insertRichTextTable(this)" title="Tabelle einfügen"><i class="ri-table-line"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="insertRichTextCodeBlock(this)" title="Codeblock einfügen"><i class="ri-code-s-slash-line"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'insertHorizontalRule')" title="Trennlinie"><i class="ri-subtract-line"></i></button>
            <button class="rt-btn" onmousedown="event.preventDefault()" onclick="runRichTextCommand(this, 'removeFormat')" title="Formatierung entfernen"><i class="ri-format-clear"></i></button>
        </div>
        <div style="flex:1 1 auto;"></div>
        <div class="rt-toolbar-group">${fullscreenBtn}${deleteBtn}</div>
    `;
}

function renderRichTextAttachment(html = 'Text hier eingeben...') {
    const safe = sanitizeRichTextHTML(html);
    const hint = plainTextFromRichHtml(html, 200);
    return `<div class="attachment-item rt-container rt-container-compact" data-type="richtext">
        <div class="rt-compact-hint"><i class="ri-text" style="color:var(--brand); margin-right:6px;" aria-hidden="true"></i><span>${escapeHtml(hint || 'Formatierter Text – Inhalt in der Karte unten bearbeiten')}</span></div>
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
        return `<div class="snapshot-preview-box"><div class="snapshot-preview-header"><span><i class="ri-global-line"></i> <a href="${url}" target="_blank">${name}</a></span></div><iframe src="${url}" loading="lazy"></iframe><div class="snapshot-fallback">Falls die Vorschau blockiert ist: <a href="${url}" target="_blank">Link im neuen Tab öffnen</a></div></div>`;
    }
    if (att.type === 'file') {
        const mime = att.mime || '';
        const name = escapeHtml(att.name || 'Datei');
        const data = escapeAttr(att.data || '');
        if (mime.startsWith('image/')) return `<div class="snapshot-preview-box"><div class="snapshot-preview-header"><span><i class="ri-image-line"></i> ${name}</span></div><img src="${data}" alt="${name}"></div>`;
        if (mime === 'application/pdf') return `<div class="snapshot-preview-box"><div class="snapshot-preview-header"><span><i class="ri-file-pdf-line"></i> ${name}</span></div><embed src="${data}" type="application/pdf"></embed></div>`;
        return `<div class="snapshot-preview-box"><div class="snapshot-preview-header"><span><i class="ri-file-line"></i> ${name}</span> <a href="${data}" download="${escapeAttr(att.name || 'datei')}">Download</a></div><iframe src="${data}" loading="lazy"></iframe></div>`;
    }
    if (att.type === 'tag') return `<span class="snapshot-tag"><i class="ri-price-tag-3-line"></i> ${escapeHtml(att.name || '')}</span>`;
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
function renderBoard(data) {
    const container = document.getElementById('main-board');
    container.innerHTML = '';
    data.forEach((track, tIdx) => {
        let trackHtml = `<div class="track ${track.class}"><div class="track-header"><div class="track-badge">Track ${tIdx + 1}</div><div class="track-name edit-wrap"><span class="edit-target">${track.title}</span><i class="ri-pencil-line edit-pen" onclick="makeEditable(this, event, 100)"></i></div></div>
        <div class="phases-wrapper">
            <div class="scroll-arrow left" onclick="scrollRow(this, -300)"><i class="ri-arrow-left-s-line"></i></div>
            <div class="phases-row" onscroll="updateScrollArrows(this)">`;
        if(track.phases) {
            track.phases.forEach((phase) => {
                trackHtml += `<div class="phase-col"><div class="phase-label edit-wrap"><span class="edit-target" title="${phase.name}">${phase.name}</span><i class="ri-pencil-line edit-pen" onclick="makeEditable(this, event, 40)"></i></div><div class="phase-cards">${renderCards(phase.cards)}<button class="add-entry-btn" onclick="addCard(this)"><i class="ri-add-line"></i> Neue Karte</button></div></div>`;
            });
        }
        trackHtml += `<div class="phase-col add-phase-col" style="justify-content:center; align-items:center; min-width: 200px; padding: 20px;"><button class="add-entry-btn" onclick="addPhase(this)"><i class="ri-add-line"></i> Phase hinzufügen</button></div>`;
        trackHtml += `</div><div class="scroll-arrow right" onclick="scrollRow(this, 300)"><i class="ri-arrow-right-s-line"></i></div></div></div>`;
        container.insertAdjacentHTML('beforeend', trackHtml);
    });
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
                        return `<span class="attachment-item tag" data-type="tag" data-name="${att.name}"><span class="edit-target">${att.name}</span><i class="ri-pencil-line edit-pen" onclick="makeEditable(this, event)"></i><i class="ri-close-line tag-delete-btn" onclick="softDelete(this.closest('.tag'), 'Tag')"></i></span>`;
                    } else if (att.type === 'richtext') {
                        return renderRichTextAttachment(att.html);
                    }
                    return '';
                }).join('');
                return `<li class="item-container"><div class="item-row"><div class="edit-wrap"><span class="edit-target">${subItem.text}</span></div><div class="item-actions"><i class="ri-pencil-line action-btn-small edit-item-icon" onclick="makeEditable(this, event, 500)" data-edit-selector=".edit-target" data-edit-scope=".item-row"></i><i class="ri-add-line action-btn-small" onclick="openItemMenu(this, event)"></i><i class="ri-delete-bin-line action-btn-small delete-btn" onclick="softDelete(this.closest('.item-container'), 'Eintrag')"></i></div></div><div class="item-attachments-wrapper tags-container">${atts}</div></li>`;
            }).join('');
            return `<div class="field" data-section-name="${sec.name}" data-section-icon="${sec.icon}"><div class="field-label"><div class="field-header-flex"><span><i class="${sec.icon} main-icon" aria-hidden="true"></i> ${sec.name} <span class="item-count">${sec.items.length}</span></span><button class="add-entry-btn" style="width:auto; padding:0px 4px; color:var(--brand); border:none;" onclick="addListItem(this)"><i class="ri-add-line"></i></button></div></div><div class="field-content"><ul class="section-item-list">${itemsHtml}</ul></div></div>`;
        }).join('');
        return `<div class="sop-card"><div class="card-trigger" onclick="this.parentElement.classList.toggle('open')"><div class="card-header-main"><div class="card-title-wrap"><div class="card-title"><span class="edit-target">${cardObj.title}</span></div></div><div class="card-actions"><i class="ri-pencil-line action-icon edit-title-icon" onclick="makeEditable(this, event, 80)" data-edit-selector=".card-title .edit-target" data-edit-scope=".sop-card" title="Titel bearbeiten"></i><i class="ri-external-link-line action-icon" style="color: var(--brand);" onclick="openCardDetails(this, event)" title="Großansicht"></i><i class="ri-delete-bin-line action-icon" style="color: var(--danger);" onclick="deleteCard(this, event)" title="Karte löschen"></i><i class="ri-arrow-down-s-line action-icon chevron-icon"></i></div></div><div class="card-meta-chips"></div></div><div class="card-body">${sectionsHtml}</div></div>`;
    }).join('');
}

function renderCardDetailAttachment(att) {
    const type = att.dataset.type;
    if (type === 'link') {
        const url = att.dataset.url || '';
        const rawName = att.dataset.name || url;
        return `<div class="preview-box detail-preview-box" data-type="link" data-url="${escapeAttr(url)}" data-name="${escapeAttr(rawName)}"><div class="preview-header"><span><i class="ri-global-line"></i> <a href="${url}" target="_blank" style="color:inherit;text-decoration:none;">${escapeHtml(rawName)}</a></span></div><iframe src="${url}" loading="lazy" onload="iframeLoaded(this)" onerror="showIframeFallback(this)"></iframe><div class="iframe-fallback" style="display:none; padding:20px; text-align:center; color:var(--muted); font-size:0.85rem;"><i class="ri-lock-line" style="font-size:2rem; display:block; margin-bottom:8px;"></i>Diese Seite erlaubt keine Einbettung.<br><a href="${url}" target="_blank" style="color:var(--brand);">Im neuen Tab öffnen →</a></div></div>`;
    }
    if (type === 'file') {
        const mime = att.dataset.mime || '';
        const name = escapeHtml(att.dataset.name || 'Datei');
        const base64 = att.querySelector('.hidden-base64-data') ? att.querySelector('.hidden-base64-data').value : att.dataset.filedata;
        const displayUrl = (mime === 'application/pdf') ? createBlobUrl(base64 || '', mime) : (base64 || '');
        if (mime.startsWith('image/')) return `<div class="preview-box detail-preview-box"><div class="preview-header"><span><i class="ri-image-line"></i> ${name}</span></div><img src="${displayUrl}" alt="${name}"></div>`;
        if (mime === 'application/pdf') return `<div class="preview-box detail-preview-box"><div class="preview-header"><span><i class="ri-file-pdf-line"></i> ${name}</span></div><embed src="${displayUrl}" type="application/pdf"></embed></div>`;
        return `<div class="preview-box detail-preview-box"><div class="preview-header"><span><i class="ri-file-line"></i> ${name}</span></div><iframe src="${displayUrl}" loading="lazy"></iframe></div>`;
    }
    if (type === 'tag') return `<span style="background:var(--status-bg); border:1px solid var(--line); border-radius:999px; padding:4px 12px; font-size:0.8rem; width:fit-content; color:var(--status-text);"><i class="ri-price-tag-3-line"></i> ${escapeHtml(att.dataset.name || '')}</span>`;
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
    document.getElementById('card-detail-title').innerHTML = `<i class="ri-external-link-line" aria-hidden="true"></i> ${escapeHtml(title)}`;
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
    if (type === 'image') container.innerHTML = `<img src="${url}" class="fullscreen-content" style="object-fit:contain;">`;
    else if (type === 'pdf') container.innerHTML = `<embed src="${url}" type="application/pdf" class="fullscreen-content" style="width:90%; height:90%;"></embed>`;
    else container.innerHTML = `<iframe src="${url}" class="fullscreen-content" style="width:90%; height:90%; background:#fff;"></iframe>`;
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
    if (!confirm("Alte Version laden? Ungespeicherte Änderungen gehen verloren.")) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/load/${id}`);
        const result = await response.json();
        if (result.status === 'success' && result.data && result.data.length > 0) {
            renderBoard(result.data);
            saveToLocal();
            document.getElementById('revision-modal').style.display = 'none';
            showToast("Version erfolgreich geladen.", "success");
        }
    } catch (error) { showToast("Fehler beim Laden der Version.", "error"); }
}

function updateCardMetaChips() {
    document.querySelectorAll('.sop-card').forEach(card => {
        const chipsContainer = card.querySelector('.card-meta-chips');
        if(!chipsContainer) return;
        const items = card.querySelectorAll('.item-container').length;
        const atts = card.querySelectorAll('.attachment-item').length;
        let html = '';
        if(items > 0) html += `<span class="meta-chip"><i class="ri-list-check" aria-hidden="true"></i> ${items}</span>`;
        if(atts > 0) html += `<span class="meta-chip"><i class="ri-attachment-2" aria-hidden="true"></i> ${atts}</span>`;
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
    const newPhaseHtml = `<div class="phase-col"><div class="phase-label edit-wrap"><span class="edit-target" title="Neue Phase">Neue Phase</span><i class="ri-pencil-line edit-pen" onclick="makeEditable(this, event, 40)"></i></div><div class="phase-cards"><button class="add-entry-btn" onclick="addCard(this)"><i class="ri-add-line"></i> Neue Karte</button></div></div>`;
    btn.closest('.add-phase-col').insertAdjacentHTML('beforebegin', newPhaseHtml);
    updateScrollArrows(trackPhasesRow);
    saveToLocal();
}

function addListItem(btn) {
    const list = btn.closest('.field').querySelector('.section-item-list');
    const html = `<li class="item-container"><div class="item-row"><div class="edit-wrap"><span class="edit-target">Neuer Punkt</span></div><div class="item-actions"><i class="ri-pencil-line action-btn-small edit-item-icon" onclick="makeEditable(this, event, 500)" data-edit-selector=".edit-target" data-edit-scope=".item-row"></i><i class="ri-add-line action-btn-small" onclick="openItemMenu(this, event)"></i><i class="ri-delete-bin-line action-btn-small delete-btn" onclick="softDelete(this.closest('.item-container'), 'Eintrag')"></i></div></div><div class="item-attachments-wrapper tags-container"></div></li>`;
    list.insertAdjacentHTML('beforeend', html);
    saveToLocal();
}

// --- CLOUD SAVE ---
function saveRevisionToCloud() {
    if(isOffline) { showToast("Offline: Speichern in der Cloud nicht möglich.", "error"); return; }
    document.getElementById('modal-author-name').value = '';
    document.getElementById('save-modal').style.display = 'flex';
    document.getElementById('modal-author-name').focus();
}

async function confirmSaveRevision() {
    const authorName = document.getElementById('modal-author-name').value.trim();
    if (!authorName) { showToast("Bitte einen Namen eingeben.", "error"); return; }
    closeModal('save-modal');
    const btn = document.getElementById('main-save-btn');
    btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Speichere...';
    try {
        const response = await fetch(`${API_BASE_URL}/api/save`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: serializeBoardFromDOM(), author: authorName, timestamp: new Date().toLocaleString('de-DE') })
        });
        if(response.ok) {
            btn.innerHTML = '<i class="ri-check-line"></i> Gespeichert';
            showToast("Erfolgreich in der Cloud gespeichert!", "success");
            setTimeout(() => btn.innerHTML = '<i class="ri-upload-cloud-2-line"></i> Speichern', 3000);
        }
    } catch (e) {
        showToast("Speichern fehlgeschlagen.", "error");
        btn.innerHTML = '<i class="ri-upload-cloud-2-line"></i> Speichern';
    }
}

// --- REVISIONS ---
async function openRevisions() {
    const listEl = document.getElementById('revision-list');
    listEl.innerHTML = '<div style="text-align:center; padding: 20px;"><i class="ri-loader-4-line ri-spin"></i></div>';
    document.getElementById('revision-modal').style.display = 'flex';
    try {
        const response = await fetch(`${API_BASE_URL}/api/history`);
        const result = await response.json();
        listEl.innerHTML = '';
        if(result.history && result.history.length > 0) {
            result.history.forEach((rev, index) => {
                const isCurrent = index === 0 ? '<span style="color:var(--brand); font-weight:bold; font-size:0.8rem; margin-left:10px;">(Aktuell)</span>' : '';
                listEl.insertAdjacentHTML('beforeend', `<div class="revision-item"><div class="revision-header"><div class="rev-date"><i class="ri-time-line"></i> ${rev.timestamp} <span style="background:var(--brand-light); color:var(--brand-dark); padding:2px 8px; border-radius:999px; font-size:0.75rem;"><i class="ri-user-line"></i> ${rev.author || 'Unbekannt'}</span> ${isCurrent}</div><button class="rev-restore-btn" onclick="restoreRevision(${rev.id})">Laden</button></div></div>`);
            });
        } else { listEl.innerHTML = '<p style="padding: 10px;">Keine Versionen.</p>'; }
    } catch (error) { listEl.innerHTML = '<p style="color:var(--danger); padding: 10px;">Konnte Verlauf nicht laden.</p>'; }
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

function renderReadAttachmentData(att) {
    if (att.type === 'link') {
        const url = att.url || '';
        const label = att.name || url || 'Link';
        return `<div class="read-full-preview read-full-preview--media read-full-preview--bleed" data-type="link">
            <iframe class="read-embed" src="${escapeAttr(url)}" loading="lazy" title="${escapeAttr(label)}" onload="iframeLoaded(this)" onerror="showIframeFallback(this)"></iframe>
            <div class="iframe-fallback" style="display:none; padding:20px; text-align:center; color:var(--muted); font-size:0.85rem;">Einbetten ggf. nicht erlaubt. <a href="${escapeAttr(url)}" target="_blank" rel="noopener" style="color:var(--brand);">Im Tab öffnen</a></div>
        </div>`;
    }
    if (att.type === 'file') {
        const mime = att.mime || '';
        const name = att.name || 'Datei';
        const nameEsc = escapeHtml(name);
        const data = att.data || '';
        const displayUrl = (mime === 'application/pdf') ? createBlobUrl(data, mime) : data;
        if (mime.startsWith('image/')) {
            return `<div class="read-full-preview read-full-preview--media read-full-preview--bleed"><img class="read-embed" src="${displayUrl}" alt=""></div>`;
        }
        if (mime === 'application/pdf') {
            return `<div class="read-full-preview read-full-preview--media read-full-preview--bleed"><embed class="read-embed" src="${displayUrl}" type="application/pdf" title="${escapeAttr(name)}"></div>`;
        }
        return `<div class="read-file-fallback read-full-preview--bleed"><a class="read-file-open" href="${escapeAttr(displayUrl)}" target="_blank" rel="noopener" download="${escapeAttr(name)}"><i class="ri-external-link-line" aria-hidden="true"></i><span>Datei öffnen</span></a></div>`;
    }
    if (att.type === 'tag') {
        return `<p style="margin:0.3rem 0 0.5rem 0;"><span style="display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:var(--status-bg);border-radius:999px;padding:4px 12px;font-size:0.88rem;"><i class="ri-price-tag-3-line" style="color:var(--brand);"></i>${escapeHtml(att.name || '')}</span></p>`;
    }
    if (att.type === 'richtext') {
        return `<div class="read-richtext-wrap read-full-preview read-full-preview--bleed-text">${sanitizeRichTextHTML(att.html || '')}</div>`;
    }
    return '';
}

function buildReadModeCardHtml(card) {
    let h = `<article class="read-card-block"><h3 class="read-card-title">${escapeHtml(card.title || '')}</h3>`;
    (card.sections || []).forEach((sec) => {
        h += `<div class="read-section"><h4 class="read-section-title"><i class="${sec.icon || 'ri-file-list-3-line'}" aria-hidden="true"></i> ${escapeHtml(sec.name || '')}</h4><div class="read-section-list">`;
        (sec.items || []).forEach((item) => {
            const atts = (item.attachments || []).map((a) => renderReadAttachmentData(a)).join('');
            h += `<div class="read-item${atts ? ' read-item--with-attachments' : ''}">`;
            h += `<div class="read-item-text">${escapeHtml(item.text || '')}</div>`;
            if (atts) h += `<div class="read-item-attachments">${atts}</div>`;
            h += `</div>`;
        });
        h += `</div></div>`;
    });
    h += `</article>`;
    return h;
}

function buildReadModePhaseHtml(step) {
    const cards = step.cards || [];
    if (cards.length === 0) {
        return '<p class="read-empty" style="text-align:center; color:var(--muted); padding:2.5rem 1rem;">In dieser Phase sind noch keine Karten.</p>';
    }
    return cards.map((c) => buildReadModeCardHtml(c)).join('');
}

function sizeReadPreviewHeights() {
    const root = document.getElementById('read-mode-root');
    if (!root || !document.body.classList.contains('sop-mode-read')) return;
    const sticky = root.querySelector('.read-mode-sticky');
    const nav = root.querySelector('.read-nav');
    const vh = window.innerHeight;
    const top = sticky ? sticky.getBoundingClientRect().bottom : 0;
    const navH = nav ? nav.offsetHeight : 56;
    const margin = 32;
    const available = Math.max(180, vh - top - navH - margin);
    const h = Math.max(220, Math.min(580, available * 0.58));
    root.querySelectorAll('.read-full-preview--media iframe.read-embed, .read-full-preview--media embed.read-embed').forEach((el) => {
        el.style.height = h + 'px';
        el.style.minHeight = '0';
    });
    root.querySelectorAll('.read-full-preview--media > img.read-embed').forEach((el) => {
        el.style.maxHeight = h + 'px';
        el.style.width = '100%';
    });
}

function refreshReadModeView() {
    const data = serializeBoardFromDOM();
    const steps = getReadModeSteps();
    const elP = document.getElementById('read-mode-progress');
    const elBody = document.getElementById('read-mode-body');
    const trackTabs = document.getElementById('read-track-tabs');
    const phaseTabs = document.getElementById('read-phase-tabs');
    const prevBtn = document.getElementById('read-mode-prev');
    const nextBtn = document.getElementById('read-mode-next');
    if (!elBody) return;
    if (steps.length === 0) {
        if (elP) { elP.textContent = '—'; elP.setAttribute('title', ''); }
        if (trackTabs) trackTabs.innerHTML = '';
        if (phaseTabs) phaseTabs.innerHTML = '';
        elBody.innerHTML = '<p class="read-empty" style="text-align:center; color:var(--muted); padding:2.5rem 1rem;">Noch kein SOP-Inhalt – wechsle in den Bearbeiten-Modus.</p>';
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        return;
    }
    if (readModeIndex >= steps.length) readModeIndex = steps.length - 1;
    if (readModeIndex < 0) readModeIndex = 0;
    const step = steps[readModeIndex];
    if (elP) {
        const cur = readModeIndex + 1;
        const tot = steps.length;
        elP.textContent = `${cur} / ${tot}`;
        elP.setAttribute('title', `Schritt ${cur} von ${tot}`);
    }

    if (trackTabs && data && data.length) {
        trackTabs.innerHTML = '';
        data.forEach((tr, ti) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'read-tab read-tab--track ' + (tr.class || 'track-pre') + (step.trackIndex === ti ? ' read-tab--active' : '');
            b.setAttribute('role', 'tab');
            b.setAttribute('aria-selected', step.trackIndex === ti ? 'true' : 'false');
            b.textContent = tr.title || `Track ${ti + 1}`;
            b.addEventListener('click', () => {
                const idx = steps.findIndex(s => s.trackIndex === ti);
                if (idx >= 0) { readModeIndex = idx; refreshReadModeView(); }
            });
            trackTabs.appendChild(b);
        });
    }
    if (phaseTabs) {
        phaseTabs.innerHTML = '';
        steps.forEach((s, flatIdx) => {
            if (s.trackIndex !== step.trackIndex) return;
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'read-tab read-tab--phase' + (flatIdx === readModeIndex ? ' read-tab--active' : '');
            b.setAttribute('role', 'tab');
            b.setAttribute('aria-selected', flatIdx === readModeIndex ? 'true' : 'false');
            b.textContent = s.phaseName;
            b.title = s.phaseName;
            b.addEventListener('click', () => { readModeIndex = flatIdx; refreshReadModeView(); });
            phaseTabs.appendChild(b);
        });
    }

    elBody.innerHTML = buildReadModePhaseHtml(step);
    if (prevBtn) prevBtn.disabled = readModeIndex === 0;
    if (nextBtn) nextBtn.disabled = readModeIndex >= steps.length - 1;
    elBody.scrollTop = 0;
    const aTr = trackTabs && trackTabs.querySelector('.read-tab--active');
    if (aTr) aTr.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    const aPh = phaseTabs && phaseTabs.querySelector('.read-tab--active');
    if (aPh) aPh.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    requestAnimationFrame(() => { requestAnimationFrame(() => { sizeReadPreviewHeights(); }); });
}

function readModePrev() {
    if (readModeIndex > 0) { readModeIndex--; refreshReadModeView(); }
}

function readModeNext() {
    const steps = getReadModeSteps();
    if (readModeIndex < steps.length - 1) { readModeIndex++; refreshReadModeView(); }
}

function setSopViewMode(mode) {
    const isRead = mode === 'read';
    sopViewMode = isRead ? 'read' : 'edit';
    document.body.classList.toggle('sop-mode-read', isRead);
    const rb = document.getElementById('sop-mode-read-btn');
    const eb = document.getElementById('sop-mode-edit-btn');
    if (rb) rb.setAttribute('aria-pressed', isRead);
    if (eb) eb.setAttribute('aria-pressed', !isRead);
    if (isRead) { readModeIndex = 0; refreshReadModeView(); }
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
    placeholder.innerHTML = `<i class="ri-loader-4-line ri-spin" style="font-size:1.5rem;display:block;margin-bottom:8px;color:var(--brand);"></i>${file.name} wird verarbeitet...`;
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
