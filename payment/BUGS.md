# Payment / transfer page — bug key (spoilers)

> Don't read this before testing. Test the page first, write your bug reports, *then* compare.

Context: you are "logged in", account balance is **2.500,00 RON**. Rates used by the page: 1 RON = 0.20 EUR = 0.22 USD.

## Planted bugs (10)

| # | Category | Bug | Where to find it | How to reproduce |
|---|----------|-----|------------------|------------------|
| 1 | Functional / Validation | No IBAN format validation | IBAN field | Enter `abc`, `123`, `!!!`, a 3-letter string — any non-empty value is accepted. No length, country-code, or checksum check. |
| 2 | Functional / Validation | Negative amount accepted | Sumă field | Enter `-100`, submit → payment confirmed and logged. |
| 4 | Functional / Security | Double-submit not prevented (idempotency) | "Confirmă plata" button | Fill a valid transfer, click the button rapidly → one entry per click appears in "Plăți efectuate". Button is never disabled; no request de-duplication. |
| 5 | Accessibility / UX | Broken keyboard tab order | Tab through the form | Tab order is IBAN → Monedă → PIN → Sumă → button (hard-coded `tabindex`). "Sumă" is skipped on the way down and only reached after PIN. |
| 6 | Functional | Wrong error message on insufficient funds | Sumă field | Enter an amount above the balance (e.g. `5000`), submit → "IBAN invalid." instead of an insufficient-funds message. Misleads the user into "fixing" the IBAN. |
| 8 | Functional / Data integrity | Preview total ≠ confirmed total (rounding vs. truncation) | Preview box vs. success message / log, non-RON currency | Enter `133,33`, currency EUR. Preview: "Beneficiarul va primi aproximativ 26.67 EUR" (`amount * rate`, rounded to 2 decimals). Confirmed/logged: `26.6 EUR` (same figure truncated to 1 decimal, `Math.trunc(raw*10)/10`). The amount shown and the amount committed disagree. |
| 9 | Accessibility | "Sumă" label not linked to its input | Sumă label | The label's `for="amountInput"` points to an id that doesn't exist (the input's id is `amountField`). Clicking the "Sumă" text doesn't focus the field; screen readers don't announce it. |
| 10 | Security | PIN field is not masked | PIN field | Digits typed into PIN render as plain text (`type="text"`). |
| 11 | Functional | Conversion preview doesn't recalculate on currency change | Preview box + Monedă selector | Type an amount (preview updates), then change the currency dropdown → preview keeps the old currency/figure. It only recalculates on `input` in the Sumă field, not on `change` of the currency. |
| 12 | UI / GUI (responsive) | Balance badge overlaps the heading at narrow widths | Top of the card | Resize the browser to mobile width (≈375–430px) → the "Sold: 2.500,00 RON" badge sits on top of "Transfer nou". Badge is absolutely positioned with a fixed offset. |

## Bonus bugs — found independently during testing, not originally planted

| # | Category | Bug | Where to find it | How to reproduce |
|---|----------|-----|------------------|------------------|
| 3 | Boundary / Validation | Zero amount accepted | Sumă field | Enter `0` (or `0,00`), submit → payment confirmed and logged. Classic boundary-value find (min valid amount should be > 0). |
| 7 | Validation / Security | PIN accepts fewer than 4 digits and non-digits | PIN field | Enter `1`, `ab`, `12` → accepted. No length check (should be exactly 4 digits) and no numeric-only check. |

## Reasoning-trap note (from the second practice session)

Bug 11 was *observed* during testing but almost went unreported because it was rationalized as "you're supposed to pick the currency first — that's how banking apps work." Lesson: **when something looks inconsistent, report it as observed. Don't invent a reason it might be intentional — let whoever owns the product decide.**

## Suggested test-category checklist for this page

- Functional: valid transfer, invalid IBAN, wrong/empty fields, error-message accuracy
- Boundary / negative: amount = 0, negative, above balance, huge value, many decimals, comma vs. dot
- Data integrity: preview total vs. committed total, conversion math, truncation vs. rounding
- Security: input treated as data, PIN masking, PIN format/length, double-submit / idempotency
- Accessibility: keyboard-only navigation, tab order, label association
- UI / GUI: layout at multiple viewport widths (test mobile width every time), overlapping elements
