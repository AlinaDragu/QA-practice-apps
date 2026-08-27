# Login page — bug key (spoilers)

> Don't read this before testing. Test the page first, write your bug reports, *then* compare.

Demo account: `client@meridian.ro` / `Parola123`

## Planted bugs (9)

| # | Category | Bug | Where to find it | How to reproduce |
|---|----------|-----|------------------|------------------|
| 1 | Functional | Empty-field error messages are inverted | Submit with fields empty | Leave email empty, submit → "Parola introdusă este greșită". Leave password empty, submit → "Adresa de email este obligatorie". Each message names the *other* field. |
| 2 | Functional | Wrong password reported as "Cont inexistent" | Valid email + wrong password | Enter `client@meridian.ro` + any wrong password → "Cont inexistent." The account exists; the message should say the password is wrong. Unknown email and wrong password are indistinguishable. |
| 3 | Functional | "Ai uitat parola?" link is dead | Link under the password field | Click it → nothing happens (handler calls `preventDefault` and returns). |
| 4 | Security | Authentication bypass via SQL-injection-style input | Email field | Enter `client@meridian.ro'--` (or anything containing `'--`, or `x' or 1=1`) with any/no password → "Autentificare reușită". Input is pattern-matched instead of being treated as data. |
| 5 | Accessibility / UX | Broken keyboard tab order | Tab through the form | From the email field, Tab jumps straight to the "Autentificare" button, skipping the password field (hard-coded `tabindex` values: email=1, button=2, password=3). |
| 6 | Functional / Security | Double-submit not prevented | Submit button during "Se verifică..." | Click submit rapidly several times → multiple login attempts fire; the button is never disabled and there is no in-flight guard. |
| 7 | Security | Password field is not masked | Password input | Characters typed into "Parolă" show as plain text (`type="text"` instead of `type="password"`). Also defeats password-manager behavior. |
| 8 | UI / GUI | Heading and subtitle overlap | Top of the card | "Bine ai revenit" and "Autentifică-te în contul tău Meridian" render on top of each other (subtitle has `margin-top: -22px`). |
| 9 | Accessibility | Labels not associated with inputs | Both fields | Clicking the "Adresă de email" or "Parolă" label text does not focus the field — labels have no `for` and inputs have no matching `id` pairing used by the label. Screen readers won't announce the label with the field. |

## Suggested test-category checklist for this page

- Functional: valid login, invalid email, wrong password, empty fields, whitespace handling
- Boundary / negative: very long input, special characters, leading/trailing spaces
- Security: input treated as data (injection), password masking, no credential leak in messages, brute-force / rapid-submit protection
- Accessibility: keyboard-only navigation, tab order, label association, focus visibility
- UI / GUI: layout at multiple widths, overlapping elements, contrast

## Notes / rejected false positives

- Leading whitespace in `<input type="email">` is trimmed natively by the browser on submit — **not** a bug.
