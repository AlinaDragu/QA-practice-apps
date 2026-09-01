var form = document.getElementById("fxForm");
var amountEl = document.getElementById("amountField");
var fromEl = document.getElementById("fromCur");
var toEl = document.getElementById("toCur");
var refEl = document.getElementById("refField");
var swapBtn = document.getElementById("swapBtn");
var refreshBtn = document.getElementById("refreshBtn");
var fxBtn = document.getElementById("fxBtn");
var msg = document.getElementById("message");
var logList = document.getElementById("logList");

var rateLine = document.getElementById("rateLine");
var receiveOut = document.getElementById("receiveOut");
var rateUsedOut = document.getElementById("rateUsedOut");
var feeOut = document.getElementById("feeOut");
var debitOut = document.getElementById("debitOut");
var soldOut = document.getElementById("soldOut");

var balRON = document.getElementById("balRON");
var balEUR = document.getElementById("balEUR");
var balUSD = document.getElementById("balUSD");

var COMMISSION = 0.005;   // 0,5% comision schimb valutar

// "1 unit of currency X is worth <n> RON"
var rates = { RON: 1, EUR: 4.9718, USD: 4.5834 };

var balances = { RON: 8500.00, EUR: 320.00, USD: 150.00 };

// BUG 2: never assigned anywhere. Any currency pair without a RON leg
// (e.g. EUR -> USD) multiplies by this and produces NaN.
var crossRate;

// BUG 10: dot as decimal separator, no thousands grouping. The rest of the page
// (the subtitle) uses the Romanian "8.500,00" format, so results look foreign.
function fmt(n) {
  return n.toFixed(2);
}

function show(type, text) {
  msg.className = "msg " + type;
  msg.textContent = text;
}

function renderBalances() {
  balRON.textContent = fmt(balances.RON);
  balEUR.textContent = fmt(balances.EUR);
  balUSD.textContent = fmt(balances.USD);
}
renderBalances();

function convert(amount, from, to) {
  if (from === "RON") {
    // BUG 1: RON -> foreign currency must DIVIDE by the rate. This multiplies,
    // so 100 RON "becomes" ~497 EUR instead of ~20 EUR. The reverse direction
    // (foreign -> RON) below is correct, so the bug is direction-dependent.
    return amount * rates[to];
  }
  if (to === "RON") {
    return amount * rates[from];
  }
  // BUG 2: EUR <-> USD (no RON leg) is never handled -> amount * undefined = NaN.
  return amount * crossRate;
}

function updateRateLine() {
  rateLine.textContent =
    "Curs: 1 EUR = " + rates.EUR.toFixed(4) + " RON · 1 USD = " + rates.USD.toFixed(4) + " RON";
}
updateRateLine();

function updatePreview() {
  var raw = amountEl.value.trim();
  var from = fromEl.value;
  var to = toEl.value;

  if (raw === "") {
    receiveOut.textContent = "—";
    rateUsedOut.textContent = "—";
    feeOut.textContent = "—";
    debitOut.textContent = "—";
    soldOut.textContent = "—";
    return;
  }

  // BUG 8: parseFloat with no normalization. "1.500" -> 1.5, "1500,50" -> 1500,
  // "abc" -> NaN, and the NaN then flows straight into every box below.
  var amount = parseFloat(raw);

  var received = convert(amount, from, to);
  var fee = amount * COMMISSION;   // BUG 3: computed and shown, never applied

  receiveOut.textContent = fmt(received) + " " + to;
  rateUsedOut.textContent = "1 " + from + " = " + convert(1, from, to).toFixed(4) + " " + to;
  feeOut.textContent = fmt(fee) + " " + from;

  // BUG 3 (continued): the debit shown is exactly `amount` — the 0,5% commission
  // is never added on top of what leaves the source account.
  debitOut.textContent = fmt(amount) + " " + from;

  // BUG 4: subtracts the RECEIVED amount (target currency) from the SOURCE
  // balance. Exchanging 100 EUR -> RON shows "Sold sursă după schimb: 320 - 497".
  soldOut.textContent = fmt(balances[from] - received) + " " + from;
}

amountEl.addEventListener("input", updatePreview);
// Changing a dropdown directly DOES refresh the preview...
fromEl.addEventListener("change", updatePreview);
toEl.addEventListener("change", updatePreview);

// BUG 9: ...but the swap button does not. It flips the two selects and leaves the
// whole preview ("Vei primi", "Curs folosit") showing the previous pair.
swapBtn.addEventListener("click", function () {
  var t = fromEl.value;
  fromEl.value = toEl.value;
  toEl.value = t;
});

// BUG 9 (continued): refreshing the rate updates the internal `rates` and the
// small rate line, but NOT the preview. The next "Schimbă acum" then commits at
// the new rate, not the one shown next to the button, with no "revizuiește" cue.
refreshBtn.addEventListener("click", function () {
  rates = { RON: 1, EUR: 5.0402, USD: 4.6513 };
  updateRateLine();
  rateLine.textContent += " (actualizat " + new Date().toLocaleTimeString("ro-RO") + ")";
});

function addLogEntry(html) {
  var empty = logList.querySelector(".empty");
  if (empty) empty.remove();
  var li = document.createElement("li");
  // BUG 12: the reference text is inserted as HTML. "<b>x</b>" renders bold; an
  // "<img src=x onerror=...>" pasted into the reference field executes.
  li.innerHTML = html;
  logList.appendChild(li);
}

form.addEventListener("submit", function (e) {
  e.preventDefault();

  var from = fromEl.value;
  var to = toEl.value;
  var amount = parseFloat(amountEl.value);
  var ref = refEl.value;

  // BUG 6: only NaN is rejected — 0 and negative amounts pass this check.
  if (isNaN(amount)) { show("error", "Sumă invalidă."); return; }

  // BUG 5: no check that `amount` (let alone amount + commission) fits the balance.
  // BUG 7: no check that `from` and `to` are different currencies.

  var received = convert(amount, from, to);

  // BUG 3 (continued): commission is never taken; the debit is exactly `amount`.
  balances[from] = balances[from] - amount;
  balances[to] = balances[to] + received;
  renderBalances();

  // BUG 10 (continued): `received` is concatenated raw here (floating-point noise
  // like "497.17999999999995 RON"), while the preview box used fmt() to 2 dp.
  // BUG 12 (continued): `ref` goes into innerHTML via addLogEntry.
  var line = new Date().toLocaleTimeString("ro-RO") + " — " +
    amount + " " + from + " → " + received + " " + to +
    (ref ? " · " + ref : "");
  addLogEntry(line);

  msg.className = "msg success";
  msg.innerHTML = "Schimb efectuat: " + fmt(amount) + " " + from + " → " + fmt(received) + " " + to +
    (ref ? " · Ref: " + ref : "");

  // BUG 11: the button is never disabled and there is no in-flight guard, so
  // rapid clicks run one full exchange (and one debit) per click.
});

updatePreview();
