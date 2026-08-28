# Deschide cont (registration) page — bug key (spoilers)

> Don't read this before testing. Test the page first, write your bug reports, *then* compare.

Context: a new-customer sign-up form for "Meridian Bank". No real backend — a
successful submit just adds a line to "Conturi create".

## Planted bugs (14)

| # | Category | Bug | Where to find it | How to reproduce |
|---|----------|-----|------------------|------------------|
| 1 | Functional / Validation | No email format validation | Adresă de email | Enter `abc`, `ion`, `@@`, a value with no `@` — anything non-empty is accepted. Field is also `type="text"`, so the browser gives no hint either. |
| 2 | Functional / Validation | "Confirmă adresa de email" is never checked | The two email fields | Type `a@b.ro` in the first, `zzz@zzz.ro` in the confirm field → submits fine. The confirm field has no effect at all. |
| 3 | Functional | Password strength meter always says "Puternică" | Under the Parolă field | Type a single character (`a`, `1`) → "Putere parolă: Puternică". Any non-empty password is rated strong; there is no real scoring. |
| 4 | Security | Parolă field is not masked | Parolă vs. Confirmă parola | Characters typed into "Parolă" show as plain text (`type="text"`). "Confirmă parola" *is* masked — so the behaviour is inconsistent between the two password fields. |
| 5 | Functional / Security | Password confirmation compares length only | Parolă + Confirmă parola | Enter `Parola123` (9 chars) and `wrongpass` (9 chars) → accepted as matching. Enter `Parola123` + `Parola12` (8) → "Parolele nu coincid". The check is `pass.length !== pass2.length`; the actual values are never compared. |
| 6 | Functional / Validation | No CNP format validation | CNP field | Enter `abc`, `1`, `000`, a 20-char string → accepted. No 13-digit length check, no digits-only check, no checksum. |
| 7 | Validation / Boundary | Date of birth not validated for age or future dates | Data nașterii | Enter a date making the applicant 10 years old, or a date in 2030 → account is created. No 18+ gate, no "date in the future" check. |
| 8 | Accessibility / UX | Broken keyboard tab order | Tab through the form | Hard-coded `tabindex`: Nume(1) → Parolă(2) → Confirmă parola(3) → CNP(4) → Data(5) → Telefon(6) → Județ(7) → button(8), and only *then* the two email fields (20, 21). Tabbing from "Nume complet" skips both email fields entirely on the way down. |
| 9 | Accessibility | "Telefon" label not linked to its input | Telefon label | The label's `for="telField"` points to an id that doesn't exist (the input's id is `phoneField`). Clicking the "Telefon" text doesn't focus the field; screen readers won't announce the label with it. |
| 10 | UI / GUI (responsive) | CNP / Data nașterii fields spill outside the card at narrow widths | The two-column row | Resize the browser to mobile width (≈375–414px). The row uses fixed `width: 150px` on each field instead of flexing, so the second field pushes past the right edge of the card. |
| 11 | Functional / Security | Double-submit not prevented (idempotency) | "Creează cont" button | Fill the form validly, click the button rapidly several times → one "Conturi create" entry per click. Button is never disabled; no in-flight guard. |
| 12 | Privacy / Compliance | Marketing-consent checkbox is pre-checked | "Vreau să primesc oferte..." checkbox | Load the page → the marketing opt-in is already ticked. Consent for marketing email should be opt-in (unchecked by default), not opt-out. |
| 13 | Functional | Phone auto-format silently truncates extra digits | Telefon field | Type `07221234567` (11 digits, e.g. a typo) → the field shows `0722 123 456`, silently dropping the last digit. No error, no warning. A user can submit a wrong phone number believing it is correct. |
| 14 | Functional | "termenii și condițiile" link is dead | Link in the terms row | Click it → nothing happens (handler calls `preventDefault` and returns). There is no way to actually read the terms before agreeing to them. |

## Reasoning-trap note

**Bug 13** is the deliberate "I assumed it was intentional" trap for this round.
The phone field *does* auto-format (`0722 123 456`), which looks like a helpful
feature — so it is tempting to see the truncation as "it just formats to the
standard 10-digit length" and not report it. It is a defect: input is silently
lost and the user gets no feedback that what they typed was too long / invalid.
**Rule: report the observed inconsistency first. Don't invent a reason it might
be intended — let whoever owns the product decide.**

Bug 12 (pre-checked marketing consent) is a softer version of the same trap —
easy to wave off as "sites do that," but pre-ticked consent is a real finding.

## Suggested test-category checklist for this page

- Functional: valid sign-up, each field empty, wrong/short values, error-message accuracy, dead controls
- Validation / boundary: email without `@`, CNP wrong length / letters, DOB in the future, DOB under 18, very long inputs
- Cross-field: email vs. confirm email, password vs. confirm password (try equal-length but different values)
- Security: password masking (both fields), input treated as data, double-submit / rapid click
- Privacy: default state of consent checkboxes, is there a way to read the terms
- Accessibility: keyboard-only navigation, tab order, label ↔ input association, focus visibility
- UI / GUI: layout at multiple viewport widths (test mobile width every time), fields staying inside the card

## Notes / rejected false positives

- `<input type="date">` renders differently across browsers — the native picker
  styling is not a bug.
- Județ defaulting to "Alba" (first option) is a normal `<select>` default, not a bug.
