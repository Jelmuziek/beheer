// ══════════════════════════════════════
// BEHEER.JS – Openstage beheerpanel
// ══════════════════════════════════════

const JUISTE_PIN = '051009';
const FB_URL     = 'https://openstage-597a9-default-rtdb.europe-west1.firebasedatabase.app/show.json';

const STANDAARD_SETLIST = [
    'American Idiot','Creep','Sailor Song','Lie To Me','Clair de Lune',
    'From The Start','Desperado','iloveitiloveitiloveit','505','Remedy',
    'Van Gogh','One Way Or Another',"Sweet Child O' Mine",'Nothing Else Matters',
    'Price of Smokes & Cockroaches','Feuer Frei','Always','Tequila'
];

let state = { huidig: null, afgespeeld: [], nummers: [] };

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

    // Sluit sidebar op mobiel
    document.querySelector('.sidebar').classList.remove('open');
    document.getElementById('mobOverlay').classList.remove('open');

    if (naam === 'live')       bouwLiveLijst();
    if (naam === 'setlist')    bouwSetlistEditor();
    if (naam === 'home')       updateStats();
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
        await fetch(FB_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nieuweState),
        });
        updateSidebarStatus(true);
        return true;
    } catch {
        updateSidebarStatus(false);
        return false;
    }
}

function updateSidebarStatus(ok) {
    const dot   = document.querySelector('.status-dot');
    const label = document.querySelector('.sidebar-status');
    if (!dot) return;
    dot.className = 'status-dot ' + (ok ? 'ok' : 'err');
    label.innerHTML = `<span class="status-dot ${ok ? 'ok' : 'err'}"></span> ${ok ? 'Live verbonden' : 'Geen verbinding'}`;
}

function updateVerbindingStatus() {
    const el = document.getElementById('verbindingStatus');
    if (!el) return;
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
    if (data) {
        state = data;
        // Zorg dat nummers altijd een array is
        if (!Array.isArray(state.nummers) || state.nummers.length === 0) {
            state.nummers = STANDAARD_SETLIST.map((naam, i) => ({ nr: i + 1, naam }));
            await slaOp(state);
        }
        if (!Array.isArray(state.afgespeeld)) state.afgespeeld = [];
    } else {
        // Eerste keer: maak default state
        state = {
            huidig: null,
            afgespeeld: [],
            nummers: STANDAARD_SETLIST.map((naam, i) => ({ nr: i + 1, naam }))
        };
        await slaOp(state);
    }
    updateStats();

    // Firebase SSE voor live updates
    const sse = new EventSource(FB_URL.replace('.json', '.json?accept=text/event-stream'));
    sse.addEventListener('put', e => {
        try {
            const d = JSON.parse(e.data).data;
            if (d) { state = d; if (!Array.isArray(state.afgespeeld)) state.afgespeeld = []; bouwLiveLijst(); updateStats(); }
        } catch {}
    });
}

// ══════════════════════════════════════
// STATS (HOME)
// ══════════════════════════════════════
function updateStats() {
    const totaal     = (state.nummers || []).length;
    const afgespeeld = (state.afgespeeld || []).length;
    const resterend  = totaal - afgespeeld;
    const el = (id) => document.getElementById(id);
    if (el('stat-totaal'))     el('stat-totaal').textContent     = totaal;
    if (el('stat-afgespeeld')) el('stat-afgespeeld').textContent = afgespeeld;
    if (el('stat-resterend'))  el('stat-resterend').textContent  = Math.max(0, resterend);
}

