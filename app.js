/* ════════════════════════════════════════════════════════════════
   ROOTS SOP Tool – app.js
   Supabase-backed SOP editor with full version history.
   PythonAnywhere-Anbindung entfernt – alles läuft über Supabase.
   ════════════════════════════════════════════════════════════════ */
'use strict';

// ─── HELPERS ─────────────────────────────────────────────────
function sb() { return window.__rootsSupabaseClient; }
function esc(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function toast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const el = document.createElement('div');
  const icons = { success:'fa-circle-check', error:'fa-circle-exclamation', info:'fa-circle-info', warning:'fa-triangle-exclamation' };
  el.className = `toast toast-${type}`;
  el.innerHTML = `<i class="fa-solid ${icons[type]||icons.info}"></i> ${esc(msg)}`;
  c.appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3500);
}
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' })
    + ' ' + d.toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' });
}

// ─── STATE ────────────────────────────────────────────────────
const SOP = {
  tracks: [],
  phases: [],
  cards: [],
  dirty: false,
  saving: false,
  mode: 'edit',          // 'edit' | 'read'
  searchQuery: '',
  _activeCardId: null,   // Karte, auf die ein Attach-Modal wirkt
  _readTrackIdx: 0,
  _readPhaseIdx: 0,
  _filterTimer: null,
};

// ─── TREE HELPERS ─────────────────────────────────────────────
function phasesOf(trackId) {
  return SOP.phases
    .filter(p => p.track_id === trackId)
    .sort((a, b) => a.sort_order - b.sort_order);
}
function cardsOf(phaseId) {
  return SOP.cards
    .filter(c => c.phase_id === phaseId)
    .sort((a, b) => a.sort_order - b.sort_order);
}
function buildTree() {
  return SOP.tracks
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(t => ({
      ...t,
      phases: phasesOf(t.id).map(p => ({ ...p, cards: cardsOf(p.id) }))
    }));
}
function findCard(id) { return SOP.cards.find(c => c.id === id); }
function findPhase(id) { return SOP.phases.find(p => p.id === id); }
function findTrack(id) { return SOP.tracks.find(t => t.id === id); }

// ─── LOAD ─────────────────────────────────────────────────────
async function loadSOP() {
  const board = document.getElementById('main-board');
  board.innerHTML = '<div style="text-align:center;padding:50px"><i class="fa-solid fa-spinner fa-spin" style="font-size:2rem;color:var(--brand)"></i><p style="margin-top:1rem;color:var(--muted);font-size:.9rem">SOP wird geladen…</p></div>';

  try {
    const [tr, ph, ca] = await Promise.all([
      sb().from('sop_tracks').select('*').order('sort_order'),
      sb().from('sop_phases').select('*').order('sort_order'),
      sb().from('sop_cards').select('*').order('sort_order'),
    ]);
    if (tr.error) throw tr.error;
    if (ph.error) throw ph.error;
    if (ca.error) throw ca.error;

    SOP.tracks = tr.data || [];
    SOP.phases = ph.data || [];
    SOP.cards  = ca.data || [];
    SOP.dirty  = false;

    renderBoard();
    renderReadMode();
    updateSaveBtn();
  } catch (e) {
    board.innerHTML = `<div style="text-align:center;padding:50px;color:var(--danger)">
      <i class="fa-solid fa-circle-exclamation" style="font-size:2rem"></i>
      <p style="margin-top:1rem">Fehler beim Laden: ${esc(e.message)}</p>
      <button onclick="loadSOP()" style="margin-top:1rem;padding:.5rem 1rem;border-radius:8px;border:1px solid var(--line);background:var(--brand);color:#fff;cursor:pointer">Erneut versuchen</button>
    </div>`;
  }
}

// ─── DIRTY FLAG ───────────────────────────────────────────────
function markDirty() {
  SOP.dirty = true;
  updateSaveBtn();
}
function updateSaveBtn() {
  const btn = document.getElementById('main-save-btn');
  if (!btn) return;
  if (SOP.dirty) {
    btn.classList.add('has-changes');
    btn.title = 'Ungespeicherte Änderungen – jetzt speichern';
  } else {
    btn.classList.remove('has-changes');
    btn.title = 'Alle Änderungen gespeichert';
  }
}

