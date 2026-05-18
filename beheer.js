// ══════════════════════════════════════
// BEHEER.JS – Openstage beheerpanel v4
// ══════════════════════════════════════

const JUISTE_PIN = '051009';
const FB_URL     = 'https://openstage-597a9-default-rtdb.europe-west1.firebasedatabase.app/show.json';
const MAX_SLOTS  = 30;

const STANDAARD_SETLIST = [
    { naam: 'American Idiot',                artiest: 'Green Day',      gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'Creep',                         artiest: 'Radiohead',      gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'Sailor Song',                   artiest: 'Gigi Perez',     gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'Lie To Me',                     artiest: '',               gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'Clair de Lune',                 artiest: 'Debussy',        gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'From The Start',                artiest: 'Laufey',         gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'Desperado',                     artiest: 'Eagles',         gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'iloveitiloveitiloveit',         artiest: '',               gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: '505',                           artiest: 'Arctic Monkeys', gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'Remedy',                        artiest: 'Adele',          gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'Van Gogh',                      artiest: '',               gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'One Way Or Another',            artiest: 'Blondie',        gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: "Sweet Child O' Mine",           artiest: "Guns N' Roses",  gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'Nothing Else Matters',          artiest: 'Metallica',      gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'Price of Smokes & Cockroaches', artiest: '',               gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'Feuer Frei',                    artiest: 'Rammstein',      gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'Always',                        artiest: 'Bon Jovi',       gespeeldDoor: '', beschrijving: '', youtube: '' },
    { naam: 'Tequila',                       artiest: 'The Champs',     gespeeldDoor: '', beschrijving: '', youtube: '' },
].map((s, i) => ({ slot: i+1, nr: i+1, ...s }));

let state = { huidig: null, afgespeeld: [], nummers: [], evenementDatum: '2026-12-12T19:00:00', evenementNaam: 'JEL Openstage 2e editie' };

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
        document.getElementById('d'+i).classList.toggle('gevuld', i < pinBuffer.length);
}

function controleerPin() {
    if (pinBuffer === JUISTE_PIN) {
        document.getElementById('pinOverlay').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        init();
    } else {
        pinBuffer = ''; updateDots();
        const f = document.getElementById('pinFout');
        f.classList.add('zichtbaar');
        setTimeout(() => f.classList.remove('zichtbaar'), 1600);
    }
}

// ══════════════════════════════════════
// NAVIGATIE
// ══════════════════════════════════════
function toonPagina(naam) {
    document.querySelectorAll('.pagina').forEach(p => p.classList.remove('actief'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('pagina-'+naam).classList.add('actief');
    document.getElementById('btn-'+naam).classList.add('active');
    document.querySelector('.sidebar').classList.remove('open');
    document.getElementById('mobOverlay').classList.remove('open');

    if (naam === 'live')        bouwLiveLijst();
    if (naam === 'volgorde')    bouwVolgordeEditor();
    if (naam === 'songinfo')    bouwSongInfoEditor();
    if (naam === 'datum')       laadDatumPagina();
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
        el.className = 'verbinding-status '+(data?'ok':'err');
        el.textContent = data ? '🟢 Verbonden met Firebase' : '🔴 Geen verbinding';
    });
}

