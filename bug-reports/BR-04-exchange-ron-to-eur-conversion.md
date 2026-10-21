# BR-04 — Currency exchange: RON → EUR multiplies by the rate instead of dividing

| | |
|---|---|
| **App** | Currency exchange — [`exchange/index.html`](../exchange/index.html) |
| **Environment** | Brave (Chromium), macOS, desktop width |
| **Type** | Functional / Calculation |
| **Severity** | Critical |
| **Priority** | High |

## Preconditions

- The "Schimb valutar" page is open.
- Balances: 8.500,00 RON · 320,00 EUR · 150,00 USD.
- Rate shown on the page: 1 EUR = 4.9718 RON.

## Steps to reproduce

1. Choose **RON** as the source currency and **EUR** as the target currency.
2. In **Sumă de schimbat**, type `100`.
3. Read the "Vei primi" (you will receive) preview.
4. Click **Schimbă acum**.

## Expected result

100 RON / 4.9718 = **20.11 EUR**. The preview shows about 20.11 EUR, and after the
exchange the EUR balance is 340.11.

## Actual result

The preview shows **497.18 EUR** (100 × 4.9718). After the exchange:

- RON balance: 8.500,00 → 8.400,00
- EUR balance: 320,00 → **817,18**
- History: "100 RON → 497.18 EUR"

The customer receives about 25 times more euro than they paid for.

## Notes

- Only the RON → foreign direction is wrong. EUR → RON (100 EUR → 497.18 RON) is
  correct. RON → USD has the same problem.
- Automated checks: [`exchange.selenium.test.js`](../selenium-tests/exchange.selenium.test.js),
  TC2 and the RON → EUR / RON → USD rows of TC7 (fail on this bug).