// ─── RENDER BOARD (Edit Mode) ─────────────────────────────────
function renderBoard() {
  const board = document.getElementById('main-board');
  const tree  = buildTree();
  const q     = SOP.searchQuery.toLowerCase();

  let html = '<div class="board-columns">';
  tree.forEach(track => {
    const trackPhases = track.phases;
    const trackClass  = track.class || 'track-pre';

    html += `<div class="track-col track-col--${trackClass}">
      <div class="track-header track-header--${trackClass}">
        <span class="track-label">${esc(track.title)}</span>
        <span class="track-phase-count">${trackPhases.length} Phase${trackPhases.length !== 1 ? 'n' : ''}</span>
      </div>`;

    trackPhases.forEach(phase => {
      const visibleCards = phase.cards.filter(c =>
        c.status !== 'archived' &&
        (!q || c.name.toLowerCase().includes(q) || (c.intro||'').toLowerCase().includes(q) || (c.description||'').toLowerCase().includes(q))
      );
      const allCards = phase.cards.filter(c => c.status !== 'archived');
      const phaseHidden = q && visibleCards.length === 0;

      html += `<div class="phase-group${phaseHidden ? ' phase-hidden' : ''}">
        <div class="phase-title-row">
          <span class="phase-label"
            contenteditable="${SOP.mode === 'edit' ? 'true' : 'false'}"
            data-phase-id="${esc(phase.id)}"
            data-field="name"
            onblur="handleInlineEdit(this,'phase')"
            onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}"
            title="${esc(phase.intro || '')}">${esc(phase.name)}</span>
          <span class="phase-card-count">${allCards.length}</span>
          ${SOP.mode === 'edit' ? `<button class="phase-add-card-btn" onclick="addCard('${esc(phase.id)}')" title="Karte hinzufügen"><i class="fa-solid fa-plus"></i></button>` : ''}
        </div>`;

      if (SOP.mode === 'edit') {
        html += `<div class="phase-intro-row">
          <span class="phase-intro-text"
            contenteditable="true"
            data-phase-id="${esc(phase.id)}"
            data-field="intro"
            onblur="handleInlineEdit(this,'phase')"
            onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}"
            placeholder="Kurze Phasenbeschreibung…">${esc(phase.intro || '')}</span>
        </div>`;
      }

      visibleCards.forEach(card => {
        const hasTags  = card.tags && card.tags.length > 0;
        const hasAtt   = card.attachments && card.attachments.length > 0;
        const hasDesc  = card.description && card.description.trim().length > 0;

        html += `<div class="sop-card" data-card-id="${esc(card.id)}" data-phase-id="${esc(phase.id)}">
          <div class="card-header-row">
            <span class="card-title">
              <span class="edit-target"
                contenteditable="${SOP.mode === 'edit' ? 'true' : 'false'}"
                data-card-id="${esc(card.id)}"
                data-field="name"
                onblur="handleInlineEdit(this,'card')"
                onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}">${esc(card.name)}</span>
            </span>
            ${SOP.mode === 'edit' ? `<div class="card-actions">
              <button class="card-action-btn" title="Anhängen" onclick="openAttachMenu('${esc(card.id)}',this,event)"><i class="fa-solid fa-paperclip"></i></button>
              <button class="card-action-btn" title="Details" onclick="openCardDetail('${esc(card.id)}')"><i class="fa-solid fa-pen-to-square"></i></button>
              <button class="card-action-btn card-action-btn--danger" title="Archivieren" onclick="archiveCard('${esc(card.id)}')"><i class="fa-solid fa-archive"></i></button>
            </div>` : `<button class="card-action-btn" title="Details" onclick="openCardDetail('${esc(card.id)}')"><i class="fa-solid fa-arrow-right"></i></button>`}
          </div>`;

        if (card.intro) {
          html += `<p class="card-intro">${esc(card.intro)}</p>`;
        }

        if (hasTags) {
          html += '<div class="card-tags">';
          card.tags.forEach(tag => { html += `<span class="card-tag">${esc(tag)}</span>`; });
          html += '</div>';
        }

        if (hasAtt || hasDesc) {
          html += '<div class="card-meta-icons">';
          if (hasDesc) html += `<span class="card-meta-icon" title="Beschreibung vorhanden"><i class="fa-solid fa-align-left"></i></span>`;
          if (hasAtt)  html += `<span class="card-meta-icon" title="${esc(card.attachments.length)} Anhang/Anhänge"><i class="fa-solid fa-paperclip"></i> ${card.attachments.length}</span>`;
          html += '</div>';
        }

        html += '</div>'; // .sop-card
      });

      if (SOP.mode === 'edit' && !q) {
        html += `<button class="add-card-row-btn" onclick="addCard('${esc(phase.id)}')"><i class="fa-solid fa-plus"></i> Karte hinzufügen</button>`;
      }

      html += '</div>'; // .phase-group
    });

    if (SOP.mode === 'edit') {
      html += `<button class="add-phase-btn" onclick="addPhase('${esc(track.id)}')"><i class="fa-solid fa-plus"></i> Phase hinzufügen</button>`;
    }

    html += '</div>'; // .track-col
  });

  html += '</div>'; // .board-columns
  board.innerHTML = html;
}

