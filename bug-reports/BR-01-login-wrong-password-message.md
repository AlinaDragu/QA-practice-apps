# BR-01 — Login: wrong password on an existing account shows "Cont inexistent."

| | |
|---|---|
| **App** | Login — [`login/index.html`](../login/index.html) |
| **Environment** | Brave (Chromium), macOS, desktop width |
| **Type** | Functional |
| **Severity** | Major |
| **Priority** | High |

## Preconditions

- The login page is open.
- The demo account exists: `client@meridian.ro` / `Parola123`.

## Steps to reproduce

1. In **Adresă de email**, type `client@meridian.ro`.
2. In **Parolă**, type a wrong password, e.g. `Parola999`.
3. Click **Autentificare**.

## Expected result

The login is refused with a message saying the password is wrong:
"Parola introdusă este greșită." ("The password you entered is wrong.")

## Actual result

The login is refused with **"Cont inexistent."** ("Account does not exist"),
although the account exists. An email with no account (e.g. `alt@meridian.ro`)
gets the same message, so the user cannot tell which field to correct.

## Notes

- If the product wants one generic message for both cases, so that nobody can
  find out which emails have an account, the expected result becomes a single
  message such as "Email sau parolă incorectă." To confirm with the PO. Either
  way, "Cont inexistent." for an existing account is wrong.
- Automated check: [`login.selenium.test.js`](../selenium-tests/login.selenium.test.js), TC3 (fails on this bug).
