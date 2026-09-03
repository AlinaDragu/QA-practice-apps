# Term-deposit page — bug key (spoilers)

> Don't read this before testing. Test the page first, write your bug reports, *then* compare.

Context: a term-deposit ("depozit la termen") page for "Meridian Bank". You are
"logged in" with a current account of **25.000,00 RON** (IBAN
**RO49 MERI 1B31 0075 9384 0000**). You can:

- **Open a new deposit** — type an amount, pick a term (1 / 3 / 6 / 12 luni),
  optionally a name and "reînnoire automată", read the interest preview, press
  **Deschide depozit**.
- **See your deposits** — three already exist; each has a **Lichidează anticipat**
  link that opens an early-exit panel.
- **Rulează scadențele** — a button that simulates the maturity batch job
  (pays out matured deposits, rolls over the auto-renew ones).

No backend — everything updates the in-page state and adds rows to "Istoric".

The "current moment" is pinned to **Thursday, 3 September 2026, 10:00** and the
page prints it as *"Azi: joi, 3 septembrie 2026"*. The existing deposits:

| ID | Denumire | Sumă | Termen | Dobândă | Deschis | Scadent | Reînnoire auto |
|----|----------|------|--------|---------|---------|---------|----------------|
| D-1001 | Fond urgențe | 12.000,00 | 12 luni | 6,00% p.a. | 2025-09-01 | **2026-09-01** (mar., acum 2 zile) | **DA** |
| D-1002 | Vacanță | 5.000,00 | 3 luni | 3,00% p.a. | 2026-05-29 | **2026-08-29** (o **sâmbătă**, scadent) | NU |
| D-1003 | *(fără denumire)* | 8.000,00 | 6 luni | 4,00% p.a. | 2026-08-18 | 2027-02-18 (viitoare) | NU |

Rules the page implies:

- **Dobânzi curente** (shown on the page): 1 lună **2,00%**, 3 luni **3,00%**,
  6 luni **4,00%**, 12 luni **4,50%** — annual (p.a.).
- **Impozit pe dobândă: 10%**, reținut la sursă (shown in the preview).
- **Lichidare anticipată:** interest recalculated at the penalty rate
  **0,25% p.a.** for the elapsed days (shown in the early-exit panel).
- Simple interest for the term: `sumă × rată_anuală × luni / 12`.

## Planted bugs (15 + 1 retracted)

> **Correction (2026-09-03):** bug 14 below was originally listed as a security
> defect. It isn't a strong one and it's retracted — showing a customer **their
> own** IBAN in full, while they are logged into their own account, is normal
> production behaviour (BT, ING, BCR, Revolut all do it — you need it to receive
> money). A **card PAN** must be masked (PCI-DSS); an IBAN has no such rule. So
> this board is really **15 planted bugs**; bug 14 is kept in the table, renamed,
> as a minor UX note. Know which identifiers are regulated (card PAN, CVV) versus
> which are not (your own IBAN).