// ─── INLINE EDIT ──────────────────────────────────────────────
async function handleInlineEdit(el, kind) {
  const newVal = el.textContent.trim();
  if (!newVal) { el.textContent = el.dataset.prev || ''; return; }

  if (kind === 'card') {
    const cardId = el.dataset.cardId;
    const field  = el.dataset.field;
    const card   = findCard(cardId);
    if (!card || card[field] === newVal) return;
    card[field] = newVal;
    await sb().from('sop_cards').update({ [field]: newVal }).eq('id', cardId);
    markDirty();
  } else if (kind === 'phase') {
    const phaseId = el.dataset.phaseId;
    const field   = el.dataset.field;
    const phase   = findPhase(phaseId);
    if (!phase || phase[field] === newVal) return;
    phase[field] = newVal;
    await sb().from('sop_phases').update({ [field]: newVal }).eq('id', phaseId);
    markDirty();
  }
}

// Store previous value on focus for cancel support
document.addEventListener('focusin', e => {
  if (e.target.contentEditable === 'true') {
    e.target.dataset.prev = e.target.textContent.trim();
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && e.target.contentEditable === 'true') {
    e.target.textContent = e.target.dataset.prev || e.target.textContent;
    e.target.blur();
  }
});

// ─── ADD CARD ─────────────────────────────────────────────────
async function addCard(phaseId) {
  const phase   = findPhase(phaseId);
  if (!phase) return;
  const maxOrder = Math.max(0, ...cardsOf(phaseId).map(c => c.sort_order));
  const { data, error } = await sb().from('sop_cards')
    .insert({ phase_id: phaseId, sort_order: maxOrder + 1, name: 'Neue Karte', intro: '' })
    .select().single();
  if (error) { toast('Fehler beim Anlegen der Karte', 'error'); return; }
  SOP.cards.push(data);
  markDirty();
  renderBoard();
  // Auto-focus the new card's name for immediate editing
  setTimeout(() => {
    const el = document.querySelector(`[data-card-id="${data.id}"][data-field="name"]`);
    if (el) { el.focus(); document.execCommand('selectAll'); }
  }, 80);
}

// ─── ADD PHASE ────────────────────────────────────────────────
async function addPhase(trackId) {
  const maxOrder = Math.max(0, ...phasesOf(trackId).map(p => p.sort_order));
  const { data, error } = await sb().from('sop_phases')
    .insert({ track_id: trackId, sort_order: maxOrder + 1, name: 'Neue Phase', intro: '' })
    .select().single();
  if (error) { toast('Fehler beim Anlegen der Phase', 'error'); return; }
  SOP.phases.push(data);
  markDirty();
  renderBoard();
}

// ─── ARCHIVE CARD ─────────────────────────────────────────────
async function archiveCard(cardId) {
  if (!confirm('Diese Karte archivieren? Sie wird ausgeblendet, bleibt aber im System.')) return;
  const { error } = await sb().from('sop_cards').update({ status: 'archived' }).eq('id', cardId);
  if (error) { toast('Fehler', 'error'); return; }
  const card = findCard(cardId);
  if (card) card.status = 'archived';
  markDirty();
  renderBoard();
  toast('Karte archiviert', 'info');
}

// ─── CARD DETAIL MODAL ────────────────────────────────────────
function openCardDetail(cardId) {
  const card  = findCard(cardId);
  if (!card) return;
  const phase = findPhase(card.phase_id);
  const track = phase ? SOP.tracks.find(t => phasesOf(t.id).some(p => p.id === phase.id)) : null;

  document.getElementById('card-detail-title').textContent = card.name;
  const body = document.getElementById('card-detail-body');

  const attHtml = (card.attachments || []).map((att, i) => `
    <div class="att-item">
      ${att.type === 'link' ? `<a href="${esc(att.url)}" target="_blank" rel="noopener"><i class="fa-solid fa-link"></i> ${esc(att.label || att.url)}</a>` : ''}
      ${att.type === 'richtext' ? `<div class="rt-preview">${att.html || esc(att.label || 'Textblock')}</div>` : ''}
      ${att.type === 'tag'  ? `<span class="card-tag">${esc(att.label)}</span>` : ''}
      ${att.type === 'file' ? `<span><i class="fa-solid fa-file"></i> ${esc(att.label || 'Datei')}</span>` : ''}
      ${SOP.mode === 'edit' ? `<button class="att-remove-btn" onclick="removeAttachment('${esc(card.id)}',${i})" title="Entfernen"><i class="fa-solid fa-xmark"></i></button>` : ''}
    </div>`).join('');

  body.innerHTML = `
    <div class="detail-meta">
      ${track  ? `<span class="detail-badge detail-badge--track">${esc(track.title.replace(/^Track \d+: /,''))}</span>` : ''}
      ${phase  ? `<span class="detail-badge">${esc(phase.name)}</span>` : ''}
    </div>
    ${SOP.mode === 'edit' ? `
    <div class="detail-section">
      <label class="modern-label">Kurzbeschreibung (Intro)</label>
      <textarea id="detail-intro" class="modern-input" rows="2" style="resize:vertical">${esc(card.intro || '')}</textarea>
    </div>
    <div class="detail-section">
      <label class="modern-label">Ausführliche Beschreibung</label>
      <textarea id="detail-desc" class="modern-input" rows="5" style="resize:vertical">${esc(card.description || '')}</textarea>
    </div>
    <div class="modal-btns" style="margin-top:.5rem;margin-bottom:1.25rem">
      <button class="btn-save" onclick="saveCardDetail('${esc(card.id)}')"><i class="fa-solid fa-floppy-disk"></i> Speichern</button>
    </div>` : `
    <div class="detail-section">
      <p style="color:var(--muted);font-size:.92rem">${esc(card.intro || '—')}</p>
    </div>
    ${card.description ? `<div class="detail-section"><div class="rt-preview" style="white-space:pre-wrap">${esc(card.description)}</div></div>` : ''}
    `}
    ${attHtml ? `<div class="detail-section"><p class="modern-label">Anhänge</p><div class="att-list">${attHtml}</div></div>` : ''}
    ${SOP.mode === 'edit' ? `<div class="detail-section">
      <button class="btn-revision" style="font-size:.8rem" onclick="closeModal('card-detail-modal');openAttachMenu('${esc(card.id)}',null,null)">
        <i class="fa-solid fa-plus"></i> Anhang hinzufügen
      </button>
    </div>` : ''}`;

  document.getElementById('card-detail-modal').style.display = 'flex';
  SOP._activeCardId = cardId;
}

