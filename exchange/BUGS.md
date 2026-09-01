# Currency-exchange page — bug key (spoilers)

> Don't read this before testing. Test the page first, write your bug reports, *then* compare.

Context: a currency-exchange page for "Meridian Bank". You are "logged in" with a
multi-currency account: **8.500,00 RON**, **320,00 EUR**, **150,00 USD**. You pick
a sum, a source currency and a target currency, optionally a reference note, and
press **Schimbă acum**. No backend — a committed exchange updates the balances
shown at the top of the card and adds a row to "Schimburi efectuate".

Rates on load: **1 EUR = 4,9718 RON**, **1 USD = 4,5834 RON**. A **0,5% commission**
is advertised. The **↻ Reîmprospătează cursul** button changes the rate to
1 EUR = 5,0402 RON / 1 USD = 4,6513 RON.

## Planted bugs (14)

| # | Category | Bug | Where to find it | How to reproduce |
|---|----------|-----|------------------|------------------|
| 1 | Functional / calc | RON → foreign currency uses the wrong direction (multiplies instead of dividing) | "Vei primi" / "Curs folosit" | Exchange `100` RON → EUR. Shown: `497.18 EUR` and "Curs folosit: 1 RON = 4.9718 EUR". Correct is `100 / 4,9718 ≈ 20,11 EUR`. Same for RON → USD (`150` RON shows `687.51 USD`). The reverse direction (EUR → RON, USD → RON) is calculated correctly, so the bug is direction-dependent. |
| 2 | Functional / calc | Any pair without a RON leg produces `NaN` | "Vei primi", EUR ↔ USD | Set `100`, EUR → USD. "Vei primi" shows `NaN USD`, "Curs folosit" shows `1 EUR = NaN USD`. Press "Schimbă acum" → the USD balance badge becomes `NaN` and stays broken. Cross-currency conversion is never implemented. |
| 3 | Functional | The 0,5% commission is displayed but never charged | "Comision" vs. "Suma debitată" / "Vei primi" | Exchange `100` EUR → RON. "Comision" shows `0.50 EUR`, but "Suma debitată" is `100.00 EUR` (not 100,50) and "Vei primi" is the full un-reduced amount. The advertised fee changes nothing that actually moves. |
| 4 | Data integrity | "Sold sursă după schimb" subtracts the wrong currency | Results grid | Exchange `100` EUR → RON. "Sold sursă după schimb" shows `-177.18 EUR` — it subtracts the **received RON amount (497,18)** from the **EUR balance (320)**. It should show `320 − 100 = 220,00 EUR`. Two different currencies are subtracted from each other. |
| 5 | Validation / boundary | No balance check | Any exchange over the available amount | Exchange `50000` RON → EUR with only 8.500 RON. It goes through: success message, history row, and the RON badge drops to `-41500.00`. Nothing blocks or warns about insufficient funds. |
| 6 | Validation / boundary | Zero and negative amounts are accepted | Sumă field | Enter `0` → exchange confirmed and logged. Enter `-100` → "Schimb efectuat: -100.00 RON → -497.18 EUR", and the **source balance goes up** (8.600 RON) while the target drops. Only a non-numeric value is rejected. |
| 7 | Validation | Source and target may be the same currency | Currency dropdowns | Set RON → RON and exchange `100` → "Schimb efectuat: 100.00 RON → 100.00 RON" is logged (a pointless operation; the fee, which should make you lose money, is ignored — see bug 3). Set EUR → EUR → "Vei primi NaN" (falls into bug 2). Same-currency is neither blocked nor handled consistently. |
| 8 | Validation / parsing | Amount is a text field parsed with `parseFloat` and no normalisation | Sumă field | `1.500` (thousands dot, RON style) is read as **1,5**. `1500,50` (decimal comma, RON style) is read as **1500** — the `,50` is silently dropped. `abc` shows `NaN` in every result box. A Romanian user typing an amount the normal way gets a silently wrong number. |
| 9 | Data integrity | The preview doesn't follow the rate, and the commit uses the live rate anyway | "Vei primi" vs. rate line vs. history | Enter `100`, EUR → RON → "Vei primi 497.18 RON". Click **↻ Reîmprospătează cursul** → the rate line updates to `1 EUR = 5.0402 RON` but "Vei primi" still says `497.18 RON`. Press **Schimbă acum** → you actually receive `504.02 RON` (the new rate), with no "cursul s-a schimbat, verifică" prompt. The **⇅** swap button has the same flaw: it flips the two dropdowns but leaves the preview showing the old pair and old figure. |
| 10 | UI / Data integrity | Inconsistent money formatting; preview ≠ committed value | Result boxes, history list | Every result box prints `497.18 RON` — dot decimal, no thousands separator — while the page subtitle uses the Romanian `8.500,00 RON`. In the history list the amount is concatenated raw: exchanging `133,33` EUR → RON logs `662.8900940000001 RON`, while the "Vei primi" box for the same input showed `662.89 RON`. The number you saw and the number recorded disagree. |
| 11 | Security | Double-submit / no idempotency | "Schimbă acum" button | Fill a valid exchange and click the button 3× quickly → 3 rows in "Schimburi efectuate" and the balance debited 3×. The button is never disabled and there is no in-flight guard. |
| 12 | Security | "Referință" is rendered as HTML | Referință field → confirmation message + history row | Type `<b>test</b>` in Referință and exchange → it renders as bold text in the green confirmation line and in the history row. Type `<img src=x onerror="alert(1)">` → the handler runs. The field goes into `innerHTML` unescaped (HTML / script injection). |
| 13 | Accessibility | Broken label association, unlabelled selects, wrong input type | "Sumă de schimbat" label, both currency dropdowns | The "Sumă de schimbat" label has `for="suma"`, but the input's id is `amountField` — clicking the label doesn't focus the field and screen readers don't announce it. Neither currency `<select>` has a `<label>` or `aria-label` at all — a screen-reader user hears "combo box" with no idea which one is source vs. target. The amount and reference fields are `type="text"`, so mobile shows a text keyboard and the browser gives no numeric hint. |
| 14 | UI / GUI (responsive) | Layout breaks at narrow widths; result values are clipped | Currency row + result boxes | Resize to mobile width (≈375px). The "source select — ⇅ — target select" row overflows the card — the second dropdown hangs off the right edge and is partly unreachable. The result boxes have a fixed height with `overflow: hidden` and `white-space: nowrap`, so "Curs folosit" shows `1 EUR = 4.9718 R…` cut off; large amounts clip the other boxes too. |

