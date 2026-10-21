# BR-05 — Bill payment: "Total de plată" header is not updated after a payment

| | |
|---|---|
| **App** | Bill payment — [`bills/index.html`](../bills/index.html) |
| **Environment** | Brave (Chromium), macOS, desktop width |
| **Type** | Data integrity |
| **Severity** | Major |
| **Priority** | Medium |

## Preconditions

- The "Plată facturi" page is open, with 5 unpaid invoices:

  | Supplier | Amount |
  |----------|--------|
  | Digi | 120,00 RON |
  | Engie România | 176,00 RON |
  | Vodafone | 49,99 RON |
  | Enel Energie | 214,50 RON |
  | Apa Nova | 92,30 RON |

- The summary header shows **"Total de plată (5 facturi) 652,79 RON"**.

## Steps to reproduce

1. On the **Enel Energie** invoice, click **Plătește**.
2. In the payment panel, leave the full amount (214,50 RON) and click **Plătește acum**.
3. Look at the list of invoices and at the summary header.

## Expected result

- The Enel invoice disappears from the list (4 invoices left).
- The header shows **"Total de plată (4 facturi) 438,29 RON"**
  (120,00 + 176,00 + 49,99 + 92,30).

## Actual result

- The payment succeeds ("Plată efectuată: Enel Energie · 214,50 RON …") and the
  Enel invoice disappears from the list.
- The header still shows **"Total de plată (5 facturi) 652,79 RON"**. The list
  and its own summary on the same screen now disagree.

## Notes

- The customer sees that they still owe 214,50 RON more than they really do, and
  may pay twice.
- Running the scheduled payments ("Rulează plățile programate scadente") leaves
  the header stale in the same way.
- Automated check: [`bills.selenium.test.js`](../selenium-tests/bills.selenium.test.js), TC5 (fails on this bug).
