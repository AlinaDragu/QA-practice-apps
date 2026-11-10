// Hotel Brezaia — room booking page (no backend, everything lives in memory)

const AZI = new Date(2026, 11, 10);
const PRET = { standard: 300, deluxe: 450, apartament: 700 };
const NUME_CAMERA = { standard: 'Standard', deluxe: 'Deluxe', apartament: 'Apartament' };
const APARTAMENT_OCUPAT = [{ din: new Date(2026, 11, 20), pana: new Date(2026, 11, 23) }];
const ZILE = ['duminică', 'luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă'];

let rezervari = [
  {
    id: 'RZ-1004', camera: 'standard', checkIn: new Date(2027, 0, 5), checkOut: new Date(2027, 0, 8),
    adulti: 1, copii: 0, micDejun: false, cod: 'FIRST50', total: 865, primaNoapte: 300,
    nume: 'Maria Ionescu', email: 'maria.ionescu@example.com', status: 'confirmata', rambursat: 0
  },
  {
    id: 'RZ-1003', camera: 'deluxe', checkIn: new Date(2026, 11, 11), checkOut: new Date(2026, 11, 13),
    adulti: 2, copii: 0, micDejun: true, cod: '', total: 1260, primaNoapte: 540,
    nume: 'Maria Ionescu', email: 'maria.ionescu@example.com', status: 'confirmata', rambursat: 0
  },
  {
    id: 'RZ-1002', camera: 'standard', checkIn: new Date(2026, 11, 12), checkOut: new Date(2026, 11, 14),
    adulti: 2, copii: 0, micDejun: false, cod: '', total: 680, primaNoapte: 360,
    nume: 'Maria Ionescu', email: 'maria.ionescu@example.com', status: 'confirmata', rambursat: 0
  }
];
let urmatorId = 1005;
let totalRambursat = 0;
let codAplicat = '';

const $ = (id) => document.getElementById(id);

// ---------- helpers ----------

