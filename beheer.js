// ══════════════════════════════════════
// BEHEER.JS – Openstage beheerpanel
// ══════════════════════════════════════

const JUISTE_PIN = '051009';
const FB_URL     = 'https://openstage-597a9-default-rtdb.europe-west1.firebasedatabase.app/show.json';
const MAX_SLOTS  = 30;

const STANDAARD_SETLIST = [
    { naam: 'American Idiot',                artiest: 'Green Day',       gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'Creep',                         artiest: 'Radiohead',       gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'Sailor Song',                   artiest: 'Gigi Perez',      gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'Lie To Me',                     artiest: '',                gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'Clair de Lune',                 artiest: 'Debussy',         gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'From The Start',                artiest: 'Laufey',          gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'Desperado',                     artiest: 'Eagles',          gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'iloveitiloveitiloveit',         artiest: '',                gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: '505',                           artiest: 'Arctic Monkeys',  gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'Remedy',                        artiest: 'Adele',           gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'Van Gogh',                      artiest: '',                gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'One Way Or Another',            artiest: 'Blondie',         gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: "Sweet Child O' Mine",           artiest: "Guns N' Roses",   gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'Nothing Else Matters',          artiest: 'Metallica',       gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'Price of Smokes & Cockroaches', artiest: '',                gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'Feuer Frei',                    artiest: 'Rammstein',       gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'Always',                        artiest: 'Bon Jovi',        gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'Tequila',                       artiest: 'The Champs',      gespeeldDoor: '', beschrijving: '', youtube: '' },
].map((s, i) => ({ slot: i + 1, nr: i + 1, ...s }));

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
        updateSidebarStatus(true);
        return await r.json();
    } catch { updateSidebarStatus(false); return null; }
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
    } catch { updateSidebarStatus(false); return false; }
}

function updateSidebarStatus(ok) {
    const el = document.querySelector('.sidebar-status');
    if (el) el.innerHTML = `<span class="status-dot ${ok?'ok':'err'}"></span> ${ok?'Live verbonden':'Geen verbinding'}`;
}

function updateVerbindingStatus() {
    const el = document.getElementById('verbindingStatus');
    if (!el) return;
    el.className = 'verbinding-status wacht';
    el.textContent = '⏳ Controleren...';
    haalOp().then(data => {
        el.className = 'verbinding-status ' + (data?'ok':'err');
        el.textContent = data ? '🟢 Verbonden met Firebase' : '🔴 Geen verbinding';
    });
}

// ══════════════════════════════════════
// INIT
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

    // SSE
    try {
        const sse = new EventSource(FB_URL.replace('.json', '.json?accept=text/event-stream'));
        sse.addEventListener('put', e => {
            try {
                const d = JSON.parse(e.data).data;
                if (d?.nummers) { state = d; if (!Array.isArray(state.afgespeeld)) state.afgespeeld = []; }
                const actief = document.querySelector('.pagina.actief')?.id;
                if (actief === 'pagina-live') bouwLiveLijst();
                if (actief === 'pagina-home') updateStats();
            } catch {}
        });
    } catch {}
}

// ══════════════════════════════════════
// HOME STATS
// ══════════════════════════════════════
function updateStats() {
    const totaal     = (state.nummers||[]).length;
    const afgespeeld = (state.afgespeeld||[]).length;
    const resterend  = Math.max(0, totaal - afgespeeld);
    const el = id => document.getElementById(id);
    if (el('stat-totaal'))     el('stat-totaal').textContent     = totaal;
    if (el('stat-afgespeeld')) el('stat-afgespeeld').textContent = afgespeeld;
    if (el('stat-resterend'))  el('stat-resterend').textContent  = resterend;

    const balk = el('voortgangsBalk');
    if (balk && totaal > 0) balk.style.width = Math.round((afgespeeld/totaal)*100) + '%';

    const huidigEl = el('home-nu-speelt');
    if (huidigEl) {
        const song = state.huidig ? (state.nummers||[])[state.huidig-1] : null;
        huidigEl.textContent = song ? `🎵 Nu speelt: ${song.naam}` : '';
        huidigEl.style.display = song ? 'flex' : 'none';
    }
}

