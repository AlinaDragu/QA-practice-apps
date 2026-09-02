# Bill-payment page — bug key (spoilers)

> Don't read this before testing. Test the page first, write your bug reports, *then* compare.

Context: a bill / utilities payment page for "Meridian Bank". You are "logged in"
with a current account of **4.200,00 RON** and one card on file
(**4539 8842 1100 4821**). Five outstanding invoices are listed; you click one,
a payment panel opens with the amount pre-filled, and you press **Plătește acum**.
You can also tick **Programează plata** (pick a date), tick **Plată recurentă
lunară**, and there is a **Rulează plățile programate scadente** button that
simulates the scheduler running.

No backend — a committed payment updates the balance in the code, removes the
invoice from the list, and adds a row to "Plăți efectuate".

The "current moment" is pinned to **Wednesday, 2 September 2026, 14:30**. The
invoices:

| Factură | Furnizor | Scadență | Sumă |
|---------|----------|----------|------|
| DG-5567 | Digi — Internet & TV | 2026-09-02 (**azi**, o miercuri) | 120,00 |
| GZ-8823 | Engie România — Gaze naturale | 2026-08-26 (restantă, 7 zile) | 176,00 |
| VF-2231 | Vodafone — Telefonie mobilă | 2026-08-29 (o **sâmbătă**, restantă) | 49,99 |
| EN-4471 | Enel Energie — Electricitate | 2026-09-11 (viitoare) | 214,50 |
| AP-1290 | Apa Nova — Apă-canal | 2026-09-20 (viitoare) | 92,30 |

Penalty rule advertised implicitly by the panel: **5%** of the invoice, applied
after a **3-day** grace period.

## Planted bugs (16)

