// ══════════════════════════════════════
// BEHEER.JS – Openstage beheerpanel
// ══════════════════════════════════════

const JUISTE_PIN = '051009';
const FB_URL     = 'https://openstage-597a9-default-rtdb.europe-west1.firebasedatabase.app/show.json';

const STANDAARD_SETLIST = [
    { naam: 'American Idiot',                  artiest: 'Green Day' },
    { naam: 'Creep',                           artiest: 'Radiohead' },
    { naam: 'Sailor Song',                     artiest: 'Gigi Perez' },
    { naam: 'Lie To Me',                       artiest: '' },
    { naam: 'Clair de Lune',                   artiest: 'Debussy' },
    { naam: 'From The Start',                  artiest: 'Laufey' },
    { naam: 'Desperado',                       artiest: 'Eagles' },
    { naam: 'iloveitiloveitiloveit',           artiest: '' },
    { naam: '505',                             artiest: 'Arctic Monkeys' },
    { naam: 'Remedy',                          artiest: 'Adele' },
    { naam: 'Van Gogh',                        artiest: '' },
    { naam: 'One Way Or Another',              artiest: 'Blondie' },
    { naam: "Sweet Child O' Mine",             artiest: 'Guns N\' Roses' },
    { naam: 'Nothing Else Matters',            artiest: 'Metallica' },
    { naam: 'Price of Smokes & Cockroaches',   artiest: '' },
    { naam: 'Feuer Frei',                      artiest: 'Rammstein' },
    { naam: 'Always',                          artiest: 'Bon Jovi' },
    { naam: 'Tequila',                         artiest: 'The Champs' },
].map((s, i) => ({ nr: i + 1, ...s }));

let state = { huidig: null, afgespeeld: [], nummers: [] };
let sseVerbinding = null;

// ══════════════════════════════════════
// PINCODE
// ══════════════════════════════════════
let pinBuffer = '';

function pinInvoer(k) {
    if (k === 'wis') { pinBuffer = pinBuffer.slice(0, -1); }
    else if (k === 'ok') { controleerPin(); return; }
    else { if (pinBuffer.length >= 6) return; pinBuffer += k; }
    updateDots();
    if (pinBuffer.length === 6) setTimeout(controleerPin, 100);
}

function updateDots() {
    for (let i = 0; i < 6; i++)
        document.getElementById('d' + i).classList.toggle('gevuld', i < pinBuffer.length);
}

function controleerPin() {
    if (pinBuffer === JUISTE_PIN) {
        document.getElementById('pinOverlay').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        init();
    } else {
        pinBuffer = '';
        updateDots();
        const fout = document.getElementById('pinFout');
        fout.classList.add('zichtbaar');
        setTimeout(() => fout.classList.remove('zichtbaar'), 1600);
    }
}

// ══════════════════════════════════════
// NAVIGATIE
// ══════════════════════════════════════
function toonPagina(naam) {
    document.querySelectorAll('.pagina').forEach(p => p.classList.remove('actief'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('pagina-' + naam).classList.add('actief');
    document.getElementById('btn-' + naam).classList.add('active');
    document.querySelector('.sidebar').classList.remove('open');
    document.getElementById('mobOverlay').classList.remove('open');

    if (naam === 'live')        bouwLiveLijst();
    if (naam === 'setlist')     bouwSetlistEditor();
    if (naam === 'home')        updateStats();
    if (naam === 'instellingen') updateVerbindingStatus();
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('open');
    document.getElementById('mobOverlay').classList.toggle('open');
}

// ══════════════════════════════════════
// FIREBASE
// ══════════════════════════════════════
async function haalOp() {
    try {
        const r = await fetch(FB_URL);
        if (!r.ok) throw new Error();
        const data = await r.json();
        updateSidebarStatus(true);
        return data;
    } catch {
        updateSidebarStatus(false);
        return null;
    }
}

async function slaOp(nieuweState) {
    try {
        const r = await fetch(FB_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nieuweState),
        });
        updateSidebarStatus(r.ok);
        return r.ok;
    } catch {
        updateSidebarStatus(false);
        return false;
    }
}

function updateSidebarStatus(ok) {
    const label = document.querySelector('.sidebar-status');
    if (!label) return;
    label.innerHTML = `<span class="status-dot ${ok ? 'ok' : 'err'}"></span> ${ok ? 'Live verbonden' : 'Geen verbinding'}`;
}

