# qa-practice-apps

Small, self-contained web pages built **with intentional bugs**, used as targets for
manual / exploratory QA practice.

Each app is a folder with separate `index.html`, `styles.css` and `script.js` —
no build step, no dependencies, no backend. Open `index.html` in a browser and test it.

## Apps

| App | File | Scenario | Bugs |
|-----|------|----------|------|
| Login | [`login/index.html`](login/index.html) | Bank login page ("Meridian Bank") | 9 planted |
| Payment / transfer | [`payment/index.html`](payment/index.html) | Bank transfer page ("Meridian Pay"), user already logged in, balance 2.500,00 RON | 10 planted + 2 bonus |
| Registration | [`register/index.html`](register/index.html) | New-customer sign-up form ("Meridian Bank"), lots of field validation | 14 planted |
| Loan simulator | [`loan/index.html`](loan/index.html) | Personal-loan calculator ("Meridian Bank"): amount/period sliders, rate & affordability math | 14 planted |
| Currency exchange | [`exchange/index.html`](exchange/index.html) | Multi-currency exchange ("Meridian Bank"), user logged in, balances 8.500,00 RON / 320,00 EUR / 150,00 USD | 14 planted |
| Bill payment | [`bills/index.html`](bills/index.html) | Bill / utilities payment ("Meridian Bank"), user logged in, balance 4.200,00 RON, 5 outstanding invoices, scheduling + a simulated scheduler | 16 planted |
| Term deposits | [`deposit/index.html`](deposit/index.html) | Term-deposit ("depozit la termen") page ("Meridian Bank"), user logged in, balance 25.000,00 RON, 3 existing deposits, interest/tax preview + early liquidation + a simulated maturity batch | 15 planted |
| Transactions / statement | [`transactions/index.html`](transactions/index.html) | Account transactions ("Meridian Bank"), user logged in, sold contabil 7.430,00 RON vs. sold disponibil, 14 lines incl. pending pre-authorisations, filters + CSV export + dispute + a monthly-statement batch | 18 planted |

"Meridian" is a made-up name — not real branding.

Each app has a `BUGS.md` next to it with the full spoiler key: every bug, its
category, where to find it, and how to reproduce it. The `BUGS.md` files also
include **bonus bugs** — real defects found during practice sessions that weren't
part of the original plant.

## How to use these

1. **Pick an app.** Don't open its `BUGS.md` yet.
2. **Write a test-category checklist first** (functional, boundary/negative,
   security basics, accessibility/keyboard, UI/GUI at multiple viewport widths),
   then test against it — instead of only free-exploring.
3. **Test the page** and write proper bug reports for what you find. For each bug:
   - Title
   - Steps to reproduce
   - Expected result vs. actual result
   - Severity / Priority
4. **Then open `BUGS.md`** and compare: which did you find independently, which
   needed a hint, which did you miss, and which category was the gap.

### Running

Just open the file:

```bash
open login/index.html
```

Or serve the folder (useful for consistent behaviour and mobile-width testing):

```bash
python3 -m http.server 8000
# then visit http://localhost:8000/login/  and  http://localhost:8000/payment/
```

## Bug categories covered

- **Functional** — wrong logic, wrong/misleading messages, dead controls
- **Validation / boundary** — missing input validation, negative/zero/over-limit values
- **Security basics** — input treated as code, unmasked sensitive fields, missing
  double-submit / idempotency protection, information leakage in error messages
- **Accessibility** — keyboard tab order, label ↔ input association, focus
- **UI / GUI** — overlapping elements, responsive layout breakage at narrow widths
- **Data integrity** — a displayed value disagreeing with the committed value

## Adding a new practice app

Create `<name>/index.html`, `<name>/styles.css`, `<name>/script.js` and
`<name>/BUGS.md`, add a row to the table above. Keep it dependency-free.
