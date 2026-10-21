# BR-02 — Payment: clicking "Confirmă plata" several times creates duplicate payments

| | |
|---|---|
| **App** | Payment / transfer — [`payment/index.html`](../payment/index.html) |
| **Environment** | Brave (Chromium), macOS, desktop width |
| **Type** | Functional / Security (idempotency) |
| **Severity** | Critical |
| **Priority** | High |

## Preconditions

- The payment page is open; the balance is 2.500,00 RON.
- "Plăți efectuate" (payment history) is empty.

## Steps to reproduce

1. In **IBAN destinatar**, type `RO49AAAA1B31007593840000`.
2. In **Sumă**, type `100`; leave the currency on RON.
3. In **PIN**, type `1234`.
4. Click **Confirmă plata** three times quickly.

## Expected result

Exactly one payment of 100.00 RON is made. After the first click the button is
disabled (or shows a loading state) until the payment is processed, and repeated
clicks do not send the payment again.

## Actual result

Three identical payments appear in "Plăți efectuate", one per click, all at the
same second:

```
14:10:43 — 100.00 RON → 100.00 RON (RO49AAAA1B31007593840000)
14:10:43 — 100.00 RON → 100.00 RON (RO49AAAA1B31007593840000)
14:10:43 — 100.00 RON → 100.00 RON (RO49AAAA1B31007593840000)
```

The button is never disabled.

## Notes

- In a real bank this sends the money several times. A slow network or an
  impatient double click is enough to trigger it.
- Besides disabling the button, the server should reject a repeated request
  with the same payment ID (idempotency key).
- Automated check: [`payment.selenium.test.js`](../selenium-tests/payment.selenium.test.js), TC8 (fails on this bug).
