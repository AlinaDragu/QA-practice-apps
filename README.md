# qa-practice-apps

Small, self-contained web pages built **with intentional bugs**, used as targets for
manual / exploratory QA practice.

Each app is a folder with separate `index.html`, `styles.css` and `script.js` —
no build step, no dependencies, no backend. Open `index.html` in a browser and test it.

There are two exceptions, both small Node.js servers with no dependencies:
[`api/`](api/), a REST API for API testing with Postman — see
[API testing](#api-testing-postman) below — and [`sql/`](sql/), an online shop with a
SQL console — see [Database testing](#database-testing-sql) below.

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
| Hotel booking | [`booking/index.html`](booking/index.html) | Room booking ("Hotel Brezaia"): dates, room type and capacity, weekend pricing, breakfast, city tax, promo codes, availability, cancellation with refund. No bug comments in the source — the rules panel on the page is the spec | 19 planted |
| Bank API | [`api/README.md`](api/README.md) | REST API ("Meridian Bank"): login with a Bearer token, accounts, transaction history, transfers with an idempotency key, saved beneficiaries (CRUD) — no page, tested with Postman | 17 planted |
| Online shop database | [`sql/README.md`](sql/README.md) | Shop admin ("DemoShop") plus a SQL console: customers, products, orders, payments — wrong data in the database, and pages that disagree with it | 27 planted |

"Meridian", "DemoShop" and "Hotel Brezaia" are made-up names — not real branding.

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

## API testing (Postman)

[`api/`](api/) is a REST API instead of a page. Start it with Node.js (no
`npm install` needed) and send requests to it from Postman or curl:

```bash
node api/server.js
# → http://localhost:3000
```

[`api/README.md`](api/README.md) is its documentation — the specification you test
against. The spoiler key is [`api/BUGS.md`](api/BUGS.md), as for the pages. Data lives
in memory: restarting the server (or `POST /api/reset`) restores the starting state.

## Database testing (SQL)

[`sql/`](sql/) is an online shop with its own SQL console. It uses the SQLite built into
Node.js, so there's nothing to install. Node 24 or newer is recommended:

```bash
node sql/server.js
# → http://localhost:3100          the shop admin
# → http://localhost:3100/consola  the SQL console
```

[`sql/README.md`](sql/README.md) has the tables and the rules you test against. The
spoiler key is [`sql/BUGS.md`](sql/BUGS.md), and `sql/seed.sql` contains the bad rows, so
leave both for the end. Data lives in memory: restarting the server (or **Resetează
baza** in the console) restores the starting state.

## Bug reports

[`bug-reports/`](bug-reports/) holds sample bug reports from exploratory testing
sessions on these apps: title, severity / priority, preconditions, steps to
reproduce, expected vs. actual result.

## Automated tests (Selenium)

[`selenium-tests/`](selenium-tests/) holds Selenium WebDriver + Jest tests written
against the apps above. Each test file opens its app by a relative path
(e.g. `../payment/index.html`), so the apps themselves stay dependency-free.

| Test file | App under test |
|-----------|----------------|
| [`payment.selenium.test.js`](selenium-tests/payment.selenium.test.js) | Payment / transfer |
| [`login.selenium.test.js`](selenium-tests/login.selenium.test.js) | Login |
| [`register.selenium.test.js`](selenium-tests/register.selenium.test.js) | Registration |
| [`loan.selenium.test.js`](selenium-tests/loan.selenium.test.js) | Loan simulator |
| [`exchange.selenium.test.js`](selenium-tests/exchange.selenium.test.js) | Currency exchange |
| [`bills.selenium.test.js`](selenium-tests/bills.selenium.test.js) | Bill payment |
| [`deposit.selenium.test.js`](selenium-tests/deposit.selenium.test.js) | Term deposits |

```bash
cd selenium-tests
npm install
npm test
```

The tests drive Brave (`/Applications/Brave Browser.app`); on the first run
Selenium downloads a matching chromedriver automatically. Brave runs headless
(no window) by default; prefix the command with `HEADED=1` to watch it:

```bash
HEADED=1 npx jest login
```

## Adding a new practice app

Create `<name>/index.html`, `<name>/styles.css`, `<name>/script.js` and
`<name>/BUGS.md`, add a row to the table above. Keep it dependency-free.
