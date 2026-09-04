# Tranzacții și extras de cont — bug key (spoilers)

> Don't read this before testing. Test the page first, write your bug reports, *then* compare.

Context: the transactions / statement page of a current account at "Meridian Bank".
You are "logged in". The page shows:

- **Two balances** — *Sold contabil* and *Sold disponibil*, plus a line saying how
  much is blocked by authorised (not yet settled) transactions.
- **A transaction list** — 14 lines, each with date, amount, a *Sold după* running
  balance and, for some, an **Autorizat** badge. Clicking a line opens a details
  panel (card, authorisation code, terminal, a personal note field, and a
  **Contestă tranzacția** button).
- **Filters** — date range, type, minimum amount, free text — plus **Exportă CSV**.
- **Extras lunar** — a button that generates the August 2026 statement for a
  5,00 RON fee.

No backend — everything updates the in-page state. The "current moment" is pinned
to **Friday, 4 September 2026, 11:00** and the page prints it as
*"Azi: vineri, 4 septembrie 2026, ora 11:00"*.

Starting figures: **Sold contabil 7.430,00 RON**, **Sold disponibil 5.730,00 RON**,
blocat **1.700,00 RON**.

The transactions:

| ID | Data | Descriere | Sumă | Status |
|----|------|-----------|------|--------|
| T-2044 | 2026-01-15 | SC TERRA TRAVEL SRL | -2.150,00 | Decontat |
| T-2031 | 2026-07-28 | Salariu iulie SC ALFA SRL | +6.400,00 | Decontat |
| T-2032 | 2026-08-05 | ENEL ENERGIE factura 08/2026 | -318,45 | Decontat |
| T-2033 | 2026-08-12 | KAUFLAND BUCURESTI 042 | -247,90 | Decontat |
| T-2034 | 2026-08-15 | Retragere numerar ATM MERIDIAN | -400,00 | Decontat |
| T-2035 | 2026-08-19 | EMAG.RO comanda 88213 | -1.249,00 | Decontat |
| T-2036 | 2026-08-28 | Salariu august SC ALFA SRL | +6.400,00 | Decontat |
| T-2037 | 2026-08-30 | Transfer catre Popescu Ion | -350,00 | Decontat |
| T-2038 | 2026-09-01 | DIGI COMUNICATII abonament | -69,99 | Decontat |
| T-2039 | 2026-09-01 | HOTEL CONTINENTAL BRASOV | -1.200,00 | **Autorizat** |
| T-2040 | 2026-09-02 | GLOVO APP | -87,50 | Decontat |
| T-2041 | 2026-09-03 | PETROM BENZINARIE OTOPENI | -500,00 | **Autorizat** |
| T-2042 | 2026-09-04 | PETROM BENZINARIE OTOPENI | -200,00 | Decontat |
| T-2043 | 2026-09-06 | LIDL DISCOUNT SRL 118 | -142,30 | Decontat |

Rules the page states in its own text:

- *Sold disponibil* = sold contabil minus what is blocked by authorised transactions.
- *"Poți contesta o tranzacție în maximum 60 de zile de la data decontării."*
- *"Comision emitere extras: 5,00 RON."*

## Planted bugs (18)

