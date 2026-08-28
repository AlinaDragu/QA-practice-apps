var form = document.getElementById("regForm");
var nameEl = document.getElementById("nameField");
var emailEl = document.getElementById("emailField");
var email2El = document.getElementById("email2Field");
var passEl = document.getElementById("passField");
var pass2El = document.getElementById("pass2Field");
var cnpEl = document.getElementById("cnpField");
var dobEl = document.getElementById("dobField");
var phoneEl = document.getElementById("phoneField");
var countyEl = document.getElementById("countyField");
var termsEl = document.getElementById("terms");
var strengthEl = document.getElementById("strength");
var msg = document.getElementById("message");
var logList = document.getElementById("logList");

// BUG 3: strength meter reports "Puternică" for any non-empty password
passEl.addEventListener("input", function () {
  var p = passEl.value;
  if (!p) { strengthEl.textContent = ""; return; }
  strengthEl.className = "strength strong";
  strengthEl.textContent = "Putere parolă: Puternică";
});

// BUG 13 (reasoning trap): phone field auto-formats as you type and SILENTLY
// truncates anything past 10 digits — no warning, no validation message.
phoneEl.addEventListener("input", function () {
  var d = phoneEl.value.replace(/\D/g, "").slice(0, 10);
  var out = d;
  if (d.length > 7) out = d.slice(0, 4) + " " + d.slice(4, 7) + " " + d.slice(7);
  else if (d.length > 4) out = d.slice(0, 4) + " " + d.slice(4);
  phoneEl.value = out;
});

// BUG 14: terms & conditions link is dead
document.getElementById("termsLink").addEventListener("click", function (e) {
  e.preventDefault();
  return false;
});

function show(type, text) {
  msg.className = "msg " + type;
  msg.textContent = text;
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

  var name = nameEl.value.trim();
  var email = emailEl.value.trim();
  var email2 = email2El.value.trim();
  var pass = passEl.value;
  var pass2 = pass2El.value;
  var cnp = cnpEl.value.trim();
  var dob = dobEl.value;

  if (!name) { show("error", "Introdu numele complet."); return; }

  // BUG 1: only checks non-empty — no "@" / format check at all
  if (!email) { show("error", "Introdu adresa de email."); return; }

  // BUG 2: the "confirmă email" field is never compared to the first one

  if (!pass) { show("error", "Introdu o parolă."); return; }

  // BUG 5: "match" check compares only the LENGTH of the two passwords
  if (pass.length !== pass2.length) {
    show("error", "Parolele nu coincid.");
    return;
  }

  // BUG 6: only checks non-empty — no 13-digit / numeric check
  if (!cnp) { show("error", "Introdu CNP-ul."); return; }

  // BUG 7: date of birth is not validated for minimum age or future dates
  if (!dob) { show("error", "Introdu data nașterii."); return; }

  if (!termsEl.checked) {
    show("error", "Trebuie să accepți termenii și condițiile.");
    return;
  }

  // BUG 11: button is never disabled and there is no in-flight guard —
  // rapid clicks create multiple accounts
  show("success", "Cont creat pentru " + email + ".");
  addLogEntry(new Date().toLocaleTimeString("ro-RO") + " — " + name + " <" + email + "> · jud. " + countyEl.value);
});