| # | Category | Bug | Where to find it | How to reproduce |
|---|----------|-----|------------------|------------------|
| 1 | Functional / calc | The late-payment penalty is shown in "Total de plată" but never actually charged | Payment panel (Engie or Vodafone) vs. the balance / history row | Open **Engie România** (7 days late). Panel shows `Factură 176,00` + `Penalitate întârziere 8,80` + `Total de plată 184,80 RON`. Pay it → the history row says `176,00 RON` and the account drops by `176,00`, not `184,80`. The penalty is a display-only number. Same on the Vodafone invoice (`2,50` penalty shown, not taken). |
| 2 | Data integrity | The "Total de plată (N facturi)" summary header is not recalculated after a payment | Grey summary box at the top | Note the header: `5 facturi · 652,79 RON · 3 restante`. Pay any invoice → it disappears from the list immediately, but the header still says `5 facturi · 652,79 RON · 3 restante`. The list and its own summary, on the same screen, now disagree. Running the scheduler has the same effect. |
| 3 | Functional / data integrity | A partial payment clears the whole invoice | Payment panel → invoice list | Open **Enel Energie** (`214,50`). Change the amount to `50` and pay. "Plată efectuată: 50,00 RON" is logged — and the Enel invoice vanishes from "Facturi de plată" entirely. The remaining `164,50` is simply gone; there is no "Rest de plată" on the invoice. |
| 4 | Validation / boundary | No account-balance check | Any payment above 4.200 RON | Open **Apa Nova**, set the amount to `999999` and pay → "Plată efectuată" is shown, the payment is logged, and the internal balance goes to roughly `-995.849`. Nothing blocks or warns about insufficient funds. |
| 5 | Validation / boundary | Zero and negative amounts are accepted | Sumă de plată field | Enter `0` → "Plată efectuată: 0,00 RON" is logged. Enter `-100` → "Plată efectuată: -100,00 RON", and the **account balance goes up** by 100. Only a non-numeric amount is rejected. |
| 6 | Validation / parsing | The amount is a text field read with `parseFloat` and no normalisation | Sumă de plată field | On the Enel invoice, clear the field and type `214,50` the Romanian way → the payment goes through as **214,00** (the `,50` is dropped). Type `1.200` → read as **1,2**. Type `abc` → "Sumă invalidă" (the only input that is actually rejected). |
| 7 | Validation / boundary | You can pay far more than the invoice, with no cap or warning | Sumă de plată field | Open **Enel** (`214,50`), enter `5000`, pay → `5000,00 RON` leaves the account against a `214,50` bill. No "suma depășește factura" message, no overpayment / credit-note handling. |
| 8 | Validation / date | A scheduled payment accepts a date in the past (or no date at all) | Programează plata → Data plății | Tick **Programează plata**, set the date to `2026-08-01` (over a month ago), pay → it is accepted and listed under "Plăți programate" with that past date; the next scheduler run fires it. The `<input type="date">` has no `min`. Also: tick "Programează plata" but leave the date empty → it is scheduled "fără dată" and then never runs — it is stuck silently forever. |
| 9 | Functional | A scheduled payment cannot be edited or cancelled | "Plăți programate" list | Schedule a payment. The row in "Plăți programate" has no cancel button, no edit control, nothing. Once created, the instruction to move money on a future date cannot be stopped from this screen. |
| 10 | Functional / date (BVA) | The "restantă" flag and the "restante" counter are off by one at the day boundary, and weekends are not handled | Invoice badges + summary "N restante" | The **Digi** invoice is due **today** (2026-09-02) yet already shows a red `Restantă · 1 zi(le) întârziere` badge and is counted in "3 restante" (only Engie and Vodafone are genuinely late). The overdue check subtracts a midnight due-date from a `NOW` that carries the time of day, so any bill becomes "1 day late" from 00:00:01 on its due date. Separately, **Vodafone** is due on a **Saturday** (2026-08-29): the page shows the raw calendar date and counts calendar days (`5 zile`), with no notion of the payment being collectible only on the next business day — so the day count, the 3-day grace boundary, and therefore the penalty can all be wrong for any weekend/holiday due date. |
| 11 | Security | Double-submit / no idempotency | "Plătește acum" (and "Programează plata") | Open an invoice, fill a valid amount, click the button 3× fast → 3 rows in "Plăți efectuate" and the account debited 3× for one bill. The button is never disabled and there is no in-flight guard. The scheduled path is the same: 3 fast clicks = 3 identical scheduled payments. |
| 12 | Functional / idempotency | "Rulează plățile programate scadente" is not idempotent, and the recurring flag does nothing | Scheduler button + "Plată recurentă lunară" | Schedule a due payment, press **Rulează plățile programate scadente** → it pays (1 history row). Press it **again** → it pays the same scheduled item a second time; the scheduler never marks entries as processed. Also: tick "Plată recurentă lunară" when scheduling → after the run, no next-month occurrence is ever created. The "recurentă" label is cosmetic. |
| 13 | Security | "Referință plată" is rendered as HTML | Referință field → confirmation message + history row | Type `<b>test</b>` in Referință and pay → it renders as bold text in the green confirmation line and in the history row. Type `<img src=x onerror="alert(1)">` → the handler runs. The field goes into `innerHTML` unescaped (HTML / script injection). |
| 14 | Security | The full card number is shown in clear everywhere | Subtitle, payment panel, confirmation message, every history row | The page prints `4539 8842 1100 4821` in the header subtitle, in "Se plătește cu cardul …", in the success message, and in every "Plăți efectuate" row. A card number (PAN) should be masked to the last 4 digits (`•••• 4821`) anywhere it is displayed. |
| 15 | Accessibility | Non-focusable controls, broken label association | Invoice rows, "Plătește" affordance, panel close, "Sumă de plată" label | The clickable invoice body is a bare `<div>` and the "Plătește" text is a `<span>` — neither is a `<button>`, neither has `role`/`tabindex`, so there is no keyboard way to open a payment panel. The panel's `×` close is also a `<span>`. The `<label for="sumaPlata">` points to an id that does not exist (the input's id is `amountInput`), so clicking the label doesn't focus the field and a screen reader doesn't announce it. |
| 16 | UI / GUI (responsive) | Layout breaks at narrow widths; recorded rows are clipped | Invoice list + history / scheduled lists | Resize to ≈375px. The "furnizor · tip" text is `white-space: nowrap` on a flex item with no `min-width: 0`, so a longer name (e.g. "Engie România · Gaze naturale") pushes the row wider than the card — the amount and "Plătește" are shoved off the right edge and clipped by the card border. The "Plăți efectuate" / "Plăți programate" rows are `nowrap; overflow: hidden`, so any row with a reference note or the (long, unmasked) card string is cut off mid-text. |

