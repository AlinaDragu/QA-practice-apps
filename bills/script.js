// Meridian Bank — Plată facturi și utilități. No backend, no dependencies.
//
// The "current moment" is pinned to Wednesday, 2 September 2026, 14:30 so the
// exercise reproduces the same way on whatever day the page is opened (same idea
// as the hard-coded refreshed rate in the exchange app). It is a test-harness
// constant, not one of the planted bugs.
var NOW = new Date(2026, 8, 2, 14, 30);

// BUG 14: the full card number (PAN) is kept and printed in clear everywhere it
// appears. A real UI shows only the last 4 digits ("•••• 4821").
var CARD = "4539 8842 1100 4821";

var PENALTY_RATE = 0.05;      // 5% penalitate de întârziere
var PENALTY_GRACE_DAYS = 3;   // penalitatea se aplică după 3 zile de întârziere

var balance = 4200.00;

var bills = [
  { id: "DG-5567", furnizor: "Digi",         tip: "Internet & TV",    scadenta: "2026-09-02", suma: 120.00 },
  { id: "GZ-8823", furnizor: "Engie România", tip: "Gaze naturale",   scadenta: "2026-08-26", suma: 176.00 },
  { id: "VF-2231", furnizor: "Vodafone",      tip: "Telefonie mobilă", scadenta: "2026-08-29", suma: 49.99 },
  { id: "EN-4471", furnizor: "Enel Energie",  tip: "Electricitate",   scadenta: "2026-09-11", suma: 214.50 },
  { id: "AP-1290", furnizor: "Apa Nova",      tip: "Apă-canal",       scadenta: "2026-09-20", suma: 92.30 }
];

var scheduled = [];   // { billId, furnizor, amount, date, recurring }
var selectedBill = null;

var billList    = document.getElementById("billList");
var billCount   = document.getElementById("billCount");
var totalDue    = document.getElementById("totalDue");
var overdueCount = document.getElementById("overdueCount");

var payPanel  = document.getElementById("payPanel");
var payForm   = document.getElementById("payForm");
var ppTitle   = document.getElementById("ppTitle");
var ppClose   = document.getElementById("ppClose");
var amountInput = document.getElementById("amountInput");
var refInput  = document.getElementById("refInput");
var ppPrincipal = document.getElementById("ppPrincipal");
var ppPenaltyRow = document.getElementById("ppPenaltyRow");
var ppPenalty = document.getElementById("ppPenalty");
var ppTotal   = document.getElementById("ppTotal");
var ppCard    = document.getElementById("ppCard");
var schedChk  = document.getElementById("schedChk");
var schedDateWrap = document.getElementById("schedDateWrap");
var schedDate = document.getElementById("schedDate");
var recChk    = document.getElementById("recChk");
var payBtn    = document.getElementById("payBtn");
var msg       = document.getElementById("msg");

var schedList = document.getElementById("schedList");
var runSchedBtn = document.getElementById("runSchedBtn");
var histList  = document.getElementById("histList");