async function saveCardDetail(cardId) {
  const intro = document.getElementById('detail-intro')?.value.trim();
  const desc  = document.getElementById('detail-desc')?.value.trim();
  const { error } = await sb().from('sop_cards')
    .update({ intro, description: desc }).eq('id', cardId);
  if (error) { toast('Fehler beim Speichern', 'error'); return; }
  const card = findCard(cardId);
  if (card) { card.intro = intro; card.description = desc; }
  markDirty();
  toast('Karte gespeichert', 'success');
  closeModal('card-detail-modal');
  renderBoard();
}

// ─── ATTACH MENU ──────────────────────────────────────────────
function openAttachMenu(cardId, btn, event) {
  SOP._activeCardId = cardId;
  const menu = document.getElementById('item-add-menu');
  menu.classList.toggle('open');
  if (btn && event) {
    const r = btn.getBoundingClientRect();
    menu.style.top  = (r.bottom + 6) + 'px';
    menu.style.left = r.left + 'px';
    event.stopPropagation();
  }
}
document.addEventListener('click', () => {
  const m = document.getElementById('item-add-menu');
  if (m) m.classList.remove('open');
});

function handleItemAttach(type) {
  const cardId = SOP._activeCardId;
  if (!cardId) return;
  closeModal('item-add-menu');
  const menu = document.getElementById('item-add-menu');
  if (menu) menu.classList.remove('open');

  if (type === 'link')     { document.getElementById('link-modal').style.display = 'flex'; }
  if (type === 'tag')      { document.getElementById('tag-modal').style.display  = 'flex'; }
  if (type === 'richtext') { openRichTextEditor(cardId); }
  if (type === 'file')     { document.getElementById('global-file-input').click(); }
}

async function confirmTagAdd() {
  const tag = document.getElementById('modal-tag-name')?.value.trim();
  if (!tag) return;
  const card = findCard(SOP._activeCardId);
  if (!card) return;
  const tags = [...(card.tags || []), tag];
  await sb().from('sop_cards').update({ tags }).eq('id', card.id);
  card.tags = tags;
  markDirty();
  toast('Tag hinzugefügt', 'success');
  document.getElementById('modal-tag-name').value = '';
  document.getElementById('tag-modal').style.display = 'none';
  renderBoard();
}

async function confirmLinkAdd() {
  const url   = document.getElementById('modal-link-url')?.value.trim();
  const label = document.getElementById('modal-link-name')?.value.trim() || url;
  if (!url) return;
  const card = findCard(SOP._activeCardId);
  if (!card) return;
  const attachments = [...(card.attachments || []), { type: 'link', url, label }];
  await sb().from('sop_cards').update({ attachments }).eq('id', card.id);
  card.attachments = attachments;
  markDirty();
  toast('Link hinzugefügt', 'success');
  document.getElementById('modal-link-url').value  = 'https://';
  document.getElementById('modal-link-name').value = '';
  document.getElementById('link-modal').style.display = 'none';
  renderBoard();
}