// ══════════════════════════════════════
// INIT
// ══════════════════════════════════════
async function init() {
    const data = await haalOp();
    if (data && Array.isArray(data.nummers) && data.nummers.length > 0) {
        state = { ...state, ...data };
    } else {
        state.nummers = STANDAARD_SETLIST;
        await slaOp(state);
    }
    if (!Array.isArray(state.afgespeeld)) state.afgespeeld = [];
    if (!state.evenementDatum) state.evenementDatum = '2026-12-12T19:00:00';
    if (!state.evenementNaam)  state.evenementNaam  = 'JEL Openstage 2e editie';
    updateStats();

    try {
        const sse = new EventSource(FB_URL.replace('.json','.json?accept=text/event-stream'));
        sse.addEventListener('put', e => {
            try {
                const d = JSON.parse(e.data).data;
                if (d?.nummers) { state = { ...state, ...d }; if (!Array.isArray(state.afgespeeld)) state.afgespeeld = []; }
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
    if (balk && totaal > 0) balk.style.width = Math.round((afgespeeld/totaal)*100)+'%';

    const huidigEl = el('home-nu-speelt');
    if (huidigEl) {
        const song = state.huidig ? (state.nummers||[])[state.huidig-1] : null;
        huidigEl.textContent = song ? `🎵 Nu speelt: ${song.naam}` : '';
        huidigEl.style.display = song ? 'flex' : 'none';
    }

    // Countdown op home
    if (state.evenementDatum) startHomeCountdown(state.evenementDatum);
}

// Kleine countdown op homepagina
let countdownInterval = null;
function startHomeCountdown(iso) {
    const el = document.getElementById('home-countdown');
    if (!el) return;
    if (countdownInterval) clearInterval(countdownInterval);

    function tick() {
        const diff = new Date(iso) - new Date();
        if (diff <= 0) { el.textContent = '🎉 Het is zover!'; return; }
        const d = Math.floor(diff/86400000);
        const u = Math.floor((diff%86400000)/3600000);
        const m = Math.floor((diff%3600000)/60000);
        const s = Math.floor((diff%60000)/1000);
        el.textContent = `${d}d ${String(u).padStart(2,'0')}u ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
    }
    tick();
    countdownInterval = setInterval(tick, 1000);
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
        const nr       = i+1;
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
// VOLGORDE EDITOR (alleen slepen)
// ══════════════════════════════════════
let dragSrc = null;

function bouwVolgordeEditor() {
    const editor = document.getElementById('volgordeEditor');
    if (!editor) return;
    const nummers = state.nummers || [];

    editor.innerHTML = nummers.map((song, i) => `
        <div class="volgorde-item" draggable="true" data-index="${i}"
             ondragstart="dragStart(event,${i})" ondragover="dragOver(event)"
             ondrop="dragDrop(event,${i},'volgorde')" ondragleave="dragLeave(event)" ondragend="dragEnd(event)">
            <span class="editor-drag">⠿</span>
            <span class="volgorde-nr">${i+1}</span>
            <div class="volgorde-info">
                <span class="volgorde-naam">${song.naam || '<em style="color:#ccc">Leeg</em>'}</span>
                ${song.artiest ? `<span class="volgorde-artiest">${song.artiest}</span>` : ''}
            </div>
            <div class="volgorde-acties">
                ${i > 0 ? `<button class="pijl-btn" onclick="verplaats(${i},-1)" title="Omhoog">↑</button>` : '<span class="pijl-btn pijl-leeg"></span>'}
                ${i < nummers.length-1 ? `<button class="pijl-btn" onclick="verplaats(${i},1)" title="Omlaag">↓</button>` : '<span class="pijl-btn pijl-leeg"></span>'}
            </div>
        </div>
    `).join('');
}

function verplaats(index, richting) {
    const doel = index + richting;
    if (doel < 0 || doel >= state.nummers.length) return;
    [state.nummers[index], state.nummers[doel]] = [state.nummers[doel], state.nummers[index]];
    herNummer();
    bouwVolgordeEditor();
}

async function slaVolgordeOp() {
    herNummer();
    const btn = document.getElementById('volgorde-opslaan-btn');
    if (btn) { btn.textContent = '⏳ Opslaan...'; btn.disabled = true; }
    const ok = await slaOp(state);
    if (btn) {
        btn.textContent = ok ? '✅ Opgeslagen!' : '❌ Fout!';
        btn.disabled = false;
        setTimeout(() => btn.textContent = '💾 Volgorde opslaan', 2200);
    }
}

// ══════════════════════════════════════
// SONG INFO EDITOR (✏️ per nummer)
// ══════════════════════════════════════
let bewerkIndex = null;

function bouwSongInfoEditor() {
    const editor = document.getElementById('songInfoEditor');
    if (!editor) return;
    const nummers = state.nummers || [];

    editor.innerHTML = nummers.map((song, i) => `
        <div class="info-item">
            <span class="info-nr">${i+1}</span>
            <div class="info-naam-blok">
                <span class="info-naam">${song.naam || '<em style="color:#ccc">Leeg</em>'}</span>
                ${song.artiest ? `<span class="info-artiest">${song.artiest}</span>` : ''}
            </div>
            <div class="info-badges">
                ${song.gespeeldDoor ? '<span class="info-badge">👥</span>' : ''}
                ${song.beschrijving ? '<span class="info-badge">📝</span>' : ''}
                ${song.youtube ? '<span class="info-badge">▶️</span>' : ''}
            </div>
            <button class="editor-edit-btn" onclick="openBewerk(${i})">✏️ Bewerken</button>
        </div>
    `).join('') + (nummers.length < MAX_SLOTS ? `
        <div class="editor-add-slot" onclick="voegNummerToe()">＋ Nummer toevoegen (${nummers.length}/${MAX_SLOTS})</div>
    ` : `<p class="slots-vol">Maximum van ${MAX_SLOTS} nummers bereikt</p>`);
}

function openBewerk(index) {
    bewerkIndex = index;
    const song = state.nummers[index];
    document.getElementById('bp-naam').value         = song.naam         || '';
    document.getElementById('bp-artiest').value      = song.artiest      || '';
    document.getElementById('bp-gespeeld').value     = song.gespeeldDoor || '';
    document.getElementById('bp-beschrijving').value = song.beschrijving || '';
    document.getElementById('bp-youtube').value      = song.youtube      || '';
    document.getElementById('bp-titel').textContent  = `Nummer ${index+1}: ${song.naam || 'Leeg'}`;
    document.getElementById('bewerkPanel').classList.add('open');
    document.getElementById('bewerkOverlay').classList.add('open');
}

function sluitBewerk() {
    document.getElementById('bewerkPanel').classList.remove('open');
    document.getElementById('bewerkOverlay').classList.remove('open');
    bewerkIndex = null;
}

window.slaBewerk = async function() {
    if (bewerkIndex === null) return;
    const btn = document.getElementById('bp-save-btn');
    if (btn) { btn.textContent = '⏳ Opslaan...'; btn.disabled = true; }

    state.nummers[bewerkIndex] = {
        ...state.nummers[bewerkIndex],
        naam:         document.getElementById('bp-naam').value.trim(),
        artiest:      document.getElementById('bp-artiest').value.trim(),
        gespeeldDoor: document.getElementById('bp-gespeeld').value.trim(),
        beschrijving: document.getElementById('bp-beschrijving').value.trim(),
        youtube:      document.getElementById('bp-youtube').value.trim(),
    };
    herNummer();
    const ok = await slaOp(state);

    if (btn) {
        btn.textContent = ok ? '✅ Opgeslagen!' : '❌ Fout';
        btn.disabled = false;
        setTimeout(() => { btn.textContent = '💾 Opslaan & sluiten'; }, 1800);
    }

    if (ok) { setTimeout(() => { sluitBewerk(); bouwSongInfoEditor(); }, 1600); }
};

function voegNummerToe() {
    if ((state.nummers||[]).length >= MAX_SLOTS) return;
    state.nummers.push({ naam: '', artiest: '', gespeeldDoor: '', beschrijving: '', youtube: '' });
    herNummer();
    bouwSongInfoEditor();
    setTimeout(() => openBewerk(state.nummers.length-1), 60);
}

function verwijderNummer(index) {
    const naam = state.nummers[index]?.naam || 'leeg nummer';
    if (!confirm(`"${naam}" verwijderen?`)) return;
    state.nummers.splice(index, 1);
    herNummer();
    sluitBewerk();
    bouwSongInfoEditor();
    slaOp(state);
}

function herNummer() {
    (state.nummers||[]).forEach((n,i) => { n.nr = i+1; n.slot = i+1; });
}

// ══════════════════════════════════════
// DATUM & EVENEMENT
// ══════════════════════════════════════
function laadDatumPagina() {
    const naamEl = document.getElementById('datum-evenement-naam');
    const datumEl = document.getElementById('datum-input');
    if (naamEl)  naamEl.value  = state.evenementNaam  || '';
    if (datumEl) datumEl.value = state.evenementDatum ? state.evenementDatum.slice(0,16) : '';
    updateDatumPreview();
}

function updateDatumPreview() {
    const val  = document.getElementById('datum-input')?.value;
    const naam = document.getElementById('datum-evenement-naam')?.value;
    const prev = document.getElementById('datum-preview');
    if (!prev || !val) return;
    const d = new Date(val);
    const opties = { weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' };
    prev.innerHTML = `
        <div class="datum-preview-naam">${naam || 'Evenement'}</div>
        <div class="datum-preview-datum">${d.toLocaleDateString('nl-NL', opties)}</div>
        <div class="datum-preview-sub">Dit is wat het publiek ziet op de countdown</div>
    `;
}

async function slaDatumOp() {
    const naam  = document.getElementById('datum-evenement-naam')?.value.trim();
    const datum = document.getElementById('datum-input')?.value;
    if (!datum) { alert('Vul een datum in!'); return; }

    state.evenementNaam  = naam  || state.evenementNaam;
    state.evenementDatum = datum + ':00';

    const btn = document.getElementById('datum-opslaan-btn');
    if (btn) { btn.textContent = '⏳ Opslaan...'; btn.disabled = true; }
    const ok = await slaOp(state);
    if (btn) {
        btn.textContent = ok ? '✅ Datum opgeslagen!' : '❌ Fout!';
        btn.disabled = false;
        setTimeout(() => btn.textContent = '💾 Datum opslaan', 2500);
    }
    if (ok) updateStats();
}

// ══════════════════════════════════════
// DRAG & DROP (gedeeld)
// ══════════════════════════════════════
function dragStart(e, i) { dragSrc = i; e.currentTarget.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; }
function dragOver(e)  { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
function dragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
function dragEnd(e)   { e.currentTarget.classList.remove('dragging'); document.querySelectorAll('[class*="item"]').forEach(el=>el.classList.remove('drag-over','dragging')); }
function dragDrop(e, targetI, type) {
    e.preventDefault(); e.currentTarget.classList.remove('drag-over');
    if (dragSrc===null||dragSrc===targetI) return;
    const moved = state.nummers.splice(dragSrc,1)[0];
    state.nummers.splice(targetI,0,moved);
    herNummer();
    if (type==='volgorde') bouwVolgordeEditor();
    dragSrc=null;
}
