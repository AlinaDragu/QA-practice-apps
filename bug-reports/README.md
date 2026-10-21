# Bug reports

Sample bug reports from exploratory testing sessions on the apps in this repo.
Each one is reproducible on the current version of the app. Where an automated
check exists, the report links to it.

| ID | App | Title | Severity | Priority |
|----|-----|-------|----------|----------|
| [BR-01](BR-01-login-wrong-password-message.md) | Login | Wrong password on an existing account shows "Cont inexistent." | Major | High |
| [BR-02](BR-02-payment-double-submit.md) | Payment | Clicking "Confirmă plata" several times creates duplicate payments | Critical | High |
| [BR-03](BR-03-register-confirm-email-ignored.md) | Registration | "Confirmă adresa de email" is never compared to the email | Major | Medium |
| [BR-04](BR-04-exchange-ron-to-eur-conversion.md) | Currency exchange | RON → EUR multiplies by the rate instead of dividing | Critical | High |
| [BR-05](BR-05-bills-summary-not-updated.md) | Bill payment | "Total de plată" header is not updated after a payment | Major | Medium |
| [BR-06](BR-06-deposit-penalty-not-applied.md) | Term deposits | Early-liquidation penalty is shown but never applied | Critical | High |

## Format

Every report has the same structure:

- **Title**: what is wrong and where, in one line
- **Severity**: impact on the product (Critical / Major / Minor)
- **Priority**: how soon it should be fixed (High / Medium / Low)
- **Preconditions**, **Steps to reproduce**, **Expected result**, **Actual result**
- **Notes**: extra context, open questions for the PO, related automated test

The apps use a Romanian UI. Labels and messages are quoted exactly as they
appear on screen, with an English translation where it helps.