async function removeAttachment(cardId, idx) {
  const card = findCard(cardId);
  if (!card) return;
  card.attachments.splice(idx, 1);
  await sb().from('sop_cards').update({ attachments: card.attachments }).eq('id', cardId);
  markDirty();
  openCardDetail(cardId);
  renderBoard();
}

// File attachment
document.getElementById('global-file-input').addEventListener('change', async function () {
  const file = this.files[0];
  if (!file) return;
  const card = findCard(SOP._activeCardId);
  if (!card) return;
  const attachments = [...(card.attachments || []), { type: 'file', label: file.name }];
  await sb().from('sop_cards').update({ attachments }).eq('id', card.id);
  card.attachments = attachments;
  markDirty();
  toast(`Datei "${file.name}" verknüpft`, 'success');
  renderBoard();
  this.value = '';
});

// ─── RICHTEXT (einfacher Inline-Editor) ───────────────────────
let _rtCardId = null;

function openRichTextEditor(cardId) {
  _rtCardId = cardId;
  const modal   = document.getElementById('rt-fullscreen-modal');
  const editor  = document.getElementById('rt-fullscreen-editor');
  const toolbar = document.getElementById('rt-fullscreen-toolbar');
  editor.innerHTML = '';
  toolbar.innerHTML = buildRtToolbar();
  modal.style.display = 'flex';
  editor.focus();
}

function buildRtToolbar() {
  return `
    <button class="rt-btn" onclick="document.execCommand('bold')"       title="Fett"><b>B</b></button>
    <button class="rt-btn" onclick="document.execCommand('italic')"     title="Kursiv"><i>I</i></button>
    <button class="rt-btn" onclick="document.execCommand('underline')"  title="Unterstrichen"><u>U</u></button>
    <button class="rt-btn" onclick="document.execCommand('insertUnorderedList')" title="Liste"><i class="fa-solid fa-list-ul"></i></button>
    <button class="rt-btn" onclick="document.execCommand('insertOrderedList')"   title="Nummeriert"><i class="fa-solid fa-list-ol"></i></button>
    <button class="rt-btn" onclick="openRtLinkModal()" title="Link"><i class="fa-solid fa-link"></i></button>
    <button class="rt-btn" onclick="openRtTableModal()" title="Tabelle"><i class="fa-solid fa-table"></i></button>`;
}

function syncRichTextFullscreen() { /* live sync if needed */ }

async function closeRichTextFullscreen() {
  const html = document.getElementById('rt-fullscreen-editor')?.innerHTML || '';
  if (_rtCardId && html.trim()) {
    const card = findCard(_rtCardId);
    if (card) {
      const attachments = [...(card.attachments || []), { type: 'richtext', html, label: 'Textblock' }];
      await sb().from('sop_cards').update({ attachments }).eq('id', _rtCardId);
      card.attachments = attachments;
      markDirty();
      toast('Textblock hinzugefügt', 'success');
      renderBoard();
    }
  }
  document.getElementById('rt-fullscreen-modal').style.display = 'none';
  _rtCardId = null;
}

function openRtLinkModal()  { document.getElementById('rt-link-modal').style.display  = 'flex'; }
function openRtTableModal() { document.getElementById('rt-table-modal').style.display = 'flex'; }

function confirmRichTextLink() {
  const url = document.getElementById('rt-link-input')?.value.trim();
  if (url) document.execCommand('createLink', false, url);
  document.getElementById('rt-link-modal').style.display = 'none';
}

function confirmRichTextTable() {
  const rows = parseInt(document.getElementById('rt-table-rows')?.value || '3', 10);
  const cols = parseInt(document.getElementById('rt-table-cols')?.value || '3', 10);
  let tbl = '<table style="border-collapse:collapse;width:100%;margin:.5rem 0">';
  for (let r = 0; r < rows; r++) {
    tbl += '<tr>';
    for (let c = 0; c < cols; c++) {
      tbl += `<td style="border:1px solid #cbd5e1;padding:6px 10px;min-width:60px" contenteditable="true">&nbsp;</td>`;
    }
    tbl += '</tr>';
  }
  tbl += '</table>';
  document.execCommand('insertHTML', false, tbl);
  document.getElementById('rt-table-modal').style.display = 'none';
}

// ─── MODAL HELPERS ────────────────────────────────────────────
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}
function openExportMenu(btn, event) {
  event.stopPropagation();
  const menu = document.getElementById('export-menu');
  menu.classList.toggle('open');
}

// ─── SEARCH / FILTER ──────────────────────────────────────────
function filterCardsDebounced(val) {
  clearTimeout(SOP._filterTimer);
  SOP._filterTimer = setTimeout(() => {
    SOP.searchQuery = val;
    renderBoard();
  }, 180);
}