function parseData(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function zileIntre(a, b) {
  return Math.round((b - a) / 86400000);
}

function adaugaZile(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function fmtData(d) {
  const z = (n) => String(n).padStart(2, '0');
  return `${z(d.getDate())}.${z(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function bani(n) {
  const [int, dec] = Math.abs(n).toFixed(2).split('.');
  return (n < 0 ? '−' : '') + int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + dec + ' RON';
}

function textNopti(n) {
  return n === 1 ? '1 noapte' : `${n} nopți`;
}

function textPersoane(adulti, copii) {
  let t = adulti === 1 ? '1 adult' : `${adulti} adulți`;
  if (copii === 1) t += ' + 1 copil';
  if (copii > 1) t += ` + ${copii} copii`;
  return t;
}

// ---------- form ----------

function citesteFormular() {
  return {
    checkIn: parseData($('checkIn').value),
    checkOut: parseData($('checkOut').value),
    camera: $('roomType').value,
    adulti: Number($('adults').value),
    copii: Number($('children').value),
    micDejun: $('breakfast').checked,
    cod: codAplicat
  };
}

function calculeaza(f) {
  const nopti = zileIntre(f.checkIn, f.checkOut);
  let cazare = 0;
  let noptiWeekend = 0;
  let primaNoapte = 0;

  for (let i = 0; i < nopti; i++) {
    const zi = adaugaZile(f.checkIn, i).getDay();
    let pret = PRET[f.camera];
    if (zi === 6 || zi === 0) {
      pret *= 1.2;
      noptiWeekend++;
    }
    if (i === 0) primaNoapte = pret;
    cazare += pret;
  }

  const micDejun = f.micDejun ? (f.adulti + f.copii) * 40 * nopti : 0;
  const taxa = f.adulti * 5 * nopti;

  let reducere = 0;
  let notaCod = '';
  if (f.cod === 'IARNA15') {
    if (nopti >= 2 && f.checkIn <= new Date(2027, 1, 28)) {
      reducere = (cazare + micDejun + taxa) * 0.15;
    } else {
      notaCod = 'IARNA15 nu se aplică: minim 2 nopți și check-in până la 28.02.2027.';
    }
  } else if (f.cod === 'FIRST50') {
    reducere = 50;
  }
  reducere = Math.round(reducere * 100) / 100;

  return {
    nopti, noptiWeekend, primaNoapte, cazare, micDejun, taxa, reducere, notaCod,
    total: Math.round((cazare + micDejun + taxa - reducere) * 100) / 100
  };
}

function actualizeazaRezumat() {
  const f = citesteFormular();
  const ids = ['sNights', 'sRoom', 'sBreakfast', 'sTax', 'sDiscount', 'sTotal'];
  if (!f.checkIn || !f.checkOut || zileIntre(f.checkIn, f.checkOut) < 0) {
    ids.forEach((id) => { $(id).textContent = '—'; });
    $('sWeekend').textContent = '';
    return;
  }
  const c = calculeaza(f);
  $('sNights').textContent = c.nopti;
  $('sWeekend').textContent = c.noptiWeekend ? `(din care ${c.noptiWeekend} de weekend)` : '';
  $('sRoom').textContent = bani(c.cazare);
  $('sBreakfast').textContent = bani(c.micDejun);
  $('sTax').textContent = bani(c.taxa);
  $('sDiscount').textContent = c.reducere ? bani(-c.reducere) : bani(0);
  $('sTotal').textContent = bani(c.total);
  if (codAplicat) {
    $('promoOk').textContent = c.notaCod || `Cod ${codAplicat} aplicat.`;
  }
}

function valideaza(f) {
  const e = {};
  const nume = $('name').value.trim();
  const email = $('email').value.trim();
  const telefon = $('phone').value.trim();

  if (!f.checkIn) e.errCheckIn = 'Alege data de check-in.';
  else if (zileIntre(AZI, f.checkIn) > 365) e.errCheckIn = 'Check-in-ul poate fi cel mult 365 de zile în avans.';

  if (!f.checkOut) e.errCheckOut = 'Alege data de check-out.';
  else if (f.checkIn) {
    const nopti = zileIntre(f.checkIn, f.checkOut);
    if (nopti < 0) e.errCheckOut = 'Check-out-ul trebuie să fie după check-in.';
    else if (nopti > 15) e.errCheckOut = 'Sejurul poate avea cel mult 14 nopți.';
  }

  const total = f.adulti + f.copii;
  if (f.camera === 'standard' && total > 3) {
    e.errGuests = 'Camera Standard: maxim 2 adulți și 3 persoane în total.';
  } else if (f.camera === 'deluxe' && f.adulti > 3) {
    e.errGuests = 'Camera Deluxe: maxim 3 adulți.';
  } else if (f.camera === 'deluxe' && total > 4) {
    e.errGuests = 'Camera Deluxe: maxim 4 persoane.';
  } else if (f.camera === 'apartament' && total > 6) {
    e.errGuests = 'Apartament: maxim 6 persoane.';
  }

  if (f.camera === 'apartament' && f.checkIn) {
    const ocupat = APARTAMENT_OCUPAT.some((p) => f.checkIn >= p.din && f.checkIn < p.pana);
    if (ocupat) e.errRoom = 'Apartamentul este ocupat în perioada aleasă.';
  }

  if (nume.length < 2 || nume.length > 50) e.errName = 'Numele trebuie să aibă între 2 și 50 de caractere.';
  if (!/^\S+@/.test(email)) e.errEmail = 'Introdu o adresă de email validă.';
  if (!/^07\d{7,8}$/.test(telefon)) e.errPhone = 'Telefonul trebuie să fie de forma 07xxxxxxxx.';

  return e;
}

function curataErori() {
  ['errCheckIn', 'errCheckOut', 'errRoom', 'errGuests', 'errName', 'errEmail', 'errPhone']
    .forEach((id) => { $(id).textContent = ''; });
  $('msg').className = 'msg';
  $('msg').textContent = '';
}

function arataMesaj(tip, text) {
  $('msg').className = `msg ${tip}`;
  $('msg').textContent = text;
}

// ---------- bookings list ----------

function render() {
  const ul = $('bookingList');
  ul.innerHTML = '';
  if (!rezervari.length) {
    ul.innerHTML = '<li class="empty">Nu ai nicio rezervare.</li>';
  }
  rezervari.forEach((r) => {
    const nopti = zileIntre(r.checkIn, r.checkOut);
    const status = r.status === 'anulata'
      ? `<span class="status cancel">Anulată · rambursat ${bani(r.rambursat)}</span>`
      : '<span class="status ok">Confirmată</span>';
    const li = document.createElement('li');
    li.className = 'b-row';
    li.id = `b-${r.id}`;
    li.innerHTML = `
      <div class="b-main">
        <div class="b-title">${r.id} · ${NUME_CAMERA[r.camera]}</div>
        <div class="b-meta">${fmtData(r.checkIn)} – ${fmtData(r.checkOut)} · ${textNopti(nopti)} · ${textPersoane(r.adulti, r.copii)}${r.micDejun ? ' · mic dejun' : ''}${r.cod ? ' · cod ' + r.cod : ''}<br>${r.nume}</div>
      </div>
      <div class="b-right">
        <div class="b-sum">${bani(r.total)}</div>
        ${status}
        <button type="button" class="cancel-btn" data-id="${r.id}">Anulează</button>
      </div>`;
    ul.appendChild(li);
  });
  $('refundTotal').textContent = bani(totalRambursat);
}

function anuleaza(id) {
  const r = rezervari.find((x) => x.id === id);
  if (!r) return;
  const zile = zileIntre(AZI, r.checkIn);
  const rambursat = zile > 2 ? r.total : Math.max(0, r.total - r.primaNoapte);
  r.status = 'anulata';
  r.rambursat = rambursat;
  totalRambursat += rambursat;
  render();
  arataMesaj('success', `Rezervarea ${r.id} a fost anulată. Rambursat: ${bani(rambursat)}.`);
}

// ---------- events ----------

['checkIn', 'checkOut', 'roomType', 'adults', 'children'].forEach((id) => {
  $(id).addEventListener('input', actualizeazaRezumat);
  $(id).addEventListener('change', actualizeazaRezumat);
});

$('promoBtn').addEventListener('click', () => {
  const cod = $('promo').value.trim();
  if (cod === 'IARNA15' || cod === 'FIRST50') {
    codAplicat = cod;
    $('promo').classList.remove('invalid');
  } else {
    codAplicat = '';
    $('promo').classList.add('invalid');
    $('promoOk').textContent = '';
  }
  actualizeazaRezumat();
});

$('promo').addEventListener('input', () => {
  if (!codAplicat && !$('promo').classList.contains('invalid')) return;
  codAplicat = '';
  $('promo').classList.remove('invalid');
  $('promoOk').textContent = '';
  actualizeazaRezumat();
});

$('bookingList').addEventListener('click', (ev) => {
  const btn = ev.target.closest('.cancel-btn');
  if (btn) anuleaza(btn.dataset.id);
});

$('bookForm').addEventListener('submit', (ev) => {
  ev.preventDefault();
  curataErori();
  const f = citesteFormular();
  const erori = valideaza(f);
  if (Object.keys(erori).length) {
    Object.entries(erori).forEach(([id, text]) => { $(id).textContent = text; });
    arataMesaj('error', 'Verifică câmpurile marcate.');
    return;
  }

  const c = calculeaza(f);
  const contact = {
    nume: $('name').value.trim(),
    email: $('email').value.trim()
  };
  $('bookBtn').textContent = 'Se procesează…';
  arataMesaj('info', 'Se trimite rezervarea…');

  setTimeout(() => {
    const r = {
      id: `RZ-${urmatorId++}`,
      camera: f.camera, checkIn: f.checkIn, checkOut: f.checkOut,
      adulti: f.adulti, copii: f.copii, micDejun: f.micDejun, cod: f.cod,
      total: c.total, primaNoapte: c.primaNoapte,
      nume: contact.nume, email: contact.email,
      status: 'confirmata', rambursat: 0
    };
    rezervari.unshift(r);
    render();
    $('bookBtn').textContent = 'Rezervă';
    arataMesaj('success', `Rezervarea ${r.id} a fost confirmată. Total: ${bani(r.total)}.`);
  }, 800);
});

$('today').textContent = `Azi: ${ZILE[AZI.getDay()]}, ${fmtData(AZI)}`;
render();
actualizeazaRezumat();