## Reasoning-trap note

**Bug 1 is this round's "I assumed it was intentional" trap** — and it is a
deliberate re-run of the currency-exchange bug where the 0,5% commission was
displayed but never charged (that one was missed). It is tempting to think "maybe
Meridian waives the penalty" or "the penalty is probably billed separately next
month". No: a number printed in the payment summary as part of **"Total de plată:
184,80"** that is not the number that leaves the account is a defect. **Report the
mismatch between what the panel totals and what the account is debited. Don't
pre-excuse it** — let the product owner say whether the penalty is meant to be
charged here.

The habit to build: **when a page states a fee, a penalty, a total, or a
"balance after" — verify it against your own manual calculation.** Poking the
input fields is not enough; the quietly-wrong number that never throws an error
is the one that reaches production.

Softer versions of the same trap in this page:

- **Bug 2** ("there's probably a settlement delay, the total refreshes overnight")
  — no. The invoice list updated instantly on the same screen; the header is
  inconsistent with what is in front of you right now, not with some backend.
- **Bug 10** ("the bill *is* due today, calling it "restantă" is close enough")
  — "scadent astăzi" and "restantă, 1 zi întârziere + penalitate" are different
  states with different money attached. Off by one at a date boundary is a
  classic bug, not a rounding of language.

## Suggested test-category checklist for this page

- Functional / calc: for each invoice, add up `Factură + Penalitate` yourself and
  compare to "Total de plată", to the debit, and to the history row; re-check the
  summary header after every payment; partial payment → what happens to the rest
  of the invoice
- Validation / boundary: amount `0` / negative / non-numeric / `214,50` / `1.200`
  / empty; amount above the balance; amount above the invoice
- Date / scheduling: schedule for a past date, for today, for a weekend; schedule
  with no date; edit or cancel a scheduled payment; run the scheduler twice; does
  "recurentă" actually recur
- State / idempotency: click "Plătește" repeatedly; run "plăți programate"
  repeatedly; pay the same invoice twice
- Security: reference field treated as data, not markup; full card number / PAN
  exposure in the UI and in recorded history; balance allowed to go negative
- Accessibility: operate the whole flow with the keyboard only (can you even open
  a payment panel?); click each label to focus its field; close the panel without
  a mouse
- UI / GUI: layout at 375–414px width every time; long provider names; long
  reference notes; many history rows; a large or negative balance in the header

## Notes / rejected false positives

- "Plăți efectuate" / "Plăți programate" not surviving a page reload is expected — there is no backend.
- The pinned date (2 Sep 2026, 14:30), the fixed penalty rate/grace period, and the fixed invoice list are test-harness constants, not the bug.
- The money format being `1234,56` (decimal comma, no thousands separator) is plain but **consistent** across this page — noted, but not one of the 16. Compare with the exchange app, where the same style *was* a bug because it clashed with the page's own subtitle.
- Provider names being plain text with no logos is not a bug.
- The native `<input type="date">` picker looking different per browser/OS is not a bug.
- There being no "ești sigur?" confirmation step before paying is a UX gap you may raise, but the planted security issue in that area is the double-submit (bug 11), not the missing modal.
- The reference field keeping its value after a payment (so the next payment reuses it) is a real minor bug if you spot it — it was not deliberately planted, count it as a bonus find.