// ─── MODE TOGGLE ──────────────────────────────────────────────
function setMode(mode) {
  SOP.mode = mode;
  document.body.classList.toggle('sop-mode-read', mode === 'read');
  document.getElementById('sop-mode-edit-btn').setAttribute('aria-pressed', mode === 'edit');
  document.getElementById('sop-mode-read-btn').setAttribute('aria-pressed', mode === 'read');

  const board    = document.getElementById('main-board');
  const readRoot = document.getElementById('read-mode-root');
  if (mode === 'read') {
    board.style.display    = 'none';
    readRoot.style.display = 'block';
    renderReadMode();
    renderReadBody();
  } else {
    board.style.display    = '';
    readRoot.style.display = 'none';
    renderBoard();
  }
}

document.getElementById('sop-mode-edit-btn').onclick = () => setMode('edit');
document.getElementById('sop-mode-read-btn').onclick = () => setMode('read');

// ─── READ MODE ────────────────────────────────────────────────
function renderReadMode() {
  const trackTabs = document.getElementById('read-track-tabs');
  const phaseTabs = document.getElementById('read-phase-tabs');
  if (!trackTabs) return;
  const tree = buildTree();

  trackTabs.innerHTML = tree.map((t, ti) =>
    `<button role="tab" aria-selected="${ti === SOP._readTrackIdx}" class="read-tab-btn${ti===SOP._readTrackIdx?' active':''}" onclick="jumpReadTrack(${ti})">${esc(t.title.replace(/^Track \d+: /,''))}</button>`
  ).join('');

  const track = tree[SOP._readTrackIdx];
  if (!track) return;
  phaseTabs.innerHTML = track.phases.map((p, pi) =>
    `<button role="tab" aria-selected="${pi === SOP._readPhaseIdx}" class="read-tab-btn read-tab-btn--phase${pi===SOP._readPhaseIdx?' active':''}" onclick="jumpReadPhase(${pi})">${esc(p.name)}</button>`
  ).join('');

  const totalPhases = tree.reduce((n, t) => n + t.phases.length, 0);
  let counter = 0;
  for (let ti = 0; ti < SOP._readTrackIdx; ti++) counter += tree[ti].phases.length;
  counter += SOP._readPhaseIdx + 1;
  const prog = document.getElementById('read-mode-progress');
  if (prog) prog.textContent = `${counter} / ${totalPhases}`;

  document.getElementById('read-mode-prev').disabled = (SOP._readTrackIdx === 0 && SOP._readPhaseIdx === 0);
  document.getElementById('read-mode-next').disabled = (SOP._readTrackIdx === tree.length - 1 && SOP._readPhaseIdx === (track.phases.length - 1));
}

function renderReadBody() {
  const body  = document.getElementById('read-mode-body');
  const tree  = buildTree();
  const track = tree[SOP._readTrackIdx];
  if (!track || !body) return;
  const phase = track.phases[SOP._readPhaseIdx];
  if (!phase) { body.innerHTML = '<p style="padding:2rem;color:var(--muted)">Keine Phase ausgewählt.</p>'; return; }

  const trackClass = track.class || 'track-pre';

  let html = `<div class="read-phase-hero read-phase-hero--${trackClass}">
    <div class="read-phase-track-label">${esc(track.title)}</div>
    <h2 class="read-phase-name">${esc(phase.name)}</h2>
    ${phase.intro ? `<p class="read-phase-intro">${esc(phase.intro)}</p>` : ''}
  </div>
  <div class="read-cards-grid">`;

  phase.cards.filter(c => c.status !== 'archived').forEach(card => {
    const hasAtt = card.attachments && card.attachments.length > 0;
    html += `<div class="read-card">
      <div class="read-card-name">${esc(card.name)}</div>
      ${card.intro ? `<p class="read-card-intro">${esc(card.intro)}</p>` : ''}
      ${card.description ? `<div class="read-card-desc">${esc(card.description)}</div>` : ''}
      ${card.tags && card.tags.length ? `<div class="card-tags">${card.tags.map(t=>`<span class="card-tag">${esc(t)}</span>`).join('')}</div>` : ''}
      ${hasAtt ? `<div class="read-card-att">${card.attachments.map(a =>
        a.type === 'link' ? `<a href="${esc(a.url)}" target="_blank" rel="noopener" class="att-link"><i class="fa-solid fa-link"></i> ${esc(a.label||a.url)}</a>` :
        a.type === 'richtext' ? `<div class="rt-preview">${a.html||''}</div>` :
        `<span class="att-file"><i class="fa-solid fa-file"></i> ${esc(a.label)}</span>`
      ).join('')}</div>` : ''}
    </div>`;
  });

  html += '</div>';
  body.innerHTML = html;
}

function jumpReadTrack(ti) {
  SOP._readTrackIdx = ti;
  SOP._readPhaseIdx = 0;
  renderReadMode();
  renderReadBody();
}
function jumpReadPhase(pi) {
  SOP._readPhaseIdx = pi;
  renderReadMode();
  renderReadBody();
}

