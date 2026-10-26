# Meridian Bank API — bug key (spoilers)

> Don't read this before testing. Test the API against `README.md` first, write down
> what you find, *then* compare.

Context: a small REST API for "Meridian Bank" — login with a Bearer token, accounts,
transaction history, transfers and saved beneficiaries. It is tested with Postman (or
curl), not a browser: there is no page, only requests and JSON responses. `README.md`
in this folder is the specification — every planted bug is a place where the server
disagrees with it.

Starting data (back after every restart or `POST /api/reset`):

- **Ana Pop** — `client@meridian.ro` / `Parola123` — account **101** (curent, 2500 RON,
  `RO55MERI0000000000000101`) and **102** (economii, 10000 RON, `RO28MERI0000000000000102`),
  beneficiaries 1 (Maria Pop) and 2 (Popescu Ion).
- **Ion Ionescu** — `alt.client@meridian.ro` / `Parola456` — account **201** (curent,
  1800 RON, `RO71MERI0000000000000201`), beneficiary 3 (Elena Ionescu).

## Planted bugs (17)

| # | Category | Bug | Where to find it | How to reproduce |
|---|----------|-----|------------------|------------------|
| 1 | Security / status code | **An unknown email gets its own code and message — account enumeration** | `POST /api/login` | `{"email":"nimeni@meridian.ro","parola":"x"}` → **`404`** `Nu există niciun client cu acest email.` The spec says `401` `Email sau parolă greșită.` for *both* an unknown email and a wrong password, deliberately the same. With two different answers, anyone can find out which emails are customers of the bank (then phish them, or brute-force only real accounts). Compare: `client@meridian.ro` + wrong password → `401` `Email sau parolă greșită.` — that part is correct. |
| 2 | Security / sensitive data | **The login response contains the password** | `POST /api/login`, response body | Log in successfully and read the *whole* body, not just the status and the token: `utilizator` is `{ "id": 1, "nume": "Ana Pop", "email": "...", "parola": "Parola123" }`. The documented example has no `parola` field. A password must never leave the server — not in a response, not in a log. The status is `200` and everything "works", which is why it is easy to miss: check the body against the documented example field by field. |
| 3 | Security / business rule | **No lockout after 5 wrong passwords** | `POST /api/login` | Send `client@meridian.ro` with a wrong password 5 times (each `401`), then a 6th time → still `401`, never `423`. Then the right password → `200` and a token. The spec says 5 wrong in a row lock the account for 15 minutes, *even for the correct password*. Without it, the password can be brute-forced. BVA: 4 wrong + right → `200` is fine; 5 wrong → the 6th attempt must be `423`. |
| 4 | Security / session | **Logout does not invalidate the token** | `POST /api/logout`, then any request with the same token | Log in, call `GET /api/conturi` → `200`. `POST /api/logout` → `200 Te-ai delogat.` Call `GET /api/conturi` again with the **same** token → still `200` with the accounts. Expected `401`. A stolen or leaked token stays usable for its whole 15 minutes no matter what the customer does. |
| 5 | Security / authorization (IDOR) | **Any client can read any account** | `GET /api/conturi/{id}` | Log in as Ana, `GET /api/conturi/201` → **`200`** with Ion Ionescu's balance (1800), IBAN and name. Expected `403` `Nu ai acces la acest cont.` The server checks *that* you are logged in (authentication) but not *whose* account it is (authorization). Changing one number in the URL is the whole attack. `GET /api/conturi/999` → `404` is correct. |
| 6 | Security / authentication | **The transaction history needs no token at all** | `GET /api/conturi/{id}/tranzactii` | Remove the Authorization header (Postman: Authorization → No Auth) → `GET /api/conturi/101/tranzactii` → **`200`** with Ana's full history. `GET /api/conturi/201/tranzactii` → `200` with Ion's history, with or without a token. Every other protected endpoint answers `401` without a token; this one forgot the check entirely. Contrast with bug 5: there the token is checked but ownership is not; here *nothing* is checked. |
| 7 | Functional / query parameter | **The `tip` filter is ignored** | `GET /api/conturi/101/tranzactii?tip=debit` | → `numar: 6`, and the list still contains the two `credit` lines (salary 4200, transfer 150). Expected `numar: 4`, only `debit` lines. `?tip=credit` → also all 6. The parameter *is* validated — `?tip=abc` → `400` — which makes the filter look implemented. A filter that is validated but not applied. |
| 8 | Performance | **The savings account's history takes ~2.5 seconds** | `GET /api/conturi/102/tranzactii` | Look at the response time Postman shows next to the status: ~2500 ms for account 102, a few ms for 101 — for a list of 3 lines. The spec says every endpoint answers in under 1 second. Easy to rationalise ("savings accounts have more data") — don't: 3 lines, and the requirement is stated. Measure, compare with the number in the spec, report it. |
| 9 | Validation / negative | **Zero and negative amounts are accepted — a negative transfer *adds* money** | `POST /api/transferuri` | `{"contSursa":101,"ibanDestinatie":"RO66BACX0000001234567890","suma":-500}` → **`201`**, `soldNou: 3000`. The customer's balance went *up* by 500, taken from an external account. `"suma": 0` → `201`, a transfer of nothing. Expected `400` `Suma trebuie să fie un număr mai mare decât 0.` To an internal destination (`RO28…102`) the negative amount also *takes* 500 from account 102. |
| 10 | Validation / boundary (BVA) | **A transfer of exactly the full balance is refused** | `POST /api/transferuri` | After a reset account 101 holds 2500. `"suma": 2500` → **`400 Fonduri insuficiente.`** — but the spec says you can transfer at most the balance, *including* the whole balance. `2499.99` → `201` ✓, `2500.01` → `400` ✓; only the boundary value itself is wrong (`>=` instead of `>`). Only a test *on* the boundary finds this. |
| 11 | Validation / data type | **A text amount is accepted and corrupts the balances** | `POST /api/transferuri` | `"suma": "abc"` → **`201`** with `soldNou: null`, and from then on `GET /api/conturi` shows account 101 with `"sold": null` — the balance is destroyed (NaN). Second facet, nastier: `"suma": "100"` (a number *in quotes*) to `RO28MERI0000000000000102` → 101 correctly drops to 2400, but 102 becomes **10000100** — the string is *concatenated* on the credit side (`10000 + "100"`). Expected `400` for any `suma` that is not a JSON number. Use `POST /api/reset` afterwards. |
| 12 | Functional / idempotency | **`Idempotency-Key` is ignored — a retry makes a second transfer** | `POST /api/transferuri` with the header | Add header `Idempotency-Key: test-1`, transfer 100 from 101 → `201`, id 5001, `soldNou: 2400`. Send **the same request again**, same key → `201` again, **id 5002**, `soldNou: 2300`. Expected `200` with transfer 5001 and the balance unchanged. This is the mechanism that protects against a double debit when the app retries after a timeout — documented, and not implemented. Verify with `GET /api/conturi/101/tranzactii`: two debit lines. |
| 13 | Error handling / information leakage | **Malformed JSON → `500` with the stack trace** | Any `POST` / `PATCH` | Send a body that is not valid JSON, e.g. `{"email":"client@meridian.ro",` (cut off) or `{'email':'x'}` (single quotes) → **`500`** with `"detalii": "Expected double-quoted property name in JSON at position 30…"` and a full `"stack"` that includes the file path on the server (`/Users/…/api/server.js:…`). Expected `400` `Corpul cererii nu este JSON valid.` Two defects: the wrong class of status (a client mistake reported as a server crash), and internal details handed to whoever sent the request. |
| 14 | Status code | **Creating a beneficiary answers `200` instead of `201`** | `POST /api/beneficiari` | A valid new beneficiary → `200` with the created record. The spec says `201 Created`. It "worked", so it looks harmless — but clients and automated checks rely on the status: a test asserting `201` fails, and `200` vs `201` is how a caller knows a resource was *created*. Low severity, still a defect against the spec. |
| 15 | Validation | **The beneficiary IBAN is checked only for the `RO` prefix** | `POST /api/beneficiari` | `{"nume":"Test","iban":"RO123"}` → `200`, saved. `RO00MERI0000000000000101` (right length, wrong check digits) → saved. `DE89…` or `ro55…` → `400` (prefix only). The spec says "aceleași reguli ca la transferuri" — and `POST /api/transferuri` **does** reject `RO123` with `400 IBAN destinatar invalid.` Same rule, two endpoints, two behaviours: the customer can save a beneficiary they can never pay. IBAN check digits = MOD-97. |
| 16 | Functional / HTTP semantics | **`PATCH` wipes the fields you didn't send** | `PATCH /api/beneficiari/1` | Body `{"alias":"Mami"}` → `200` with `{ "id": 1, "alias": "Mami" }` — `nume` and `iban` are **gone**, and `GET /api/beneficiari` confirms they are lost for good. The spec says send only what you want to change, the rest stays. The server rebuilds the record from the body, i.e. it behaves like a `PUT` (full replace). Check the response *and* re-read the resource with a `GET`. |
| 17 | Status code / authorization | **`DELETE` answers `200 Beneficiar șters.` even when nothing was deleted** | `DELETE /api/beneficiari/{id}` | `DELETE /api/beneficiari/999` → `200 Beneficiar șters.` Expected `404`. As Ana, `DELETE /api/beneficiari/3` (Ion's) → also `200 Beneficiar șters.` — it *looks* like an IDOR, but log in as Ion and `GET /api/beneficiari`: Elena Ionescu is still there. So the bug is the lying status/message, not a cross-account delete. A tester who stops at the `200` reports the wrong bug; verify the effect from the other side. |

## The reasoning traps on this board

- **Bug 1** is the "looks intentional" one: a precise message ("no customer with this
  email") feels *helpful*. The spec explicitly asks for the same code and message in both
  cases, and that is the secure design for a bank (OWASP: generic authentication errors).
  Note the contrast with the `login/` practice page, whose own spec wanted separate
  messages: the spec is the oracle, but for a bank the safer design is the generic one —
  if a spec asks for separate messages, raise the enumeration risk with the PO.
- **Bug 8** invites "it's a savings account, it has more data". Three lines. The number in
  the spec is the oracle, not your guess about the backend.
- **Bug 17** invites the opposite mistake: seeing `200` on someone else's beneficiary and
  reporting an IDOR without checking that anything actually happened. Verify the effect.
- **Bug 2 and bug 16** pass on the status code alone. Read the whole body, and re-read the
  resource with a `GET` after every write.

## Suggested checklist for testing an API

- **Status code** against the spec for every response — success *and* errors.
- **Body** against the documented example, field by field: missing fields, *extra*
  fields (bug 2), types (`"100"` vs `100`).
- **Authentication:** no token, a wrong token, an expired token, a token after logout.
- **Authorization:** *your* token on *another client's* id, for every endpoint with an id
  (read, update, delete) — `200` instead of `403`/`404` is the IDOR signal.
- **Validation:** missing field, empty string, wrong type, zero, negative, BVA around every
  limit stated in the spec (balance, 5 attempts, 15 minutes).
- **Idempotency:** send the same write twice (with and without `Idempotency-Key`).
- **Error handling:** malformed JSON, wrong method (`405`), unknown endpoint (`404`) — no
  `500`, no stack traces, no internal paths.
- **Verify every write with a read:** after `POST` / `PATCH` / `DELETE`, `GET` the resource
  (and the balances) and check the effect really happened — or really didn't.
- **Response time** against the number in the spec.

## Rejected false positives (correct behaviour)

- `GET /api/conturi` shows the customer's **own IBAN** in full — normal, the customer needs
  it to receive money. A card PAN would have to be masked; an own IBAN doesn't.
- The **token** in the login response — that is the point of logging in.
- `GET /api/conturi/999` → `404`; `GET /api/transferuri/{id}` of another client → `404`
  (the spec chose `404` there, which also hides that the transfer exists — a valid design).
- `POST /api/transferuri` from account `201` with Ana's token → `403` — correct.
- `RO123` as a transfer IBAN → `400 IBAN destinatar invalid.` — correct (contrast bug 15).
- `PUT /api/beneficiari/1` → `405 Method Not Allowed` with an `Allow: PATCH, DELETE`
  header — correct, the API only offers `PATCH`.
- `?tip=abc` → `400` — correct (the bug is that valid values are ignored, bug 7).
- `POST /api/reset` works without a token — it is a declared practice tool, out of scope.
  In a real API an unauthenticated "reset everything" endpoint would be a critical finding.
- Amounts are JSON numbers (`2500`, `318.45`), not `"2.500,00"` — the spec says so.