| # | Category | Bug | Where to find it | How to reproduce |
|---|----------|-----|------------------|------------------|
| 1 | Functional / auth vs. settlement | **A settled pre-authorisation is never released — the hold is counted on top of the amount actually charged** | The two balances + T-2041 / T-2042 | T-2041 (`-500,00`, **Autorizat**) and T-2042 (`-200,00`, **Decontat**) are the same purchase: same merchant, same terminal `POS 33019845`, **same authorisation code `907233`**. The card was pre-authorised for 500 at the pump, the real amount was 200, and the 200 has already hit the account — but the 500 hold is still open. So the customer is short **700,00** for one 200-lei tank of fuel. The page says `blocat 1.700,00` and `Sold disponibil 5.730,00`; only the hotel hold (T-2039, 1.200,00) is legitimate, so the correct figures are `blocat 1.200,00` and **`Sold disponibil 6.230,00`**. Nothing on the page ever releases a hold. |
| 2 | Functional / data quality | A transaction dated **in the future** and on a **Sunday** is already "Decontat" | T-2043 | "Azi" is **vineri, 4 septembrie 2026**. T-2043 (LIDL, `-142,30`) is dated **06.09.2026 — a Sunday, two days from now** — and is shown as already settled and already reflected in the balance. Two separate problems in one line: a settlement date in the future, and a settlement dated on a non-business day. |
| 3 | Functional / sorting | The list is sorted by the **formatted date string**, not by the date | Transaction list, default order | The rows are ordered `30.08` → `28.08` → **`28.07`** → `19.08` → `15.08` → **`15.01`** → `12.08` → **`06.09`** → `05.08` → `04.09` → `03.09` → `02.09` → `01.09` → `01.09`. It sorts by day-of-month first: July lands between two August rows, January lands in the middle of August, and **every September transaction is pushed to the bottom** even though they are the newest. Sorting a `dd.mm.yyyy` string alphabetically is not sorting a date. |
| 4 | Functional / calc | "Sold după" is a running balance walked over the **displayed** order, so it is nonsense | Right-hand column of every row | With no filters, the column reads `7.430,00`, `7.780,00`, `1.380,00`, **`-5.020,00`**, `-3.771,00`, … It goes *negative* on an account that never went negative, and it rises above the current balance. Hand-check any single row: the "Sold după" of the newest transaction should be `7.430,00` and each older row should differ from the next by exactly that row's amount. It does not, because the walk follows bug 3's broken order. Also: apply any filter and the column is recomputed over the filtered subset, so the same transaction shows a different "Sold după" depending on what you filtered. |
| 5 | Validation / boundary (BVA) | The date filter **excludes the "Până la" day** — the range is inclusive at the start, exclusive at the end | Filtre → De la / Până la | Set **De la `12.08.2026`** and **Până la `12.08.2026`** → *"Nicio tranzacție pentru filtrele selectate"*, although KAUFLAND (T-2033) is dated exactly `12.08.2026`. Set `01.08` – `30.08` → 5 results; T-2037 (`30.08`) is missing. Set `01.08` – `31.08` → the 30.08 line comes back, so the boundary day is always the one that is dropped. Classic off-by-one on the upper bound. |
| 6 | Validation / parsing | "Sumă minimă" is `parseFloat` on raw text — locale-broken and unvalidated | Filtre → Sumă minimă (RON) | Type `1.000` (the Romanian way) → it filters at **1,00** and returns all 14 rows. Type `250,50` → filters at 250. Type `abc` → `NaN`, every comparison is false, so **the filter silently does nothing** and shows all 14 rows with no error. Type `-5` → accepted. Nothing tells the user the filter was ignored. |
| 7 | Functional / search | The description search is **case-sensitive and prefix-only** | Filtre → Caută în descriere | `kaufland` → 0 results, `Kaufland` → 0 results, only `KAUFLAND` matches. And `ENERGIE` → 0 results even though "ENEL ENERGIE factura 08/2026" contains it — the match is `indexOf(q) === 0`, so only the *beginning* of the description counts. A search box that only matches an exact-case prefix is unusable. |
| 8 | Functional / data integrity + security | **Exportă CSV ignores the active filters**, and writes the note column raw | Filtre + Exportă CSV | Filter down to one row (e.g. `Sumă minimă 6000`), then press **Exportă CSV** → the export contains **all 14 transactions**. What you see is not what you get. Second facet: the "Nota" column is written unquoted and unescaped, so a note containing `;` shifts every following column, and a note starting with `=` (`=1+1`, or worse `=HYPERLINK(...)`) is executed as a **formula** when the file is opened in Excel / LibreOffice — CSV formula injection. Third facet: the export includes the full card number on every line (see bug 10). |
| 9 | Security | **HTML / script injection through the "Notă personală" field** | Detail panel → Notă personală → Salvează nota | The note is written into the row with `innerHTML`. Save `<b>test</b>` → the row shows a **bold** "test", not the literal tag: proof that your input is being parsed as markup, not text. Escalate: `<img src=x onerror="alert(document.domain)">` → the script runs. Report it as **stored XSS**, not as "my note doesn't display right" — the display glitch is only the tell. |
| 10 | Security / sensitive data | The **full card number** is displayed and exported | Detail panel → Card; CSV export | Every transaction detail shows `4539 8842 1100 4821` in clear, and the same full PAN is written into every line of the CSV export. A card PAN is regulated (PCI-DSS): it must be masked to the last 4 digits (`•••• 4821`). Note the contrast with the IBAN in the page header — showing the customer **their own IBAN** in full is normal and is *not* a bug. Know which identifiers are regulated (card PAN, CVV) and which are not. |
| 11 | Validation / enforcement vs. configuration | The advertised **60-day dispute window is not enforced** | Detail panel → Contestă tranzacția | The hint right above the button says *"maximum 60 de zile de la data decontării"*. Open **T-2044** (decontat `16.01.2026` — **231 days ago**) and press the button → "Tranzacția a fost contestată", and the money is credited back. The rule exists as text only; there is no check in the code. Test the *boundary of the rule*, not just the happy path: 59 / 60 / 61 days. |
| 12 | Functional / auth vs. settlement | A transaction that is only **"Autorizat"** can be disputed | Detail panel on T-2039 or T-2041 | Open T-2041 (status **Autorizat**, "Data decontării: —") → **Contestă tranzacția** is enabled and works. You cannot dispute a charge that has not been made yet; a pending authorisation is cancelled or left to expire, it is not charged back. The status is never checked. |
| 13 | Security | Disputing has **no confirmation and no step-up authentication**, and the button is not guarded | Contestă tranzacția | A chargeback moves money and opens a case against a merchant. It happens on a **single click** — no "ești sigur?", no OTP / password / re-auth. The button also stays enabled afterwards: press it a second time on T-2044 and the balance goes `7.430,00 → 9.580,00 → 11.730,00`. Two clicks, credited twice. |
| 14 | Functional / audit trail | The dispute credits the money back **silently** — no reference, no line, no history | Balances after a dispute | Dispute T-2044 → *Sold contabil* jumps from `7.430,00` to `9.580,00` with **no new line in the transaction list** explaining where 2.150,00 came from, **no reference / case number** given to the customer, and **no history or audit section anywhere on the page** recording who did it and when. A provisional credit must be visible as its own entry and reversible. Extra facet: dispute the **incoming** salary line T-2036 → the account is credited a *second* 6.400,00. |
| 15 | Functional / idempotency (batch) | "Generează extrasul lunar" is not idempotent — it **re-charges the fee** and appends a duplicate | Extras lunar | Press it once → a statement appears and *Sold contabil* drops by 5,00 (`7.430,00 → 7.425,00`). Press it again → **a second, identical "Extras nr. 8/2026"** is appended below the first and another 5,00 is taken (`→ 7.420,00`). Press it five times, pay 25,00 RON. There is no run marker, no "already generated for this period" check, and the same statement number is reused. Second facet: the 5,00 fee **never appears as a transaction line** — the balance just drops, so the customer cannot see what they were charged for (same audit gap as bug 14). |
| 16 | Functional / calc | The statement's totals **do not match its own lines** | The generated Extras | The statement lists 6 August transactions and says `Număr tranzacții 6`, but prints `Total intrări **12.800,00**` and `Total ieșiri **6.915,14**`. Add up the six lines it actually shows: intrări `6.400,00`, ieșiri `318,45 + 247,90 + 400,00 + 1.249,00 + 350,00 = **2.565,35**`. The totals are computed over the **whole account** — every month, plus the amounts that are only authorised and not settled — while the body covers August only. Hand-calculate any total a page shows you. |
| 17 | Accessibility | The feature cannot be operated with the keyboard, and the filter fields have no labels | Whole page, `Tab` only | Tab through the page: the transaction rows are **never reached** — they are `<li>` with a click handler, no `tabindex`, no `role`, no `Enter` handler — so the details panel, the note field and the dispute button are unreachable without a mouse. The panel's close `×` is a `<span>`, also unreachable. Second facet: "De la", "Până la", "Tip", "Sumă minimă" and "Caută în descriere" are `<span class="pseudo-label">`, not `<label for>` — clicking the text does not focus the field and a screen reader announces the inputs with no name. |
| 18 | UI / responsive | The layout breaks below ~400px | Any viewport at 375px | At 375px (iPhone width) the filter bar is a 4-column grid with a 128px minimum per column and no wrap: **"Tip" and "Sumă minimă" are pushed outside the card** and are cut off — you cannot use them at all on a phone. In the list, the description column collapses to `"Trans…"`, `"Salari…"` — the merchant is unreadable while the two number columns keep their full width. |