function updateVerbindingStatus() {
    const el = document.getElementById('verbindingStatus');
    if (!el) return;
    el.className = 'verbinding-status wacht';
    el.textContent = '⏳ Controleren...';
    haalOp().then(data => {
        const ok = data !== null;
        el.className = 'verbinding-status ' + (ok ? 'ok' : 'err');
        el.textContent = ok ? '🟢 Verbonden met Firebase' : '🔴 Geen verbinding';
    });
}

// ══════════════════════════════════════
// INITIALISATIE
// ══════════════════════════════════════
async function init() {
    const data = await haalOp();

    if (data && Array.isArray(data.nummers) && data.nummers.length > 0) {
        state = data;
    } else {
        state = { huidig: null, afgespeeld: [], nummers: STANDAARD_SETLIST };
        await slaOp(state);
    }
    if (!Array.isArray(state.afgespeeld)) state.afgespeeld = [];

    updateStats();

    // SSE live updates
    try {
        sseVerbinding = new EventSource(FB_URL.replace('.json', '.json?accept=text/event-stream'));
        sseVerbinding.addEventListener('put', e => {
            try {
                const d = JSON.parse(e.data).data;
                if (d && Array.isArray(d.nummers)) {
                    state = d;
                    if (!Array.isArray(state.afgespeeld)) state.afgespeeld = [];
                    // Herlaad actieve pagina
                    const actief = document.querySelector('.pagina.actief');
                    if (actief?.id === 'pagina-live')    bouwLiveLijst();
                    if (actief?.id === 'pagina-home')    updateStats();
                }
            } catch {}
        });
    } catch {}
}

// ══════════════════════════════════════
// HOME STATS
// ══════════════════════════════════════
function updateStats() {
    const totaal     = (state.nummers || []).length;
    const afgespeeld = (state.afgespeeld || []).length;
    const resterend  = Math.max(0, totaal - afgespeeld);
    const el = id => document.getElementById(id);
    if (el('stat-totaal'))      el('stat-totaal').textContent     = totaal;
    if (el('stat-afgespeeld'))  el('stat-afgespeeld').textContent = afgespeeld;
    if (el('stat-resterend'))   el('stat-resterend').textContent  = resterend;

    // Voortgangsbalk
    const balk = document.getElementById('voortgangsBalk');
    if (balk && totaal > 0) balk.style.width = Math.round((afgespeeld / totaal) * 100) + '%';

    // Huidig spelend op home
    const huidigEl = document.getElementById('home-nu-speelt');
    if (huidigEl) {
        if (state.huidig && (state.nummers || [])[state.huidig - 1]) {
            huidigEl.textContent = '🎵 Nu speelt: ' + state.nummers[state.huidig - 1].naam;
            huidigEl.style.display = 'block';
        } else {
            huidigEl.style.display = 'none';
        }
    }
}

// ══════════════════════════════════════
// LIVE MODUS
// ══════════════════════════════════════
function bouwLiveLijst() {
    const lijst     = document.getElementById('liveLijst');
    const statusBar = document.getElementById('liveStatusBar');
    if (!lijst) return;

    const nummers = state.nummers || [];
    const pct     = nummers.length > 0 ? Math.round((state.afgespeeld.length / nummers.length) * 100) : 0;

    if (statusBar) {
        if (state.huidig && nummers[state.huidig - 1]) {
            statusBar.innerHTML = `🎵 Nu speelt: <strong>${nummers[state.huidig - 1].naam}</strong> &nbsp;·&nbsp; ${state.afgespeeld.length}/${nummers.length} afgespeeld (${pct}%)`;
        } else {
            statusBar.innerHTML = `Geen nummer actief &nbsp;·&nbsp; ${state.afgespeeld.length}/${nummers.length} afgespeeld (${pct}%)`;
        }
    }

    lijst.innerHTML = nummers.map((song, i) => {
        const nr       = i + 1;
        const isActief = state.huidig === nr;
        const isKlaar  = state.afgespeeld.includes(nr);
        return `<div class="live-item ${isActief ? 'actief' : ''} ${isKlaar ? 'klaar' : ''}">
            <span class="live-nr">${nr}</span>
            <div class="live-info">
                <span class="live-naam">${song.naam}</span>
                ${song.artiest ? `<span class="live-artiest">${song.artiest}</span>` : ''}
            </div>
            ${isActief ? '<span class="live-badge">● LIVE</span>' : ''}
            <div class="live-actions">
                ${!isActief ? `<button class="btn-speelt" onclick="zetActief(${nr})">▶ Nu</button>` : ''}
                ${!isKlaar  ? `<button class="btn-klaar"  onclick="zetKlaar(${nr})">✓</button>`   : '<span class="klaar-badge">✓ Klaar</span>'}
            </div>
        </div>`;
    }).join('');
}