| # | Category | Bug | Where to find it | How to reproduce |
|---|----------|-----|------------------|------------------|
| 1 | Functional / calc | The 10% withholding tax is shown in the preview but never actually withheld — and the preview's own "Valoare la scadență" ignores it | Preview box + the credit at maturity | Type `10000`, term `6 luni`. Preview: `Dobândă brută 200,00` · `Impozit pe dobândă (10%) -20,00` · `Dobândă netă 180,00` · **`Valoare la scadență 10.200,00`**. `10.000 + 180 = 10.180`, not `10.200` — the total line uses the gross figure. Then press **Rulează scadențele**: D-1002 (5.000 @ 3%, 3 luni) pays out **5.037,50** (= 5.000 + full 37,50 gross), not `5.033,75`; D-1001's renewal interest credits **720,00**, not `648,00`. The "Impozit" line is decorative. |
| 2 | Functional / state | Changing the term does not recalculate the preview | Term chips ↔ preview box | Type `10000`, term `6 luni` → preview shows `Valoare la scadență 10.200,00`, `Data scadenței 2027-03-03`. Click **`3 luni`** → the "Dobândă … pe an" label flips to `3,00%` but the gross, the net, the maturity value and the maturity date **stay on the 6-month numbers**. They only refresh if you edit the amount again. Press **Deschide depozit** anyway and the green confirmation shows a *different* "Valoare la scadență" than the preview did (it recomputes from the real term) — the figure next to the button was wrong. |
| 3 | Security | No confirmation step and no step-up authentication for opening or breaking a deposit | **Deschide depozit** / **Confirmă lichidarea anticipată** | Opening a deposit locks money for months; an early liquidation is penalised and irreversible. Both happen on a **single click** — no "ești sigur?" review, no OTP / password / 3-D-Secure-style step-up, nothing. A high-value, hard-to-reverse operation on a savings product should be gated. (Distinct from bug 12: the fix here is a confirm + re-auth, not disabling the button.) |
| 4 | Validation / parsing | The amount is a text field read with `parseFloat` and no normalisation | Sumă (RON) field | Type `10.000` the Romanian way → the deposit opens for **10,00 RON**. Type `5000,50` → opens for **5.000,00** (the `,50` is dropped). `1.500` → `1,5`. Only a non-numeric value is rejected. |
| 5 | Validation / boundary | The advertised 1.000 / 100.000 RON limits are not enforced anywhere | Sumă (RON) field + hint | The hint says "Sumă minimă 1.000 RON · maximă 100.000 RON". Open a deposit for `50` → accepted ("Depozit deschis … 50,00 RON"). Open one for `9000000` → accepted. There is no `min`/`max` and no range check in code — the limit is text only. |
| 6 | Validation / boundary | No account-balance check | Any deposit above 25.000 RON | Open a deposit for `999999` → "Depozit deschis" is shown, the deposit is created, and the header balance goes to `-972.049,00 RON`. Nothing blocks or warns about insufficient funds. |
| 7 | Validation / boundary | Zero and negative amounts are accepted | Sumă (RON) field | Enter `0` → a `0,00 RON` deposit is opened. Enter `-3000` → a `-3.000,00 RON` deposit is opened **and the current-account balance goes up by 3.000**. Only a non-numeric amount is rejected. |
| 8 | Functional / date | Maturity dates are never rolled off weekends; interest is counted in raw calendar days | Existing D-1002 + any new 1-month deposit | D-1002 matures **2026-08-29 — a Saturday** — and the page shows that exact date as the value date and pays it as-is; a real deposit would mature / pay the next business day (Mon 31 Aug), which changes the accrued days and the amount. Open a new **`1 lună`** deposit "today" (2026-09-03) → "Data scadenței" is **2026-10-03**, also a **Saturday**, with no adjustment. |
| 9 | Functional / idempotency | "Rulează scadențele" is not idempotent — it re-pays matured deposits every time it runs | Scadențe button + Istoric | Press **Rulează scadențele** → D-1002 pays out `+5.037,50`, D-1001 rolls over. Press it **again** → D-1002 pays out `+5.037,50` **a second time** (and again on every further press). Matured deposits are never marked "processed" or removed. The batch has no idempotency key / run marker. |
| 10 | Functional / transparency | Auto-renewal rolls the deposit over silently and at the old rate | D-1001 after **Rulează scadențele** | D-1001 has "reînnoire automată". Run the scheduler → it rolls into a new 12-month deposit **still at 6,00% p.a.**, even though "Dobânzi curente" on the same page now says 12 luni = **4,50%**. There is no advance notice and no window to opt out before it rolls. A renewal at a changed rate must be re-disclosed. (Which direction the rate moved is not the point — the customer is given no choice and no correct number.) |
| 11 | Functional / calc | The early-liquidation penalty is shown in the panel but never applied | Lichidează anticipat → payout | Open **D-1003** (8.000 @ 4%, opened 2026-08-18). The panel: `Zile scurse 16` · `Dobândă recalculată (penalizare, 0,25% p.a.) 0,88` · **`Vei primi 8.000,88 RON`**. Press **Confirmă lichidarea anticipată** → the account is actually credited **8.160,00 RON** (= 8.000 + the *full* 6-month contract interest of 160,00). The penalty rate is ignored and the full contract interest is paid on a deposit held 16 days. |
| 12 | Security | Double-submit / no idempotency on "Deschide depozit" | Deschide depozit button | Fill a valid amount and click the button 3× fast → 3 identical deposits are opened and the account is debited 3×. The button is never disabled and there is no in-flight guard. |
| 13 | Security | "Denumire" is rendered as HTML | Denumire field → deposits list, confirmation message, Istoric | Set Denumire to `<b>test</b>` and open a deposit → it renders as bold text in the deposits list, the green message and the history row. Set it to `<img src=x onerror="alert(1)">` → the handler runs. The field goes into `innerHTML` unescaped (HTML / script injection). |
| 14 | ~~Security~~ → UX note (retracted) | The IBAN is repeated on every row with no copy control | Header subtitle, "Fondurile se transferă…", every deposit row, every history row | `RO49 MERI 1B31 0075 9384 0000` is printed in full in ~6 places, including every list row. Showing the customer **their own** IBAN in full is *not* a defect — this is normal. The only fair observation is UX: it's redundant clutter on every row, and there's no "copy IBAN" affordance. **Not a security finding.** (A card PAN in the same spots *would* be one — PCI-DSS. So would another customer's IBAN, or a CNP, showing where it isn't needed — GDPR data minimisation.) |
| 15 | Accessibility | Term selector and "Lichidează anticipat" are non-focusable; a label points nowhere | Termen chips, Lichidează anticipat link, "Sumă (RON)" label | The four term options are `<span class="chip">` — not radio buttons, not `<button>`, no `role`, no `tabindex` — so with the keyboard you **cannot change the term at all** (you are stuck on the default "6 luni"). "Lichidează anticipat" is also a `<span>`, so the early-exit panel can't be opened without a mouse. And `<label for="sumaDepozit">` points to an id that doesn't exist (the input's id is `amountInput`) — clicking the label focuses nothing and a screen reader doesn't announce it. |
| 16 | UI / GUI (responsive) | Layout breaks at narrow widths; values are pushed off-screen | "Dobânzi curente" table + "Depozitele mele" rows | Resize to ≈375px. The 4-cell "Dobânzi curente" row is `nowrap` with no scroll container, so the "12 luni / 4,50%" cell is cut off past the card edge and the page scrolls sideways. Each deposit row has `white-space: nowrap` text (the long IBAN line, long denumiri) and no `min-width: 0`, so the maturity amount and the "Lichidează anticipat" link are shoved off the right edge and clipped by the card. |

## Reasoning-trap note

**Bugs 1 and 11 are a matched pair, and this round's "I assumed it was
intentional" trap.** Both show a reduction in the UI — a tax, a penalty — that
never actually happens, and both leave the customer with *more* money than the
screen said, which is exactly why they're tempting to wave away ("nice, Meridian
must absorb the tax", "maybe they waive the penalty for small amounts"). They are
a deliberate third run of the same trap:

- exchange app — the **0,5% commission** was displayed but never charged *(missed)*
- bills app — the **late penalty** was in "Total de plată" but never debited *(missed)*
- here — the **10% tax** (bug 1) and the **early-exit penalty** (bug 11)

**The habit to build: whenever the page states a fee, a tax, a penalty, a total
or a "vei primi / valoare la scadență", compute it yourself and compare it to the
number that actually moves.** For this page that means: pick one deposit, do the
`sumă × rată × luni/12`, take off 10%, and check it against the preview total,
against the credit at maturity, and against the "Vei primi" in the early-exit
panel. Poking the input fields is not enough — the quietly-wrong number that
never throws is the one that reaches production.

**Bug 2 is the stale-preview trap** (payment app, exchange bug 9, rebuilt again):
a figure shown right next to the confirm button that silently stops matching the
inputs. Report the mismatch you observe — don't pre-excuse it as "it'll refresh
when I submit."

Softer versions on this page:

- **Bug 8** ("the deposit *is* due that day, Saturday or not") — "matures
  Saturday" and "matures Monday" are different accrual periods and different
  amounts. A value date landing on a weekend with no adjustment is a finding, not
  a rounding of language.
- **Bug 10** ("it renewed, that's what auto-renew means") — a rollover with no
  notice, no opt-out window and a rate that doesn't match the page's own rate
  table is a transparency defect, whichever way the rate moved.

## Suggested test-category checklist for this page

- **Functional / calc (do this first, on paper):** for one deposit, compute
  gross interest, the 10% tax, the net, and the maturity value yourself; compare
  to the preview total, the maturity credit, and the early-exit "Vei primi";
  re-check after the scheduler runs; check the renewed deposit's rate against
  "Dobânzi curente"
- **Cross-field / state:** change the amount, then the term — does the preview
  keep up? does the figure next to the button match what you actually get?
- **Validation / boundary:** amount `0` / negative / non-numeric / `10.000` /
  `5000,50`; below 1.000; above 100.000; above the 25.000 balance
- **Date:** what day of the week does each term's maturity fall on? what about the
  existing deposits? is a weekend rolled forward?
- **Idempotency / state:** click "Deschide depozit" repeatedly; run "Rulează
  scadențele" twice, three times; liquidate then re-open
- **Security:** denumire treated as data, not markup; balance allowed to go
  negative; is a confirm / step-up asked for a large or irreversible move; *which*
  identifiers on screen are actually regulated (card PAN / CVV → mask; your own
  IBAN → fine) — don't reflexively call every visible number a leak
- **Accessibility:** operate the whole flow with the keyboard only — can you even
  change the term? open the early-exit panel? click each label to focus its field
- **UI / GUI:** layout at 375–414px width every time; long denumiri; a large or
  negative balance in the header; many history rows

## Notes / rejected false positives

- "Depozitele mele" / "Istoric" not surviving a page reload is expected — there is no backend.
- The pinned date (3 Sep 2026, 10:00), the fixed rate table, the fixed tax rate,
  the fixed penalty rate and the fixed starting deposits are test-harness
  constants, not bugs.
- Simple (not compounded) interest and the `luni / 12` proration are a
  deliberate simplification — the bug is that the tax/penalty shown isn't
  applied (bugs 1, 11), not the interest model itself.
- The money format `10.000,00` (decimal comma, thousands dot) is used
  consistently across this page — unlike the exchange app, this is not a finding
  here.
- The native `<input type="date">` / `<select>` styling differing per browser/OS
  is not a bug (there is no date input on this page anyway).
- "Reînnoire automată" being a plain checkbox with no explanation of the terms is
  a UX nit you may raise; the planted issue in that area is the silent rollover
  at a stale rate (bug 10).
- The early-exit panel staying open with stale numbers after you liquidate is a
  real minor bug if you spot it — it was not deliberately planted, count it as a
  bonus find.
- The "Denumire" field keeping its value between deposits is likewise an
  unplanted minor bug — bonus if you catch it.
