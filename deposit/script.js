// Meridian Bank — Depozite la termen. No backend, no dependencies.
//
// The "current moment" is pinned to Thursday, 3 September 2026, 10:00 so the
// exercise reproduces the same way on whatever day the page is opened (same idea
// as the pinned date in the bills app). It is a test-harness constant, not one
// of the planted bugs. The page also prints this date as "Azi: ..." so a tester
// is not guessing what "today" is.
var NOW = new Date(2026, 8, 3, 10, 0);

// BUG 14: the full IBAN is kept and printed in clear everywhere it appears. A
// real UI masks all but the last group ("•••• 0000").
var IBAN = "RO49 MERI 1B31 0075 9384 0000";

// Current published rates, annual (p.a.), keyed by term in months. Mirrored in
// the "Dobânzi curente" table in index.html.
var RATES = { 1: 2.00, 3: 3.00, 6: 4.00, 12: 4.50 };

var TAX_RATE = 0.10;      // impozit pe venitul din dobândă, reținut la sursă
var SIGHT_RATE = 0.25;    // dobândă penalizatoare la lichidare anticipată (% p.a.)

var balance = 25000.00;

// Pre-existing deposits. `opened` / `scadenta` are ISO date strings.
var deposits = [
  // matured 2 days ago (Tue 1 Sep); auto-renew is on
  { id: "D-1001", denumire: "Fond urgențe", suma: 12000.00, months: 12, rate: 6.00,
    opened: "2025-09-01", scadenta: "2026-09-01", autoRenew: true },
  // matured on a Saturday (29 Aug 2026), still pending processing
  { id: "D-1002", denumire: "Vacanță", suma: 5000.00, months: 3, rate: 3.00,
    opened: "2026-05-29", scadenta: "2026-08-29", autoRenew: false },
  // active, matures 18 Feb 2027
  { id: "D-1003", denumire: "", suma: 8000.00, months: 6, rate: 4.00,
    opened: "2026-08-18", scadenta: "2027-02-18", autoRenew: false }
];

var seq = 1004;
var currentMonths = 6;
var liqTarget = null;

// --- element refs ---
var depForm     = document.getElementById("depForm");
var amountInput = document.getElementById("amountInput");
var nameInput   = document.getElementById("nameInput");
var renewChk    = document.getElementById("renewChk");
var termChips   = document.getElementById("termChips");
var depBtn      = document.getElementById("depBtn");
var msg         = document.getElementById("msg");
var balanceEl   = document.getElementById("balance");

var pvPrincipal = document.getElementById("pvPrincipal");
var pvRate      = document.getElementById("pvRate");
var pvGross     = document.getElementById("pvGross");
var pvTax       = document.getElementById("pvTax");
var pvNet       = document.getElementById("pvNet");
var pvMaturity  = document.getElementById("pvMaturity");
var pvDate      = document.getElementById("pvDate");

var depList     = document.getElementById("depList");

var liqPanel    = document.getElementById("liqPanel");
var lpTitle     = document.getElementById("lpTitle");
var lpClose     = document.getElementById("lpClose");
var lpPrincipal = document.getElementById("lpPrincipal");
var lpDays      = document.getElementById("lpDays");
var lpPenalty   = document.getElementById("lpPenalty");
var lpPayout    = document.getElementById("lpPayout");
var liqBtn      = document.getElementById("liqBtn");
var liqMsg      = document.getElementById("liqMsg");

var runMatBtn   = document.getElementById("runMatBtn");
var histList    = document.getElementById("histList");

// --- helpers ---

function pad(n) { return n < 10 ? "0" + n : "" + n; }

function todayISO() {
  return NOW.getFullYear() + "-" + pad(NOW.getMonth() + 1) + "-" + pad(NOW.getDate());
}

function fmt(n) {
  var s = Math.abs(n).toFixed(2);
  var parts = s.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (n < 0 ? "-" : "") + parts[0] + "," + parts[1];
}

function round2(n) { return Math.round(n * 100) / 100; }

function clock() { return new Date().toLocaleTimeString("ro-RO"); }

