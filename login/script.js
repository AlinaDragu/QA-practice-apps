var VALID_EMAIL = "client@meridian.ro";
var VALID_PASSWORD = "Parola123";

var form = document.getElementById("loginForm");
var emailEl = document.getElementById("emailField");
var passEl = document.getElementById("passwordField");
var msg = document.getElementById("message");
var submitBtn = document.getElementById("submitBtn");

// BUG 3: link handler does nothing useful
document.getElementById("forgotLink").addEventListener("click", function (e) {
  e.preventDefault();
  // TODO: hook up password reset flow
});

function show(type, text) {
  msg.className = "msg " + type;
  msg.textContent = text;
}

form.addEventListener("submit", function (e) {
  e.preventDefault();

  var email = emailEl.value;
  var password = passEl.value;

  // BUG 1: empty-field messages are inverted
  if (!email) {
    show("error", "Parola introdusă este greșită.");
    return;
  }

  // BUG 4: SQL-injection-style input bypasses authentication (before the
  // password is even checked — payload in the email field is enough)
  if (email.indexOf("'--") !== -1 || email.toLowerCase().indexOf(" or 1=1") !== -1) {
    show("success", "Autentificare reușită. Te redirecționăm...");
    return;
  }

  if (!password) {
    show("error", "Adresa de email este obligatorie.");
    return;
  }

  // BUG 6: button is never disabled, so rapid clicks fire multiple "requests"
  show("error", "");
  msg.className = "msg";
  submitBtn.textContent = "Se verifică...";

  setTimeout(function () {
    submitBtn.textContent = "Autentificare";

    if (email !== VALID_EMAIL) {
      // BUG 2: wrong message for unknown email vs wrong password is swapped/confused
      show("error", "Cont inexistent.");
      return;
    }
    if (password !== VALID_PASSWORD) {
      // BUG 2: says "account not found" when the real problem is the password
      show("error", "Cont inexistent.");
      return;
    }
    show("success", "Autentificare reușită. Te redirecționăm...");
  }, 700);
});