// ══════════════════════════════════════
// LIVE MODUS
// ══════════════════════════════════════
function bouwLiveLijst() {
    const lijst   = document.getElementById('liveLijst');
    const statusBar = document.getElementById('liveStatusBar');
    if (!lijst) return;

    const nummers = state.nummers || [];

    if (statusBar) {
        if (state.huidig) {
            const s = nummers.find(n => n.nr === state.huidig);
            statusBar.innerHTML = `🎵 Nu speelt: <strong>${s ? s.naam : '—'}</strong> &nbsp;·&nbsp; ${state.afgespeeld.length} afgespeeld`;
        } else {
            statusBar.innerHTML = `Geen nummer actief &nbsp;·&nbsp; ${state.afgespeeld.length} afgespeeld`;
        }
    }

    lijst.innerHTML = nummers.map(song => {
        const isActief = state.huidig === song.nr;
        const isKlaar  = state.afgespeeld.includes(song.nr);
        return `<div class="live-item ${isActief ? 'actief' : ''} ${isKlaar ? 'klaar' : ''}">
            <span class="live-nr">${song.nr}</span>
            <span class="live-naam">${song.naam}</span>
            ${isActief ? '<span class="live-badge">● LIVE</span>' : ''}
            <div class="live-actions">
                ${!isActief ? `<button class="btn-speelt" onclick="zetActief(${song.nr})">▶ Nu</button>` : ''}
                ${!isKlaar  ? `<button class="btn-klaar"  onclick="zetKlaar(${song.nr})">✓</button>` : ''}
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
    if (!confirm('Reset de show? (setlist blijft staan)')) return;
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
    const nummers = state.nummers || [];

    editor.innerHTML = nummers.map((song, i) => `
        <div class="editor-item" draggable="true" data-index="${i}"
             ondragstart="dragStart(event,${i})"
             ondragover="dragOver(event)"
             ondrop="dragDrop(event,${i})"
             ondragleave="dragLeave(event)"
             ondragend="dragEnd(event)">
            <span class="editor-drag">⠿</span>
            <span class="editor-nr">${i + 1}</span>
            <input class="editor-input" type="text" value="${song.naam}"
                   onchange="updateNaam(${i}, this.value)"
                   oninput="updateNaam(${i}, this.value)" />
            <button class="editor-del" onclick="verwijderNummer(${i})">✕</button>
        </div>
    `).join('');
}

function updateNaam(index, waarde) {
    if (state.nummers[index]) state.nummers[index].naam = waarde;
}

function voegNummerToe() {
    if (!Array.isArray(state.nummers)) state.nummers = [];
    state.nummers.push({ nr: state.nummers.length + 1, naam: 'Nieuw nummer' });
    herNummer();
    bouwSetlistEditor();
}

function verwijderNummer(index) {
    if (!confirm(`"${state.nummers[index].naam}" verwijderen?`)) return;
    state.nummers.splice(index, 1);
    herNummer();
    bouwSetlistEditor();
}

function herNummer() {
    state.nummers.forEach((n, i) => n.nr = i + 1);
}

async function slaSetlistOp() {
    herNummer();
    // Lees actuele inputwaarden voor het geval ze net getypt zijn
    document.querySelectorAll('.editor-input').forEach((input, i) => {
        if (state.nummers[i]) state.nummers[i].naam = input.value;
    });
    const ok = await slaOp(state);
    if (ok) {
        const btn = document.querySelector('.toolbar-btn-ghost');
        if (btn) { btn.textContent = '✅ Opgeslagen!'; setTimeout(() => btn.textContent = '💾 Opslaan', 2000); }
    }
}

async function resetSetlist() {
    if (!confirm('Setlist resetten naar originele 18 nummers?')) return;
    state.nummers = STANDAARD_SETLIST.map((naam, i) => ({ nr: i + 1, naam }));
    bouwSetlistEditor(); updateStats();
    await slaOp(state);
}

// ── Drag & drop ──
function dragStart(e, i) { dragSrc = i; e.currentTarget.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; }
function dragOver(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
function dragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
function dragEnd(e) { e.currentTarget.classList.remove('dragging'); document.querySelectorAll('.editor-item').forEach(el => el.classList.remove('drag-over', 'dragging')); }

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