## Reasoning-trap note

**Bug 9 is this round's "I assumed it was intentional" trap** — and it's the same
trap from the payment exercise, deliberately rebuilt. It is tempting to think
"exchange rates move all the time, of course the app uses the live rate when I
confirm." But a rate shown **right next to the confirm button** that silently
changes under you, with nothing saying "the rate you were quoted is no longer
valid, review it again," is a real transparency / rate-lock defect. **Report the
mismatch you observed. Don't pre-excuse it — let the product owner decide whether
a re-quote prompt is required.**

Softer versions of the same trap in this page:

- **Bug 4** ("the 'sold după' line is probably just a rough estimate, banking
  apps are vague like that") — no. A number labelled as your balance after the
  operation that is arithmetically impossible is a finding.
- **Bug 10's** dot-decimal formatting ("maybe that's just how the rate API
  returns numbers") — the *page's own subtitle* uses the Romanian format, so the
  result boxes are inconsistent with the same screen.

## Suggested test-category checklist for this page

- Functional / calc: cross-check "Vei primi" against an independent conversion in
  both directions; every currency pair including EUR↔USD; commission actually
  applied; "Total / sold după" arithmetic
- Validation / boundary: amount 0 / negative / non-numeric / `1.500` / `1500,50`;
  amount above the source balance; source = target
- Cross-field / state: change amount, currency, rate (↻) and the swap button —
  does the preview keep up? does the committed value match the previewed one?
- Formatting: decimal separator, thousands grouping, floating-point noise,
  currency label, consistency with the rest of the page
- Security: reference field treated as data not markup; double-submit / repeated
  debits; balance going negative
- Accessibility: click each label to focus its field; can you tell the two
  dropdowns apart with the keyboard / a screen reader; input types on mobile
- UI / GUI: layout at 375–414px width every time; result boxes with large values

## Notes / rejected false positives

- "Schimburi efectuate" not surviving a page reload is expected — there is no backend.
- The rate being fixed / not user-editable is a product decision, not a defect
  (bug 9 is about the rate changing *without the preview following*, not about
  which rate is used).
- The native `<select>` dropdown arrow looking different per browser/OS is not a bug.
- The refreshed rate values being hard-coded (rather than fetched) is a
  test-harness simplification, not the bug — the bug is the stale preview.