// BUG 16 (data side): plain "1234,56" with a decimal comma but no thousands
// grouping. Consistent across the page, so this one is only a minor readability
// nit — noted in BUGS.md, not a numbered plant.
function fmt(n) {
  return n.toFixed(2).replace(".", ",");
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function findBill(id) {
  for (var i = 0; i < bills.length; i++) {
    if (bills[i].id === id) return bills[i];
  }
  return null;
}

function removeBill(id) {
  for (var i = 0; i < bills.length; i++) {
    if (bills[i].id === id) { bills.splice(i, 1); return; }
  }
}

// BUG 10: NOW carries a time-of-day and `due` is midnight, so a bill whose due
// date IS today already comes out ~1 day late by the afternoon. The correct
// check floors NOW to midnight before subtracting. There is also no notion of
// weekends — VF-2231 falls due on a Saturday and is simply treated as "restantă"
// at 00:00 with no "se procesează în următoarea zi lucrătoare" handling.
function daysLate(scadenta) {
  var due = new Date(scadenta + "T00:00:00");
  return Math.ceil((NOW - due) / 86400000);
}

function penaltyFor(bill) {
  if (daysLate(bill.scadenta) > PENALTY_GRACE_DAYS) {
    return round2(bill.suma * PENALTY_RATE);
  }
  return 0;
}

function show(type, text) {
  msg.className = "msg " + type;
  msg.textContent = text;
}

function showSched(text) {
  // reuse the panel message area if it's open, otherwise fall back to alert-free
  // inline text under the button
  var note = document.getElementById("schedNote");
  if (!note) {
    note = document.createElement("div");
    note.id = "schedNote";
    note.className = "hint";
    runSchedBtn.parentNode.appendChild(note);
  }
  note.textContent = text;
}

function renderSummary() {
  var total = 0;
  var overdue = 0;
  for (var i = 0; i < bills.length; i++) {
    total += bills[i].suma;
    // BUG 10 (continued): ">= 1" on the time-inclusive daysLate marks a bill due
    // today as already restantă.
    if (daysLate(bills[i].scadenta) >= 1) overdue++;
  }
  totalDue.textContent = fmt(total) + " RON";
  billCount.textContent = bills.length;
  overdueCount.textContent = overdue;
}

function renderBills() {
  billList.innerHTML = "";
  if (bills.length === 0) {
    billList.innerHTML = '<li class="empty">Toate facturile sunt plătite.</li>';
    return;
  }
  for (var i = 0; i < bills.length; i++) {
    var b = bills[i];
    var late = daysLate(b.scadenta);
    var badge = late >= 1
      ? '<span class="tag overdue">Restantă · ' + late + ' zi(le) întârziere</span>'
      : '<span class="tag ok">Scadent ' + b.scadenta + '</span>';

    var li = document.createElement("li");
    li.className = "bill";
    // BUG 15: the row body is a plain <div> and the "Plătește" affordance is a
    // <span> — no <button>, no role, no tabindex, so neither is reachable or
    // operable with the keyboard.
    li.innerHTML =
      '<div class="bill-main" data-open="' + b.id + '">' +
        '<div class="bill-prov">' + b.furnizor + ' · ' + b.tip + '</div>' +
        '<div class="bill-meta">Factură ' + b.id + ' · ' + badge + '</div>' +
      '</div>' +
      '<div class="bill-right">' +
        '<div class="bill-sum">' + fmt(b.suma) + ' RON</div>' +
        '<span class="pay-link" data-open="' + b.id + '">Plătește</span>' +
      '</div>';
    billList.appendChild(li);
  }
  var openers = billList.querySelectorAll("[data-open]");
  for (var j = 0; j < openers.length; j++) {
    openers[j].addEventListener("click", function () {
      openPanel(this.getAttribute("data-open"));
    });
  }
}

function openPanel(id) {
  var b = findBill(id);
  if (!b) return;
  selectedBill = b;

  var pen = penaltyFor(b);
  ppTitle.textContent = b.furnizor + " — " + b.tip;
  // BUG 6: prefilled as a bare JS number string, e.g. "214.5". A user who clears
  // it and types "214,50" or "1.200" the Romanian way gets a silently wrong
  // amount from parseFloat.
  amountInput.value = String(b.suma);
  ppPrincipal.textContent = fmt(b.suma) + " RON";

  if (pen > 0) {
    ppPenaltyRow.hidden = false;
    ppPenalty.textContent = fmt(pen) + " RON";
    // BUG 1: the "Total de plată" advertised to the customer includes the
    // penalty...
    ppTotal.textContent = fmt(b.suma + pen) + " RON";
  } else {
    ppPenaltyRow.hidden = true;
    ppTotal.textContent = fmt(b.suma) + " RON";
  }

  ppCard.textContent = CARD;              // BUG 14
  msg.className = "msg";
  msg.textContent = "";
  payBtn.textContent = schedChk.checked ? "Programează plata" : "Plătește acum";
  payPanel.hidden = false;
}

function addHistory(html) {
  var empty = histList.querySelector(".empty");
  if (empty) empty.remove();
  var li = document.createElement("li");
  // BUG 13: the reference text (and everything concatenated with it) is inserted
  // as HTML. "<b>x</b>" renders bold; "<img src=x onerror=...>" executes.
  li.innerHTML = html;
  histList.appendChild(li);
}

function renderScheduled() {
  if (scheduled.length === 0) {
    schedList.innerHTML = '<li class="empty">Nicio plată programată.</li>';
    return;
  }
  schedList.innerHTML = "";
  for (var i = 0; i < scheduled.length; i++) {
    var s = scheduled[i];
    var li = document.createElement("li");
    // BUG 9: a scheduled payment (a future, money-moving instruction) is listed
    // with no cancel and no edit control at all.
    li.innerHTML = "<span>" + s.furnizor + " · " + fmt(s.amount) + " RON · " +
      (s.date ? s.date : "fără dată") +
      (s.recurring ? " · recurentă lunar" : "") + "</span>";
    schedList.appendChild(li);
  }
}

function doPayment(bill, amount, ref, tag) {
  // BUG 1 (continued): only `amount` leaves the account — the penalty shown in
  // "Total de plată" is never added.
  // BUG 4: no check that `amount` fits the balance.
  // BUG 5: no check that `amount` is > 0 (negative amount credits the account).
  // BUG 7: no check that `amount` does not exceed the invoice.
  balance -= amount;

  // BUG 3: the invoice is cleared in full regardless of how much was paid, so a
  // partial payment makes the rest of the bill disappear.
  removeBill(bill.id);
  renderBills();
  // BUG 2: renderSummary() is NOT called here, so the "Total de plată (N facturi)"
  // header keeps showing the pre-payment count and amount while the list below it
  // has already updated.

  var t = new Date().toLocaleTimeString("ro-RO");
  // BUG 13 / BUG 14: `ref` and the full card number go into innerHTML.
  addHistory(t + " — " + bill.furnizor + " · " + fmt(amount) + " RON · card " + CARD +
    (tag ? " · " + tag : "") + (ref ? " · " + ref : ""));

  msg.className = "msg success";
  msg.innerHTML = "Plată efectuată: " + bill.furnizor + " · " + fmt(amount) +
    " RON cu cardul " + CARD + (ref ? " · Ref: " + ref : "");
  // BUG 11: the button is never disabled and there is no in-flight flag, so a
  // second click here runs a second full payment against a bill that is already
  // gone from the list (findBill returns null on the row, but this handler still
  // debits `amount` again).
}

payForm.addEventListener("submit", function (e) {
  e.preventDefault();
  if (!selectedBill) return;

  var amount = parseFloat(amountInput.value);   // BUG 6
  var ref = refInput.value;

  // BUG 5 (continued): only a non-numeric amount is rejected. 0 and negatives pass.
  if (isNaN(amount)) { show("error", "Sumă invalidă."); return; }

  if (schedChk.checked) {
    // BUG 8: no validation that schedDate.value is today or later — or set at all.
    scheduled.push({
      billId: selectedBill.id,
      furnizor: selectedBill.furnizor,
      amount: amount,
      date: schedDate.value,
      recurring: recChk.checked
    });
    renderScheduled();
    show("success", "Plată programată: " + selectedBill.furnizor + " · " +
      fmt(amount) + " RON pentru " + (schedDate.value || "(fără dată)") +
      " cu cardul " + CARD);   // BUG 14
    return;
  }

  doPayment(selectedBill, amount, ref, "");
});

schedChk.addEventListener("change", function () {
  schedDateWrap.hidden = !schedChk.checked;
  payBtn.textContent = schedChk.checked ? "Programează plata" : "Plătește acum";
});

ppClose.addEventListener("click", function () {
  payPanel.hidden = true;
  selectedBill = null;
});

runSchedBtn.addEventListener("click", function () {
  var ran = 0;
  for (var i = 0; i < scheduled.length; i++) {
    var s = scheduled[i];
    var due = new Date(s.date + "T00:00:00");
    // an unset / invalid date makes `due` Invalid Date and this comparison false,
    // so a "fără dată" scheduled payment (BUG 8) silently never runs.
    if (due <= NOW) {
      balance -= s.amount;
      removeBill(s.billId);
      addHistory(new Date().toLocaleTimeString("ro-RO") + " — " + s.furnizor + " · " +
        fmt(s.amount) + " RON · card " + CARD + " · plată programată");   // BUG 13 / BUG 14
      ran++;
      // BUG 12: `s` is never marked processed or removed, so pressing the button
      // again re-runs every due payment and debits the account a second time.
      // BUG 12 (continued): `s.recurring` is ignored — a "recurentă lunar"
      // payment never gets a next-month occurrence created.
    }
  }
  renderBills();
  // BUG 2 (continued): the summary header is not refreshed here either.
  showSched(ran === 0
    ? "Nicio plată programată scadentă."
    : ran + " plată/plăți programate executate.");
});

renderBills();
renderSummary();
renderScheduled();