async function zetActief(nr) {
    if (!Array.isArray(state.afgespeeld)) state.afgespeeld = [];
    if (state.huidig && !state.afgespeeld.includes(state.huidig))
        state.afgespeeld.push(state.huidig);
    state.huidig = nr;
    bouwLiveLijst(); updateStats();
    await slaOp(state);
}

async function zetKlaar(nr) {
    if (!Array.isArray(state.afgespeeld)) state.afgespeeld = [];
    if (state.huidig === nr) state.huidig = null;
    if (!state.afgespeeld.includes(nr)) state.afgespeeld.push(nr);
    bouwLiveLijst(); updateStats();
    await slaOp(state);
}

async function resetShow() {
    if (!confirm('Reset de show? Alle afgespeeld-markeringen worden gewist. De setlist blijft staan.')) return;
    state.huidig     = null;
    state.afgespeeld = [];
    bouwLiveLijst(); updateStats();
    await slaOp(state);
}

// ══════════════════════════════════════
// SETLIST EDITOR
// ══════════════════════════════════════
let dragSrc = null;

function bouwSetlistEditor() {
    const editor = document.getElementById('setlistEditor');
    if (!editor) return;

    editor.innerHTML = (state.nummers || []).map((song, i) => `
        <div class="editor-item" draggable="true" data-index="${i}"
             ondragstart="dragStart(event,${i})"
             ondragover="dragOver(event)"
             ondrop="dragDrop(event,${i})"
             ondragleave="dragLeave(event)"
             ondragend="dragEnd(event)">
            <span class="editor-drag">⠿</span>
            <span class="editor-nr">${i + 1}</span>
            <div class="editor-velden">
                <input class="editor-input" type="text"
                       placeholder="Naam nummer"
                       value="${song.naam || ''}"
                       data-field="naam" data-index="${i}" />
                <input class="editor-input editor-artiest" type="text"
                       placeholder="Artiest (optioneel)"
                       value="${song.artiest || ''}"
                       data-field="artiest" data-index="${i}" />
            </div>
            <button class="editor-del" onclick="verwijderNummer(${i})" title="Verwijderen">✕</button>
        </div>
    `).join('');

    // Live input bijhouden
    editor.querySelectorAll('.editor-input').forEach(input => {
        input.addEventListener('input', () => {
            const i     = parseInt(input.dataset.index);
            const field = input.dataset.field;
            if (state.nummers[i]) state.nummers[i][field] = input.value;
        });
    });
}

function voegNummerToe() {
    if (!Array.isArray(state.nummers)) state.nummers = [];
    state.nummers.push({ nr: state.nummers.length + 1, naam: '', artiest: '' });
    herNummer();
    bouwSetlistEditor();
    // Focus op het nieuwe veld
    setTimeout(() => {
        const inputs = document.querySelectorAll('.editor-input');
        if (inputs.length) inputs[inputs.length - 2].focus();
    }, 50);
}

function verwijderNummer(index) {
    const naam = state.nummers[index]?.naam || 'dit nummer';
    if (!confirm(`"${naam}" verwijderen?`)) return;
    state.nummers.splice(index, 1);
    herNummer();
    bouwSetlistEditor();
}

function herNummer() {
    (state.nummers || []).forEach((n, i) => n.nr = i + 1);
}

async function slaSetlistOp() {
    herNummer();
    // Lees actuele inputwaarden
    document.querySelectorAll('.editor-input').forEach(input => {
        const i     = parseInt(input.dataset.index);
        const field = input.dataset.field;
        if (state.nummers[i]) state.nummers[i][field] = input.value;
    });

    const btn = document.querySelector('.toolbar-btn-ghost');
    if (btn) { btn.textContent = '⏳ Opslaan...'; btn.disabled = true; }

    const ok = await slaOp(state);

    if (btn) {
        btn.textContent = ok ? '✅ Opgeslagen!' : '❌ Fout!';
        btn.disabled = false;
        setTimeout(() => btn.textContent = '💾 Opslaan', 2200);
    }
}

// ── Drag & drop ──
function dragStart(e, i) {
    dragSrc = i;
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}
function dragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}
function dragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
function dragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.editor-item').forEach(el => el.classList.remove('drag-over', 'dragging'));
}
function dragDrop(e, targetI) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    if (dragSrc === null || dragSrc === targetI) return;
    const moved = state.nummers.splice(dragSrc, 1)[0];
    state.nummers.splice(targetI, 0, moved);
    herNummer();
    bouwSetlistEditor();
    dragSrc = null;
}
