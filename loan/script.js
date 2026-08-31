var form = document.getElementById("simForm");
var amountEl = document.getElementById("amountField");
var amountRange = document.getElementById("amountRange");
var monthsEl = document.getElementById("monthsField");
var monthsRange = document.getElementById("monthsRange");
var incomeEl = document.getElementById("incomeField");
var insuranceEl = document.getElementById("insurance");
var msg = document.getElementById("message");
var logList = document.getElementById("logList");

var rataOut = document.getElementById("rataOut");
var daeOut = document.getElementById("daeOut");
var totalOut = document.getElementById("totalOut");
var dobandaOut = document.getElementById("dobandaOut");
var insOut = document.getElementById("insOut");
var comOut = document.getElementById("comOut");
var dtiLine = document.getElementById("dtiLine");

var RATE = 9.49;        // % dobândă nominală anuală
var COMMISSION = 0.01;  // 1% comision analiză dosar (o singură dată)

// BUG 2: slider -> field is wired, but field -> slider is NOT. Typing 100000 in
// the text field leaves the slider sitting at its old position, and the two
// inputs silently disagree about the amount.
amountRange.addEventListener("input", function () {
  amountEl.value = amountRange.value;
});
monthsRange.addEventListener("input", function () {
  monthsEl.value = monthsRange.value;
});

function show(type, text) {
  msg.className = "msg " + type;
  msg.textContent = text;
}

// BUG 8: prints "1234.50 RON" — dot as decimal separator, no thousands grouping.
// The rest of the site uses the Romanian format ("2.500,00 RON").
function money(n) {
  return n.toFixed(2) + " RON";
}

function addLogEntry(text) {
  var empty = logList.querySelector(".empty");
  if (empty) empty.remove();
  var li = document.createElement("li");
  li.textContent = text;
  logList.appendChild(li);
}

form.addEventListener("submit", function (e) {
  e.preventDefault();

  var P = parseFloat(amountEl.value);
  var n = parseInt(monthsEl.value, 10);
  var income = parseFloat(incomeEl.value);

  // BUG 3: only checks for a number — no min (1.000), no max (150.000),
  // no positive-value check. -5000 and 9999999 both go through.
  if (isNaN(P)) { show("error", "Introdu suma creditului."); return; }

  // BUG 4: no check that n > 0. Entering 0 luni divides by zero below.
  if (isNaN(n)) { show("error", "Introdu perioada."); return; }

  // BUG 5: venitul nu este validat deloc — gol / 0 / negativ trec toate.

  // BUG 1: RATE is the ANNUAL rate. The monthly rate should be RATE/100/12.
  // Here the annual percentage is used directly as the monthly rate, so the
  // installment comes out roughly 3x too high.
  var i = RATE / 100;

  var insuranceMonthly = insuranceEl.checked ? P * 0.0035 : 0;

  var rata = P * i / (1 - Math.pow(1 + i, -n));

  // BUG 9: insuranceMonthly is displayed further down but is never added into
  // the installment — ticking "asigurare de viață" changes nothing in "Rată lunară".
  var rataAfisata = rata;

  // BUG 7: "Total de plată" is computed with a completely different (simple-
  // interest, term-independent) formula, so it does not equal rata * n.
  var total = P * (1 + RATE / 100);

  // BUG 10: DAE is shown equal to the nominal rate. The real DAE has to fold in
  // the 1% analysis commission (and insurance, if selected), so it must be higher.
  var dae = RATE;

  // BUG 8 (continued): dobânda is concatenated raw — floating-point noise like
  // "1897.6800000000003 RON" shows up unformatted.
  var dobanda = total - P;

  rataOut.textContent = money(rataAfisata);
  daeOut.textContent = dae + "%";
  totalOut.textContent = money(total);
  dobandaOut.textContent = dobanda + " RON";
  insOut.textContent = money(insuranceMonthly);
  comOut.textContent = money(P * COMMISSION);

  // BUG 5 (continued): income 0 / empty -> ratio is Infinity or NaN and gets
  // printed straight into the sentence ("Rata reprezintă NaN% din venitul tău").
  // BUG 6: the affordability gate fires only when the rate exceeds 100% of income.
  // The regulated limit is around 40% — a rate at 90% of income shows "Ești eligibil".
  var ratio = rataAfisata / income * 100;
  dtiLine.textContent = "Rata reprezintă " + ratio.toFixed(1) + "% din venitul tău. ";
  if (ratio > 100) {
    dtiLine.className = "dti bad";
    dtiLine.textContent += "Nu ești eligibil.";
  } else {
    dtiLine.className = "dti ok";
    dtiLine.textContent += "Ești eligibil.";
  }

  // BUG 13: nothing here (or anywhere) clears or flags this result panel when
  // the user later edits the amount / period. The stale numbers just stay on
  // screen next to the new inputs, with no "recalculează" hint.

  // BUG 14: the button is never disabled and there is no in-flight guard, so
  // rapid clicks add one "Simulări efectuate" row per click.
  addLogEntry(new Date().toLocaleTimeString("ro-RO") + " — " + P + " RON / " + n + " luni");
  show("success", "Simulare efectuată.");
});
