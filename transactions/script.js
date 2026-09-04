// Meridian Bank — Tranzacții și extras de cont. No backend, no dependencies.
//
// The "current moment" is pinned to Friday, 4 September 2026, 11:00 so the
// exercise reproduces the same way on whatever day the page is opened. The page
// prints this date as "Azi: ..." so a tester is never guessing what "today" is.
// It is a test-harness constant, not one of the planted bugs.
var NOW = new Date(2026, 8, 4, 11, 0);

// BUG 10: the card PAN is kept and printed in full in the details panel and in
// the CSV export. A card number must be masked to the last 4 digits.
var CARD = "4539 8842 1100 4821";

var STATEMENT_FEE = 5.00;

var soldContabil = 7430.00;

// data / settle are ISO date strings; `suma` is signed (negative = ieșire).
var transactions = [
  { id: "T-2044", data: "2026-01-15", settle: "2026-01-16", desc: "SC TERRA TRAVEL SRL",
    suma: -2150.00, status: "Decontat", auth: "771204", term: "TERRA TRAVEL BUCURESTI", nota: "" },
  { id: "T-2031", data: "2026-07-28", settle: "2026-07-28", desc: "Salariu iulie SC ALFA SRL",
    suma: 6400.00, status: "Decontat", auth: "—", term: "Transfer interbancar", nota: "" },
  { id: "T-2032", data: "2026-08-05", settle: "2026-08-06", desc: "ENEL ENERGIE factura 08/2026",
    suma: -318.45, status: "Decontat", auth: "220913", term: "Debit direct", nota: "" },
  { id: "T-2033", data: "2026-08-12", settle: "2026-08-13", desc: "KAUFLAND BUCURESTI 042",
    suma: -247.90, status: "Decontat", auth: "884120", term: "POS 40219933", nota: "" },
  { id: "T-2034", data: "2026-08-15", settle: "2026-08-15", desc: "Retragere numerar ATM MERIDIAN",
    suma: -400.00, status: "Decontat", auth: "119055", term: "ATM 7781 Unirii", nota: "" },
  { id: "T-2035", data: "2026-08-19", settle: "2026-08-21", desc: "EMAG.RO comanda 88213",
    suma: -1249.00, status: "Decontat", auth: "552018", term: "E-commerce 3DS", nota: "" },
  { id: "T-2036", data: "2026-08-28", settle: "2026-08-28", desc: "Salariu august SC ALFA SRL",
    suma: 6400.00, status: "Decontat", auth: "—", term: "Transfer interbancar", nota: "" },
  { id: "T-2037", data: "2026-08-30", settle: "2026-08-31", desc: "Transfer catre Popescu Ion",
    suma: -350.00, status: "Decontat", auth: "—", term: "Transfer intrabancar", nota: "" },
  { id: "T-2038", data: "2026-09-01", settle: "2026-09-02", desc: "DIGI COMUNICATII abonament",
    suma: -69.99, status: "Decontat", auth: "601744", term: "Debit direct", nota: "" },
  // a genuine, still-open pre-authorisation — correct behaviour, not a bug
  { id: "T-2039", data: "2026-09-01", settle: "", desc: "HOTEL CONTINENTAL BRASOV",
    suma: -1200.00, status: "Autorizat", auth: "330871", term: "POS 55810022", nota: "" },
  { id: "T-2040", data: "2026-09-02", settle: "2026-09-03", desc: "GLOVO APP",
    suma: -87.50, status: "Decontat", auth: "445190", term: "E-commerce", nota: "" },
  // BUG 1: this hold was settled by T-2042 at 200,00 and should have been
  // released. It is still "Autorizat", so 500,00 stays blocked on top of the
  // 200,00 that was actually charged.
  { id: "T-2041", data: "2026-09-03", settle: "", desc: "PETROM BENZINARIE OTOPENI",
    suma: -500.00, status: "Autorizat", auth: "907233", term: "POS 33019845", nota: "" },
  { id: "T-2042", data: "2026-09-04", settle: "2026-09-04", desc: "PETROM BENZINARIE OTOPENI",
    suma: -200.00, status: "Decontat", auth: "907233", term: "POS 33019845", nota: "" },
  // BUG 2: dated 6 September 2026 — two days after "today" and a Sunday — yet
  // it is already "Decontat" and already reflected in the balance.
  { id: "T-2043", data: "2026-09-06", settle: "2026-09-06", desc: "LIDL DISCOUNT SRL 118",
    suma: -142.30, status: "Decontat", auth: "716002", term: "POS 21447700", nota: "" }
];