document.getElementById('read-mode-next').onclick = () => {
  const tree  = buildTree();
  const track = tree[SOP._readTrackIdx];
  if (!track) return;
  if (SOP._readPhaseIdx < track.phases.length - 1) {
    SOP._readPhaseIdx++;
  } else if (SOP._readTrackIdx < tree.length - 1) {
    SOP._readTrackIdx++;
    SOP._readPhaseIdx = 0;
  }
  renderReadMode();
  renderReadBody();
  document.getElementById('read-mode-body').scrollTop = 0;
};
document.getElementById('read-mode-prev').onclick = () => {
  const tree = buildTree();
  if (SOP._readPhaseIdx > 0) {
    SOP._readPhaseIdx--;
  } else if (SOP._readTrackIdx > 0) {
    SOP._readTrackIdx--;
    const prevTrack = tree[SOP._readTrackIdx];
    SOP._readPhaseIdx = prevTrack ? prevTrack.phases.length - 1 : 0;
  }
  renderReadMode();
  renderReadBody();
  document.getElementById('read-mode-body').scrollTop = 0;
};

function closeFullscreen() {
  const ov = document.getElementById('fs-overlay');
  if (ov) ov.style.display = 'none';
}

// ─── SAVE REVISION ────────────────────────────────────────────
function saveRevisionToCloud() {
  const modal  = document.getElementById('save-modal');
  const input  = document.getElementById('modal-author-name');
  // Pre-fill with logged-in user's name
  const profile = window.RootsUser?.getProfile?.();
  if (profile && profile.full_name && input) input.value = profile.full_name;
  modal.style.display = 'flex';
  setTimeout(() => input?.focus(), 80);
}

async function confirmSaveRevision() {
  const authorName = document.getElementById('modal-author-name')?.value.trim();
  if (!authorName) { toast('Bitte Namen eingeben', 'warning'); return; }

  SOP.saving = true;
  const btn = document.querySelector('#save-modal .btn-save');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Speichern…'; }

  try {
    const snapshot  = buildTree();
    const authorId  = window.RootsUser?.getProfile?.()?.id || null;
    const tsLabel   = new Date().toLocaleDateString('de-DE', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });

    const { error } = await sb().from('sop_revisions').insert({
      author_name: authorName,
      author_id:   authorId,
      label:       `${authorName} · ${tsLabel}`,
      snapshot:    snapshot,
    });

    if (error) throw error;

    SOP.dirty  = false;
    SOP.saving = false;
    updateSaveBtn();
    closeModal('save-modal');
    toast('Version gespeichert ✓', 'success');
  } catch (e) {
    toast('Fehler beim Speichern: ' + e.message, 'error');
    SOP.saving = false;
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = 'Speichern'; }
  }
}

// ─── REVISION HISTORY ─────────────────────────────────────────
async function openRevisions() {
  const list = document.getElementById('revision-list');
  list.innerHTML = '<div style="text-align:center;padding:2rem"><i class="fa-solid fa-spinner fa-spin" style="color:var(--brand)"></i></div>';
  document.getElementById('revision-modal').style.display = 'flex';

  const { data, error } = await sb()
    .from('sop_revisions')
    .select('id,author_name,label,created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data || data.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:var(--muted);padding:2rem">Noch keine gespeicherten Versionen.</p>';
    return;
  }

  list.innerHTML = data.map((rev, i) => `
    <div class="revision-item">
      <div class="revision-meta">
        <span class="revision-author"><i class="fa-solid fa-user-circle"></i> ${esc(rev.author_name)}</span>
        <span class="revision-date">${fmtDate(rev.created_at)}</span>
        ${i === 0 ? '<span class="revision-badge">Aktuell</span>' : ''}
      </div>
      <div class="revision-label">${esc(rev.label || '—')}</div>
      ${i > 0 ? `<button class="btn-revision revision-restore-btn" onclick="restoreRevision('${esc(rev.id)}')">
        <i class="fa-solid fa-rotate-left"></i> Wiederherstellen
      </button>` : ''}
    </div>`).join('');
}