// ══════════════════════════════════════
// LIVE MODUS
// ══════════════════════════════════════
function bouwLiveLijst() {
    const lijst = document.getElementById('liveLijst');
    const bar   = document.getElementById('liveStatusBar');
    if (!lijst) return;
    const nummers = state.nummers || [];
    const pct = nummers.length > 0 ? Math.round((state.afgespeeld.length/nummers.length)*100) : 0;

    if (bar) {
        const song = state.huidig ? nummers[state.huidig-1] : null;
        bar.innerHTML = song
            ? `🎵 Nu speelt: <strong>${song.naam}</strong> &nbsp;·&nbsp; ${state.afgespeeld.length}/${nummers.length} (${pct}%)`
            : `Geen nummer actief &nbsp;·&nbsp; ${state.afgespeeld.length}/${nummers.length} afgespeeld (${pct}%)`;
    }

    lijst.innerHTML = nummers.map((song, i) => {
        const nr       = i + 1;
        const isActief = state.huidig === nr;
        const isKlaar  = state.afgespeeld.includes(nr);
        return `<div class="live-item ${isActief?'actief':''} ${isKlaar?'klaar':''}">
            <span class="live-nr">${nr}</span>
            <div class="live-info">
                <span class="live-naam">${song.naam}</span>
                ${song.artiest?`<span class="live-artiest">${song.artiest}</span>`:''}
            </div>
            ${isActief ? '<span class="live-badge">● LIVE</span>' : ''}
            <div class="live-actions">
                ${!isActief ? `<button class="btn-speelt" onclick="zetActief(${nr})">▶ Nu</button>` : ''}
                ${!isKlaar  ? `<button class="btn-klaar"  onclick="zetKlaar(${nr})">✓</button>` : '<span class="klaar-badge">✓</span>'}
            </div>
        </div>`;
    }).join('');
}

async function zetActief(nr) {
    if (!Array.isArray(state.afgespeeld)) state.afgespeeld = [];
    if (state.huidig && !state.afgespeeld.includes(state.huidig)) state.afgespeeld.push(state.huidig);
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
    if (!confirm('Reset de show? Afgespeeld-markeringen worden gewist. Setlist blijft staan.')) return;
    state.huidig = null; state.afgespeeld = [];
    bouwLiveLijst(); updateStats();
    await slaOp(state);
}

// ══════════════════════════════════════
// SETLIST EDITOR
// ══════════════════════════════════════
let dragSrc = null;
let bewerkIndex = null;  // welke song is open in het bewerkpaneel

function bouwSetlistEditor() {
    const editor = document.getElementById('setlistEditor');
    if (!editor) return;
    const nummers = state.nummers || [];
    const aantalSlots = MAX_SLOTS;

    editor.innerHTML = nummers.map((song, i) => `
        <div class="editor-item" draggable="true" data-index="${i}"
             ondragstart="dragStart(event,${i})" ondragover="dragOver(event)"
             ondrop="dragDrop(event,${i})" ondragleave="dragLeave(event)" ondragend="dragEnd(event)">
            <span class="editor-drag">⠿</span>
            <span class="editor-nr">${i+1}</span>
            <div class="editor-velden">
                <input class="editor-input" type="text" placeholder="Naam nummer"
                       value="${song.naam||''}" data-field="naam" data-index="${i}"
                       oninput="updateVeld(${i},'naam',this.value)" />
                <input class="editor-input editor-artiest" type="text" placeholder="Artiest (optioneel)"
                       value="${song.artiest||''}" data-field="artiest" data-index="${i}"
                       oninput="updateVeld(${i},'artiest',this.value)" />
            </div>
            <button class="editor-edit-btn" onclick="openBewerk(${i})" title="Meer info bewerken">✏️</button>
            <button class="editor-del" onclick="verwijderNummer(${i})" title="Verwijderen">✕</button>
        </div>
    `).join('') + (nummers.length < aantalSlots ? `
        <div class="editor-add-slot" onclick="voegNummerToe()">
            ＋ Nummer toevoegen (${nummers.length}/${aantalSlots})
        </div>` : `<p class="slots-vol">Maximum van ${aantalSlots} nummers bereikt</p>`);
}