var current = null;   // transaction shown in the details panel
var stmtCount = 0;

// --- element refs ---
var balBook  = document.getElementById("balBook");
var balAvail = document.getElementById("balAvail");
var holdNote = document.getElementById("holdNote");

var fFrom = document.getElementById("fFrom");
var fTo   = document.getElementById("fTo");
var fType = document.getElementById("fType");
var fMin  = document.getElementById("fMin");
var fText = document.getElementById("fText");

var applyBtn = document.getElementById("applyBtn");
var resetBtn = document.getElementById("resetBtn");
var csvBtn   = document.getElementById("csvBtn");

var txList = document.getElementById("txList");
var count  = document.getElementById("count");

var detail   = document.getElementById("detail");
var dTitle   = document.getElementById("dTitle");
var dClose   = document.getElementById("dClose");
var dDate    = document.getElementById("dDate");
var dSettle  = document.getElementById("dSettle");
var dAmount  = document.getElementById("dAmount");
var dStatus  = document.getElementById("dStatus");
var dCard    = document.getElementById("dCard");
var dAuth    = document.getElementById("dAuth");
var dTerm    = document.getElementById("dTerm");
var noteInput = document.getElementById("noteInput");
var noteBtn   = document.getElementById("noteBtn");
var dispBtn   = document.getElementById("dispBtn");
var dMsg      = document.getElementById("dMsg");

var stmtBtn = document.getElementById("stmtBtn");
var stmtOut = document.getElementById("stmtOut");
var csvBox  = document.getElementById("csvBox");
var csvOut  = document.getElementById("csvOut");

// --- helpers ---

function pad(n) { return n < 10 ? "0" + n : "" + n; }

function fmt(n) {
  var s = Math.abs(n).toFixed(2);
  var parts = s.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (n < 0 ? "-" : "") + parts[0] + "," + parts[1];
}

// ISO "2026-08-05" -> "05.08.2026"
function fmtDate(iso) {
  if (!iso) return "—";
  var p = iso.split("-");
  return p[2] + "." + p[1] + "." + p[0];
}

function round2(n) { return Math.round(n * 100) / 100; }

function show(el, type, text) {
  el.className = "msg " + type;
  el.textContent = text;
}

// --- balances ---

function heldAmount() {
  var h = 0;
  for (var i = 0; i < transactions.length; i++) {
    if (transactions[i].status === "Autorizat") h += Math.abs(transactions[i].suma);
  }
  return round2(h);
}

function renderBalances() {
  var held = heldAmount();
  balBook.textContent = fmt(soldContabil) + " RON";
  // BUG 1: every "Autorizat" line is subtracted, including the fuel hold that
  // was already settled at a lower amount by T-2042. The hold is never released.
  balAvail.textContent = fmt(round2(soldContabil - held)) + " RON";
  holdNote.textContent = "Din care blocat de tranzacții autorizate: " + fmt(held) + " RON.";
}

// --- filtering ---

function passes(t) {
  var from = fFrom.value;
  var to   = fTo.value;

  if (from && t.data < from) return false;
  // BUG 5: ">=" excludes a transaction dated exactly on "Până la". The start of
  // the interval is inclusive, the end is not — the range is asymmetric.
  if (to && t.data >= to) return false;

  var type = fType.value;
  if (type === "in" && t.suma <= 0) return false;
  if (type === "out" && t.suma >= 0) return false;

  // BUG 6: raw parseFloat. "1.000" becomes 1, "250,50" becomes 250, and a
  // non-numeric value produces NaN, which makes every comparison false, so the
  // filter silently does nothing instead of complaining.
  if (fMin.value !== "") {
    var min = parseFloat(fMin.value);
    if (Math.abs(t.suma) < min) return false;
  }

  // BUG 7: case-sensitive, and indexOf(...) === 0 only matches the start of the
  // description. "kaufland" or "ENERGIE" find nothing.
  var q = fText.value;
  if (q !== "" && t.desc.indexOf(q) !== 0) return false;

  return true;
}