async function restoreRevision(revId) {
  if (!confirm('Diese Version wiederherstellen? Die aktuelle Struktur wird überschrieben.')) return;

  const { data, error } = await sb()
    .from('sop_revisions')
    .select('snapshot,author_name')
    .eq('id', revId)
    .single();

  if (error || !data) { toast('Fehler beim Laden der Version', 'error'); return; }

  const snap = data.snapshot;
  if (!Array.isArray(snap)) { toast('Ungültiges Snapshot-Format', 'error'); return; }

  closeModal('revision-modal');
  const board = document.getElementById('main-board');
  board.innerHTML = '<div style="text-align:center;padding:50px"><i class="fa-solid fa-spinner fa-spin" style="font-size:2rem;color:var(--brand)"></i><p style="margin-top:1rem;color:var(--muted)">Wiederherstellung läuft…</p></div>';

  try {
    // Delete existing data and re-insert from snapshot
    await sb().from('sop_tracks').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    for (const track of snap) {
      const { data: tData } = await sb().from('sop_tracks')
        .insert({ sort_order: track.sort_order, title: track.title, class: track.class, intro: track.intro })
        .select().single();
      for (const phase of (track.phases || [])) {
        const { data: pData } = await sb().from('sop_phases')
          .insert({ track_id: tData.id, sort_order: phase.sort_order, name: phase.name, intro: phase.intro })
          .select().single();
        for (const card of (phase.cards || [])) {
          await sb().from('sop_cards').insert({
            phase_id: pData.id, sort_order: card.sort_order, name: card.name,
            intro: card.intro, description: card.description, status: card.status || 'active',
            tags: card.tags || [], attachments: card.attachments || [],
          });
        }
      }
    }

    toast(`Version von ${esc(data.author_name)} wiederhergestellt`, 'success');
    await loadSOP();
  } catch (e) {
    toast('Fehler bei der Wiederherstellung: ' + e.message, 'error');
    await loadSOP();
  }
}

// ─── EXPORT ───────────────────────────────────────────────────
function getExportData() { return buildTree(); }

function exportJSON() {
  const blob = new Blob([JSON.stringify(getExportData(), null, 2)], { type: 'application/json' });
  _download(blob, 'ROOTS_SOP_Export.json');
  document.getElementById('export-menu').classList.remove('open');
}

function exportMarkdown() {
  const tree  = getExportData();
  let md = '# ROOTS SOP\n\n';
  tree.forEach(t => {
    md += `## ${t.title}\n\n${t.intro || ''}\n\n`;
    t.phases.forEach(p => {
      md += `### ${p.name}\n\n${p.intro || ''}\n\n`;
      p.cards.filter(c => c.status !== 'archived').forEach(c => {
        md += `#### ${c.name}\n\n${c.intro || ''}\n\n`;
        if (c.description) md += `${c.description}\n\n`;
      });
    });
  });
  const blob = new Blob([md], { type: 'text/markdown' });
  _download(blob, 'ROOTS_SOP_Export.md');
  document.getElementById('export-menu').classList.remove('open');
}

function exportPNG()  { _screenshotBoard('png');  }
function exportJPEG() { _screenshotBoard('jpeg'); }

function _screenshotBoard(fmt) {
  document.getElementById('export-menu').classList.remove('open');
  toast('Screenshot-Export benötigt html2canvas (nicht eingebunden).', 'info');
}

function exportSVG() {
  document.getElementById('export-menu').classList.remove('open');
  toast('SVG-Export in Kürze verfügbar.', 'info');
}

function exportHTMLSnapshot() {
  const board = document.getElementById('main-board');
  const blob  = new Blob([
    `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ROOTS SOP</title><style>
    body{font-family:system-ui,sans-serif;padding:2rem;background:#f4f7fb}
    .board-columns{display:flex;gap:1.5rem;overflow-x:auto}
    .track-col{min-width:280px;background:#fff;border-radius:12px;padding:1rem}
    .track-header{font-weight:700;font-size:1rem;margin-bottom:1rem;padding:.5rem;border-radius:8px;background:#eff6ff;color:#206efb}
    .phase-label{font-weight:600;font-size:.85rem;color:#475569;display:block;margin:.75rem 0 .3rem}
    .sop-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:.65rem .8rem;margin-bottom:.4rem}
    .card-title{font-weight:600;font-size:.9rem}
    .card-intro{font-size:.8rem;color:#64748b;margin-top:.25rem}
    </style></head><body>${board.innerHTML}</body></html>`
  ], { type: 'text/html' });
  _download(blob, 'ROOTS_SOP_Snapshot.html');
  document.getElementById('export-menu').classList.remove('open');
}

function exportPrint() {
  document.getElementById('export-menu').classList.remove('open');
  window.print();
}

function _download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

// ─── BOOT ─────────────────────────────────────────────────────
// Warten bis Auth-State klar ist – loadSOP wird aus _loadAndMount heraus getriggert.
// Fallback: nach 3 Sek. direkt versuchen (für eingeloggten Tab-Reload).
let _bootDone = false;
const _origLoadAndMount = window.RootsUser?._loadAndMount?.bind(window.RootsUser);
if (window.RootsUser && _origLoadAndMount) {
  window.RootsUser._loadAndMount = async function (sb) {
    await _origLoadAndMount(sb);
    if (!_bootDone) { _bootDone = true; loadSOP(); }
  };
}
setTimeout(() => {
  if (!_bootDone) { _bootDone = true; loadSOP(); }
}, 3000);