function updateVeld(index, veld, waarde) {
    if (state.nummers[index]) state.nummers[index][veld] = waarde;
}

// Bewerkpaneel per nummer (naam, artiest, gespeeld door, beschrijving, youtube)
function openBewerk(index) {
    bewerkIndex = index;
    const song = state.nummers[index];
    const panel = document.getElementById('bewerkPanel');
    const overlay = document.getElementById('bewerkOverlay');

    document.getElementById('bp-naam').value         = song.naam         || '';
    document.getElementById('bp-artiest').value      = song.artiest      || '';
    document.getElementById('bp-gespeeld').value     = song.gespeeldDoor || '';
    document.getElementById('bp-beschrijving').value = song.beschrijving || '';
    document.getElementById('bp-youtube').value      = song.youtube      || '';
    document.getElementById('bp-titel').textContent  = `Nummer ${index+1} bewerken`;

    panel.classList.add('open');
    overlay.classList.add('open');
}

function sluitBewerk() {
    document.getElementById('bewerkPanel').classList.remove('open');
    document.getElementById('bewerkOverlay').classList.remove('open');
    bewerkIndex = null;
}

async function slaBewerk op() {}  // zie hieronder
window.slaBewerk = async function() {
    if (bewerkIndex === null) return;
    state.nummers[bewerkIndex] = {
        ...state.nummers[bewerkIndex],
        naam:         document.getElementById('bp-naam').value.trim(),
        artiest:      document.getElementById('bp-artiest').value.trim(),
        gespeeldDoor: document.getElementById('bp-gespeeld').value.trim(),
        beschrijving: document.getElementById('bp-beschrijving').value.trim(),
        youtube:      document.getElementById('bp-youtube').value.trim(),
    };
    herNummer();
    sluitBewerk();
    bouwSetlistEditor();
    const ok = await slaOp(state);
    const btn = document.getElementById('bp-save-btn');
    if (btn) { btn.textContent = ok ? '✅ Opgeslagen!' : '❌ Fout'; setTimeout(()=>btn.textContent='💾 Opslaan & sluiten',2000); }
};

function voegNummerToe() {
    if ((state.nummers||[]).length >= MAX_SLOTS) return;
    state.nummers.push({ naam: '', artiest: '', gespeeldDoor: '', beschrijving: '', youtube: '' });
    herNummer();
    bouwSetlistEditor();
    // Open meteen het bewerkpaneel voor het nieuwe nummer
    setTimeout(() => openBewerk(state.nummers.length - 1), 50);
}

function verwijderNummer(index) {
    const naam = state.nummers[index]?.naam || 'dit nummer';
    if (!confirm(`"${naam || 'leeg nummer'}" verwijderen?`)) return;
    state.nummers.splice(index, 1);
    herNummer();
    bouwSetlistEditor();
}

function herNummer() {
    (state.nummers||[]).forEach((n, i) => { n.nr = i+1; n.slot = i+1; });
}

async function slaSetlistOp() {
    herNummer();
    const btn = document.querySelector('.toolbar-btn-ghost');
    if (btn) { btn.textContent = '⏳ Opslaan...'; btn.disabled = true; }
    const ok = await slaOp(state);
    if (btn) {
        btn.textContent = ok ? '✅ Opgeslagen!' : '❌ Fout!';
        btn.disabled = false;
        setTimeout(() => btn.textContent = '💾 Opslaan', 2200);
    }
}

// Drag & drop
function dragStart(e, i) { dragSrc = i; e.currentTarget.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; }
function dragOver(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
function dragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
function dragEnd(e) { e.currentTarget.classList.remove('dragging'); document.querySelectorAll('.editor-item').forEach(el=>el.classList.remove('drag-over','dragging')); }
function dragDrop(e, targetI) {
    e.preventDefault(); e.currentTarget.classList.remove('drag-over');
    if (dragSrc===null||dragSrc===targetI) return;
    const moved = state.nummers.splice(dragSrc,1)[0];
    state.nummers.splice(targetI,0,moved);
    herNummer(); bouwSetlistEditor(); dragSrc=null;
}