// --- rendering the list ---

function render() {
  renderBalances();

  var rows = [];
  for (var i = 0; i < transactions.length; i++) {
    if (passes(transactions[i])) rows.push(transactions[i]);
  }

  // BUG 3: the rows are ordered by the formatted "dd.mm.yyyy" string, newest
  // first. A string comparison sorts by day-of-month, then month, then year, so
  // 30.08 lands above 06.09 and 15.01.2026 lands in the middle of August.
  rows.sort(function (a, b) {
    var da = fmtDate(a.data), db = fmtDate(b.data);
    if (da === db) return 0;
    return da > db ? -1 : 1;
  });

  txList.innerHTML = "";
  count.textContent = rows.length + " din " + transactions.length + " tranzacții";

  if (rows.length === 0) {
    var empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "Nicio tranzacție pentru filtrele selectate.";
    txList.appendChild(empty);
    return;
  }

  // BUG 4: the running balance is walked over the displayed order. Because that
  // order is not chronological, "Sold după" goes up and down at random and can
  // exceed the account balance.
  var run = soldContabil;

  for (var j = 0; j < rows.length; j++) {
    var t = rows[j];
    var li = document.createElement("li");

    var desc = document.createElement("div");
    desc.className = "t-desc";

    var d1 = document.createElement("div");
    d1.className = "d1";
    d1.textContent = t.desc;
    if (t.status === "Autorizat") {
      var b = document.createElement("span");
      b.className = "badge auth";
      b.textContent = "Autorizat";
      d1.appendChild(b);
    } else if (t.status === "Contestată") {
      var bd = document.createElement("span");
      bd.className = "badge disp";
      bd.textContent = "Contestată";
      d1.appendChild(bd);
    }
    desc.appendChild(d1);

    var d2 = document.createElement("div");
    d2.className = "d2";
    d2.textContent = fmtDate(t.data) + " · " + t.id;
    desc.appendChild(d2);

    if (t.nota) {
      var n = document.createElement("div");
      n.className = "t-note";
      // BUG 9: the personal note is injected as markup. Typing
      // <img src=x onerror=alert(1)> into the note field executes it.
      n.innerHTML = t.nota;
      desc.appendChild(n);
    }

    var amt = document.createElement("div");
    amt.className = "t-amt" + (t.suma > 0 ? " in" : "");
    amt.textContent = (t.suma > 0 ? "+" : "") + fmt(t.suma);

    var runEl = document.createElement("div");
    runEl.className = "t-run";
    runEl.textContent = fmt(round2(run));
    run = round2(run - t.suma);

    li.appendChild(desc);
    li.appendChild(amt);
    li.appendChild(runEl);

    // BUG 17: click only. The <li> has no tabindex and no role, so the details
    // panel — and everything inside it, including "Contestă tranzacția" —
    // cannot be reached with the keyboard.
    li.onclick = (function (tx) {
      return function () { openDetail(tx); };
    })(t);

    txList.appendChild(li);
  }
}

// --- details panel ---

function openDetail(t) {
  current = t;
  dTitle.textContent = t.desc + " (" + t.id + ")";
  dDate.textContent   = fmtDate(t.data);
  dSettle.textContent = t.settle ? fmtDate(t.settle) : "—";
  dAmount.textContent = fmt(t.suma) + " RON";
  dStatus.textContent = t.status;
  // BUG 10: full PAN.
  dCard.textContent   = CARD;
  dAuth.textContent   = t.auth;
  dTerm.textContent   = t.term;
  noteInput.value     = t.nota;
  show(dMsg, "", "");
  detail.hidden = false;
}

dClose.onclick = function () {
  detail.hidden = true;
  current = null;
};

noteBtn.onclick = function () {
  if (!current) return;
  current.nota = noteInput.value;
  render();
  show(dMsg, "ok", "Nota a fost salvată.");
};