function addMonths(iso, m) {
  var d = new Date(iso + "T00:00:00");
  d.setMonth(d.getMonth() + m);
  // BUG 8: the maturity date is returned exactly as computed. If it lands on a
  // Saturday or Sunday it is NOT rolled to the next business day, and nothing
  // downstream treats the funds as available only on the following Monday. The
  // day count below is a raw calendar-day count for the same reason.
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

function daysBetween(isoA, isoB) {
  var a = new Date(isoA + "T00:00:00");
  var b = new Date(isoB + "T00:00:00");
  return Math.round((b - a) / 86400000);
}

function grossInterest(principal, rate, months) {
  return round2(principal * (rate / 100) * (months / 12));
}

function maturityValueShown(d) {
  // BUG 1: the headline value for a deposit uses GROSS interest — the 10%
  // withholding tax that the preview subtracts is ignored here too.
  return round2(d.suma + grossInterest(d.suma, d.rate, d.months));
}

function show(el, type, text) {
  el.className = "msg " + type;
  el.textContent = text;
}

function updateBalance() {
  // BUG 6 / BUG 7: nothing stops `balance` going negative or jumping up on a
  // negative deposit — it is just printed as-is.
  balanceEl.textContent = fmt(balance) + " RON";
}

function findDeposit(id) {
  for (var i = 0; i < deposits.length; i++) if (deposits[i].id === id) return deposits[i];
  return null;
}

function removeDeposit(id) {
  for (var i = 0; i < deposits.length; i++) {
    if (deposits[i].id === id) { deposits.splice(i, 1); return; }
  }
}

function addHistory(html) {
  var empty = histList.querySelector(".empty");
  if (empty) empty.remove();
  var li = document.createElement("li");
  // BUG 13: the denumire text (concatenated into this string) is inserted as
  // HTML. "<b>x</b>" renders bold; "<img src=x onerror=...>" executes.
  // BUG 14: the full IBAN is written into history rows too.
  li.innerHTML = html;
  histList.appendChild(li);
}

function matNote(text) {
  var note = document.getElementById("matNote");
  if (!note) {
    note = document.createElement("div");
    note.id = "matNote";
    note.className = "hint";
    runMatBtn.parentNode.appendChild(note);
  }
  note.textContent = text;
}

// --- preview ---

// BUG 2: renderPreview() is wired to the amount field's `input` event only. The
// term chips update `currentMonths` and the "% pe an" label but do NOT call it,
// so after changing the term the gross / net / maturity / date lines keep
// showing the previous term's numbers until the amount is edited again — and the
// figure sitting next to "Deschide depozit" is then wrong for the selected term.
function renderPreview() {
  var principal = parseFloat(amountInput.value);   // BUG 4: "10.000" -> 10, "5000,50" -> 5000
  var rate = RATES[currentMonths];
  pvRate.textContent = fmt(rate) + "%";

  if (isNaN(principal)) {
    pvPrincipal.textContent = "—";
    pvGross.textContent = "—";
    pvTax.textContent = "—";
    pvNet.textContent = "—";
    pvMaturity.textContent = "—";
    pvDate.textContent = "—";
    return;
  }

  var gross = grossInterest(principal, rate, currentMonths);
  var tax = round2(gross * TAX_RATE);
  var net = round2(gross - tax);

  pvPrincipal.textContent = fmt(principal) + " RON";
  pvGross.textContent = fmt(gross) + " RON";
  pvTax.textContent = "-" + fmt(tax) + " RON";
  pvNet.textContent = fmt(net) + " RON";
  // BUG 1: "Valoare la scadență" = principal + GROSS interest. It ignores the
  // "Impozit pe dobândă" / "Dobândă netă" lines shown directly above it.
  pvMaturity.textContent = fmt(principal + gross) + " RON";
  pvDate.textContent = addMonths(todayISO(), currentMonths);
}

// --- deposits list ---

function statusTag(d) {
  var matured = new Date(d.scadenta + "T00:00:00") <= NOW;
  if (matured && d.autoRenew) return '<span class="tag renew">Scadent · reînnoire automată</span>';
  if (matured) return '<span class="tag due">Scadent · de procesat</span>';
  return '<span class="tag ok">Activ</span>';
}

function renderDeposits() {
  depList.innerHTML = "";
  if (deposits.length === 0) {
    depList.innerHTML = '<li class="empty">Niciun depozit.</li>';
    return;
  }
  for (var i = 0; i < deposits.length; i++) {
    var d = deposits[i];
    var li = document.createElement("li");
    li.className = "dep-row";
    // BUG 13: d.denumire straight into innerHTML.
    // BUG 14: full IBAN on every row.
    // BUG 15: "Lichidează anticipat" is a <span> — no role, no tabindex.
    li.innerHTML =
      '<div class="dep-main">' +
        '<div class="dep-name">' + (d.denumire || d.id) + ' ' + statusTag(d) + '</div>' +
        '<div class="dep-meta">' + fmt(d.suma) + ' RON · ' + d.months + ' luni · ' +
          fmt(d.rate) + '% p.a. · scadent ' + d.scadenta + '</div>' +
        '<div class="dep-meta">IBAN ' + IBAN + '</div>' +
      '</div>' +
      '<div class="dep-right">' +
        '<div class="dep-sum">' + fmt(maturityValueShown(d)) + ' RON</div>' +
        '<span class="liq-link" data-liq="' + d.id + '">Lichidează anticipat</span>' +
      '</div>';
    depList.appendChild(li);
  }
  var links = depList.querySelectorAll("[data-liq]");
  for (var k = 0; k < links.length; k++) {
    links[k].addEventListener("click", function () {
      openLiq(this.getAttribute("data-liq"));
    });
  }
}

function openLiq(id) {
  var d = findDeposit(id);
  if (!d) return;
  liqTarget = d;
  var days = daysBetween(d.opened, todayISO());
  // The panel presents the early-exit terms: interest recalculated at the
  // penalty (sight) rate for the elapsed days.
  var penaltyInterest = round2(d.suma * (SIGHT_RATE / 100) * (days / 365));

  lpTitle.textContent = (d.denumire || d.id) + " — lichidare anticipată";
  lpPrincipal.textContent = fmt(d.suma) + " RON";
  lpDays.textContent = days + " zile";
  lpPenalty.textContent = fmt(penaltyInterest) + " RON";
  // BUG 11: the panel promises principal + this small penalty interest...
  lpPayout.textContent = fmt(d.suma + penaltyInterest) + " RON";
  liqMsg.className = "msg";
  liqMsg.textContent = "";
  liqPanel.hidden = false;
}

liqBtn.addEventListener("click", function () {
  if (!liqTarget) return;
  var d = liqTarget;
  // BUG 11: ...but what actually reaches the account is principal + FULL
  // contract interest (gross). The penalty shown in the panel is never applied.
  // BUG 3: no confirmation and no step-up auth — one click destroys the term
  // deposit and moves the money.
  var credited = round2(d.suma + grossInterest(d.suma, d.rate, d.months));
  balance += credited;
  updateBalance();
  removeDeposit(d.id);
  renderDeposits();
  addHistory(clock() + " — Lichidare anticipată " + (d.denumire || d.id) +
    " · +" + fmt(credited) + " RON în contul " + IBAN);
  show(liqMsg, "success", "Depozit lichidat. Ai primit " + fmt(credited) + " RON.");
  liqTarget = null;
});

lpClose.addEventListener("click", function () {
  liqPanel.hidden = true;
  liqTarget = null;
});

// --- open a new deposit ---

depForm.addEventListener("submit", function (e) {
  e.preventDefault();

  var principal = parseFloat(amountInput.value);   // BUG 4
  var name = nameInput.value;

  // BUG 5: no check against the advertised 1.000 / 100.000 RON limits.
  // BUG 6: no check that `principal` fits the balance.
  // BUG 7: no check that `principal` is > 0.
  // Only a non-numeric amount is rejected.
  if (isNaN(principal)) { show(msg, "error", "Sumă invalidă."); return; }

  var months = currentMonths;
  var rate = RATES[months];
  var scadenta = addMonths(todayISO(), months);   // BUG 8

  balance -= principal;   // BUG 6 / BUG 7
  updateBalance();

  var d = {
    id: "D-" + (seq++),
    denumire: name,
    suma: principal,
    months: months,
    rate: rate,
    opened: todayISO(),
    scadenta: scadenta,
    autoRenew: renewChk.checked
  };
  deposits.push(d);
  renderDeposits();

  // BUG 13: `name` into innerHTML.  BUG 14: IBAN in clear.
  addHistory(clock() + " — Depozit nou " + (name || d.id) + " · -" + fmt(principal) +
    " RON din contul " + IBAN + " · scadent " + scadenta);

  msg.className = "msg success";
  // note: this recomputes the maturity from the CURRENT term, so if BUG 2 left a
  // stale figure in the preview, this line and the preview will disagree.
  msg.innerHTML = "Depozit deschis: " + (name || d.id) + " · " + fmt(principal) +
    " RON pe " + months + " luni. Valoare la scadență: " +
    fmt(principal + grossInterest(principal, rate, months)) + " RON.";

  // BUG 12: depBtn is never disabled and there is no in-flight flag — a second
  // fast click opens a second identical deposit and debits the account again.
  // BUG 3: a months-long lock of (here) tens of thousands of RON with no
  // "confirmi?" step and no OTP / password re-entry.
});

renewChk.addEventListener("change", function () { /* flag is read at submit time */ });

// term chips
var chips = termChips.querySelectorAll(".chip");
for (var c = 0; c < chips.length; c++) {
  chips[c].addEventListener("click", function () {
    for (var j = 0; j < chips.length; j++) chips[j].classList.remove("active");
    this.classList.add("active");
    currentMonths = parseInt(this.getAttribute("data-months"), 10);
    // the rate label follows the term...
    pvRate.textContent = fmt(RATES[currentMonths]) + "%";
    // BUG 2: ...but renderPreview() is not called here.
  });
}

amountInput.addEventListener("input", renderPreview);

// --- maturities batch ("scheduler") ---

runMatBtn.addEventListener("click", function () {
  var snapshot = deposits.slice();
  var toAdd = [];
  var processed = 0;

  for (var i = 0; i < snapshot.length; i++) {
    var d = snapshot[i];
    if (new Date(d.scadenta + "T00:00:00") > NOW) continue;   // not matured yet

    // BUG 1: gross interest is credited — the 10% withholding tax shown in the
    // "Deschide un depozit" preview is never actually deducted at maturity.
    var gross = grossInterest(d.suma, d.rate, d.months);

    if (d.autoRenew) {
      balance += gross;   // interest to the current account, principal rolls over
      // BUG 10: the rolled-over deposit reuses d.rate (the ORIGINAL 6,00%)
      // instead of RATES[d.months] (the current rate in "Dobânzi curente"), and
      // the customer gets no advance notice and no window to opt out before it
      // rolls.
      toAdd.push({
        id: "D-" + (seq++),
        denumire: d.denumire,
        suma: d.suma,
        months: d.months,
        rate: d.rate,
        opened: d.scadenta,
        scadenta: addMonths(d.scadenta, d.months),   // BUG 8 again
        autoRenew: true
      });
      removeDeposit(d.id);
      addHistory(clock() + " — Reînnoire automată " + (d.denumire || d.id) +
        " · dobândă +" + fmt(gross) + " RON · principal " + fmt(d.suma) +
        " RON reînnoit la " + fmt(d.rate) + "% p.a.");
      processed++;
    } else {
      balance += d.suma + gross;
      // BUG 9: the matured deposit is neither removed nor flagged as processed,
      // so pressing "Rulează scadențele" again pays it out a second time (and a
      // third, ...). There is no idempotency key / processed marker on the run.
      addHistory(clock() + " — Scadență " + (d.denumire || d.id) + " · +" +
        fmt(d.suma + gross) + " RON în contul " + IBAN);
      processed++;
    }
  }

  for (var j = 0; j < toAdd.length; j++) deposits.push(toAdd[j]);
  updateBalance();
  renderDeposits();
  matNote(processed === 0
    ? "Nicio scadență de procesat."
    : processed + " scadență/scadențe procesate.");
});

// --- init ---
updateBalance();
renderPreview();
renderDeposits();