## The reasoning trap this board is built around

**Bug 1** is the "looks like it could be intentional" bug this time. A 500-lei hold
on a fuel purchase *is* normal — pre-authorisation at the pump is real, expected
behaviour, and it is easy to look at "Autorizat 500,00" and move on. The defect is
not the hold, it is that the hold was **never released after the transaction
settled at 200,00**, so the customer is charged 200 and blocked for 500 at the
same time. The tells are on screen: same merchant, same terminal, **same
authorisation code `907233`**, one line settled and one still held.

The discipline that catches it: *"blocat" is not "debitat" — there are two steps,
so what happens in step two?* Any operation where the system had to act before it
knew the final amount (fuel pump, hotel, car rental, EV charging, tips, seat
reservation) reserves an estimate and then reconciles. Every one of those has the
same test family: **is the reservation released? after how long? what if the
reconciliation never arrives? what if the real amount is higher than the hold?**

## Suggested test-category checklist

- **Functional** — sort order, running balance, statement totals, dispute effect
- **Auth vs. settlement** — pending vs. settled, hold release, disputing a pending line
- **Validation / boundary (BVA)** — date range endpoints, amount parsing, empty results
- **Batch / idempotency** — press the statement button twice
- **Security** — injection in free-text fields (escalate past the first tell),
  sensitive data on screen and in exports, confirmation + step-up on money-moving
  actions, CSV formula injection
- **Audit trail** — can the customer see *why* the balance changed?
- **Data integrity** — does the export match the screen? do totals match their lines?
- **Accessibility** — reach the feature with `Tab` only; labels bound to inputs
- **UI / GUI** — 375px, 768px, long merchant names, long notes

## Rejected false positives

Things that look wrong but are not planted bugs:

- **The hotel pre-authorisation (T-2039, 1.200,00 "Autorizat")** — a hotel holding
  an estimated amount before check-out is correct behaviour. The bug is bug 1's
  *unreleased* hold, not the existence of holds.
- **The full IBAN in the header** — showing a customer their own IBAN while they
  are logged into their own account is normal (BT, ING, BCR, Revolut all do it).
  An IBAN has no PCI-DSS-style masking rule; a card PAN does. See bug 10.
- **Nothing persists after a refresh** — there is no backend; state is in-page only.
- **Charging 5,00 RON for a statement** — a fee for issuing a statement is a
  legitimate product decision. The bug is charging it *again on every press*.
- **The empty-result message when a filter genuinely matches nothing** — correct.