dispBtn.onclick = function () {
  if (!current) return;

  // BUG 11: the "maximum 60 de zile" rule printed right above this button is
  // never checked — T-2044 (15.01.2026) can still be disputed.
  // BUG 12: no check on the status either, so a transaction that is only
  // "Autorizat" and not settled yet can be disputed.
  // BUG 13: no confirmation dialog, no OTP / password / step-up authentication,
  // and the button stays enabled, so a second click disputes it again and
  // credits the amount a second time.
  current.status = "Contestată";

  // BUG 14: the amount is credited back to the account immediately and
  // silently — no reference number for the customer, no new line in the list
  // explaining where the money came from, and no audit entry anywhere on the
  // page. Disputing an incoming transaction credits it a second time.
  soldContabil = round2(soldContabil + Math.abs(current.suma));

  render();
  show(dMsg, "ok", "Tranzacția a fost contestată.");
};

// --- filters ---

applyBtn.onclick = function () { render(); };

resetBtn.onclick = function () {
  fFrom.value = "";
  fTo.value = "";
  fType.value = "toate";
  fMin.value = "";
  fText.value = "";
  render();
};

// --- CSV export ---

csvBtn.onclick = function () {
  var out = "ID;Data;Descriere;Suma;Status;Card;Nota\n";

  // BUG 8: the export always walks the full `transactions` array. Whatever the
  // filters are showing on screen is ignored, so the file does not match the
  // list the user is looking at.
  for (var i = 0; i < transactions.length; i++) {
    var t = transactions[i];
    out += t.id + ";" +
           fmtDate(t.data) + ";" +
           t.desc + ";" +
           fmt(t.suma) + ";" +
           t.status + ";" +
           // BUG 10 again: the full PAN goes into the exported file.
           CARD + ";" +
           // BUG 8: the note is written raw, unquoted and unescaped. A note
           // containing ";" breaks the columns and a note starting with "="
           // is opened as a formula by Excel / LibreOffice.
           t.nota + "\n";
  }

  csvOut.textContent = out;
  csvBox.hidden = false;
};

// --- monthly statement ---

stmtBtn.onclick = function () {
  stmtCount++;

  // BUG 15: the fee is charged again on every press, and it never appears as a
  // transaction line — the balance simply drops by 5,00 with no explanation.
  soldContabil = round2(soldContabil - STATEMENT_FEE);

  var lines = [];
  for (var i = 0; i < transactions.length; i++) {
    var t = transactions[i];
    if (t.data >= "2026-08-01" && t.data <= "2026-08-31" && t.status === "Decontat") {
      lines.push(t);
    }
  }

  // BUG 16: the totals are computed over the whole array — every month, plus the
  // amounts that are only authorised and not settled — while the lines printed
  // below cover August only. The statement contradicts itself.
  var totIn = 0, totOut = 0;
  for (var k = 0; k < transactions.length; k++) {
    if (transactions[k].suma > 0) totIn += transactions[k].suma;
    else totOut += Math.abs(transactions[k].suma);
  }

  var box = document.createElement("div");
  box.className = "stmt";

  var h = document.createElement("h3");
  // BUG 15: same number every time, appended instead of replaced.
  h.textContent = "Extras nr. 8/2026 · perioada 01.08.2026 – 31.08.2026";
  box.appendChild(h);

  for (var j = 0; j < lines.length; j++) {
    var row = document.createElement("div");
    row.className = "sline";
    var a = document.createElement("span");
    a.textContent = fmtDate(lines[j].data) + " " + lines[j].desc;
    var b = document.createElement("span");
    b.textContent = fmt(lines[j].suma);
    row.appendChild(a);
    row.appendChild(b);
    box.appendChild(row);
  }

  var rIn = document.createElement("div");
  rIn.className = "sline stot";
  rIn.innerHTML = "<span>Total intrări</span><span>" + fmt(round2(totIn)) + "</span>";
  box.appendChild(rIn);

  var rOut = document.createElement("div");
  rOut.className = "sline";
  rOut.innerHTML = "<span>Total ieșiri</span><span>" + fmt(round2(totOut)) + "</span>";
  box.appendChild(rOut);

  var rN = document.createElement("div");
  rN.className = "sline";
  rN.innerHTML = "<span>Număr tranzacții</span><span>" + lines.length + "</span>";
  box.appendChild(rN);

  stmtOut.appendChild(box);
  render();
};

render();
