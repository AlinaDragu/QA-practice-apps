var BALANCE_RON = 2500.00;
// rate = how much 1 RON is worth in the target currency
var RATES = { RON: 1, EUR: 0.20, USD: 0.22 };

var form = document.getElementById("payForm");
var ibanEl = document.getElementById("ibanField");
var amountEl = document.getElementById("amountField");
var currencyEl = document.getElementById("currencyField");
var pinEl = document.getElementById("pinField");
var preview = document.getElementById("preview");
var msg = document.getElementById("message");
var payBtn = document.getElementById("payBtn");
var logList = document.getElementById("logList");

function parseAmount(raw) {
  if (raw === null || raw === undefined) return NaN;
  return parseFloat(String(raw).replace(",", ".").trim());
}

function updatePreview() {
  var amount = parseAmount(amountEl.value);
  var cur = currencyEl.value;
  if (isNaN(amount)) {
    preview.textContent = "Introdu o sumă pentru a vedea echivalentul.";
    return;
  }
  if (cur === "RON") {
    preview.textContent = "Se vor debita " + amount.toFixed(2) + " RON din contul tău.";
    return;
  }
  // BUG 8: preview uses full 2-decimal rounding here...
  var converted = amount * RATES[cur];
  preview.textContent = "Beneficiarul va primi aproximativ " + converted.toFixed(2) + " " + cur +
    " (se debitează " + amount.toFixed(2) + " RON).";
}

// BUG 11: preview recalculates on amount input, but NOT when the currency changes
amountEl.addEventListener("input", updatePreview);

function addLogEntry(text) {
  var empty = logList.querySelector(".empty");
  if (empty) empty.remove();
  var li = document.createElement("li");
  li.textContent = text;
  logList.appendChild(li);
}

function show(type, text) {
  msg.className = "msg " + type;
  msg.textContent = text;
}

form.addEventListener("submit", function (e) {
  e.preventDefault();

  var iban = ibanEl.value.trim();
  var amount = parseAmount(amountEl.value);
  var cur = currencyEl.value;
  var pin = pinEl.value;

  // BUG 1: only checks that IBAN is non-empty — no format/length/checksum validation
  if (!iban) {
    show("error", "Introdu IBAN-ul destinatarului.");
    return;
  }

  // BUG 2 & BUG 3: negative and zero amounts pass this check
  if (isNaN(amount)) {
    show("error", "Sumă invalidă.");
    return;
  }

  // BUG 7: PIN accepted with no length or digit check (empty still blocked)
  if (!pin) {
    show("error", "Introdu PIN-ul.");
    return;
  }

  // BUG 6: wrong error message when funds are insufficient
  if (amount > BALANCE_RON) {
    show("error", "IBAN invalid.");
    return;
  }

  // BUG 4: button is never disabled — rapid clicks log multiple payments
  var converted;
  if (cur === "RON") {
    converted = amount.toFixed(2) + " RON";
  } else {
    // BUG 8: confirmation truncates to 1 decimal instead of rounding to 2 like the preview
    var raw = amount * RATES[cur];
    var truncated = Math.trunc(raw * 10) / 10;
    converted = truncated.toFixed(1) + " " + cur;
  }

  show("success", "Plată confirmată către " + iban + ".");
  addLogEntry(new Date().toLocaleTimeString("ro-RO") + " — " + amount.toFixed(2) + " RON → " + converted + " (" + iban + ")");
});
