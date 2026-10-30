# DemoShop: bug key (spoilers)

**Don't read this until you've finished.** The rules are in [README.md](README.md).

`seed.sql` holds the starting data; bad rows there carry a `-- BUG N` comment. Page and
API bugs carry a `// BUG N` comment in `server.js`.

The numbers below are for the starting data. Press **Resetează baza** before comparing.

## Data bugs (16)

These are wrong rows already in the database. The query is the test: the correct result
is **zero rows**.

| # | Rule | Where | What's wrong | Skill |
|---|------|-------|--------------|-------|
| 1 | R2 | customers 13 and 21 | Share an email with customers 1 and 2 | `GROUP BY` + `HAVING` |
| 2 | R1 | customers 15 and 16 | 15 is `NULL`, 16 is an empty string. `IS NULL` alone misses 16 | `IS NULL`, `= ''` |
| 3 | R3 | customers 17 and 18 | `bogdan.barbu.mail.ro` has no `@`, `oana.tudor@` has no domain | `NOT LIKE` |
| 4 | R4 | product 18 | Price is 0 | `WHERE` |
| 5 | R5 | products 16 and 17 | Stock is -3 and -1 | `WHERE` |
| 6 | R6 | orders 1044, 1047, 1052 | `delivred` (typo, twice) and `pending` | `DISTINCT`, `NOT IN` |
| 7 | R7 | orders 1016, 1035 | Customers 31 and 32 don't exist | `LEFT JOIN` + `IS NULL` |
| 8 | R8 | orders 1026, 1042 | Totals of 129 and 59,50 lei, but no lines | `LEFT JOIN` + `IS NULL` |
| 9 | R9 | orders 1021, 1032 | Lines with quantity 0 and -1 | `WHERE` |
| 10 | R9 | order 1049 | A line points at product 77, which doesn't exist | `LEFT JOIN` + `IS NULL` |
| 11 | R10 | orders 1018, 1030, 1040 | Total 179,50 (should be 194,50), 228 (238), 309 (308,50) | `JOIN`, `SUM`, `HAVING` |
| 12 | R11 | order 1036 | 15 lei shipping on 229,50 lei of lines | `CASE` or a manual check |
| 13 | R12 | orders 1059, 1025 | 1059 is dated in the future; 1025 predates the customer's account | `CURDATE()`, `JOIN` |
| 14 | R13 | orders 1023, 1050 | Two `success` payments one second apart | `GROUP BY` + `HAVING` |
| 15 | R13 | orders 1038, 1046 | 1038 has no payment; 1046 paid 399 of 449 lei | `LEFT JOIN`, `JOIN` |
| 16 | R14 | order 1033 | Cancelled, but the 749 lei payment is still `success` | `JOIN` |

## Page and API bugs (11)

These show up only when you compare the page with the database, or check the database
after using the page.

| # | Rule | Where | What's wrong | How to see it |
|---|------|-------|--------------|---------------|
| 17 | R17 | Panou, Comenzi | Inner join hides orders without a customer | Page shows 57, `COUNT(*)` gives 59 |
| 18 | R18 | Panou | Revenue includes cancelled orders | Page shows 18.243,00, the correct sum is 16.970,50 (difference 1.272,50) |
| 19 | R19 | Panou | Counts inactive customers too | Page shows 24, the correct count is 22 |
| 20 | R20 | Order detail | Shows today's product price | Order 1009 shows 249, the customer paid 229; order 1015 shows 749, the customer paid 699 |
| 21 | R21 | Produse | A negative stock is shown as 0 | Cameră supraveghere shows 0, the database has -3 |
| 22 | R22 | Clienți | The search text is pasted into the SQL (SQL injection), and SQL errors reach the page | `' OR 1=1 --` returns all 24 customers; `zzz' UNION SELECT id, name, category, price, stock FROM products --` returns products |
| 23 | R11 | Comandă nouă | `<=` charges shipping on exactly 200 lei | Lampă de birou × 2: shipping 15, total 215. Correct: 0 and 200 |
| 24 | R15 | Comandă nouă | Stock always drops by 1 | Lampă de birou × 2: 30 → 29. Correct: 28 |
| 25 | R15 | Comandă nouă | Stock isn't checked | Căști cu fir × 1 with stock 0 is accepted, stock becomes -1 |
| 26 | R13 | Plătește | No check that the order is unpaid | Double click on an order with status Nouă: two `success` rows |
| 27 | R14, R16 | Anulează comanda | Only the status changes | Cancel 1055: stock stays the same, the payment stays `success` |

## The reasoning traps on this board

- **Failed, then successful payment.** Orders 1028 and 1043 have two payments, so a plain
  `GROUP BY order_id HAVING COUNT(*) > 1` finds them too. A `failed` attempt followed by a
  `success` is a normal retry, so filter on `status = 'success'`. Only 1023 and 1050 are
  bugs.
- **Different price, not a bug.** Orders 1009 and 1015 have a `unit_price` below today's
  product price. R20 says that's allowed. The bug is on the page (bug 20), not in the data.
- **`= NULL` returns nothing.** `WHERE email = NULL` gives zero rows, which looks like a
  pass. Use `IS NULL`. An empty string is a different value again (bug 2).
- **Zero rows can also mean a wrong query.** Before you call a test passed, check that the
  query can find a bad row, for example by loosening the condition.
- **Bug 18's difference.** Comparing the card with your sum tells you there is a bug.
  `SELECT SUM(total) FROM orders WHERE status = 'cancelled'` gives 1.272,50 and tells you
  the cause.

## Suggested checklist for testing a database

1. **Required values:** `NULL` and empty strings
2. **Uniqueness:** `GROUP BY` + `HAVING COUNT(*) > 1`
3. **Allowed values:** `DISTINCT`, ranges and formats
4. **Orphans in both directions:** `LEFT JOIN` + `IS NULL`
5. **Calculated values:** recompute them with `SUM`
6. **Dates:** order of events, dates in the future
7. **Page vs database:** every number on the page
8. **After every action:** check every table it should change, and the ones it shouldn't

## Rejected false positives (correct behaviour)

- Two customers named Ion Popescu (10 and 11): different people with different emails.
- Customers 8 and 19 are inactive. Customer 8 has an old order, which is allowed.
- Customers 13, 15–19 and 24 have no orders: no rule requires one.
- Product 15 has stock 0: out of stock is valid, and only a negative stock is a bug.
- Product 20 is inactive with stock 6 and doesn't appear in Produse: inactive products
  aren't listed.
- Orders 1007 and 1022 are cancelled: 1007 was never paid, and 1022's payment is `refunded`.
- Order 1014 has lines of exactly 200 lei and 0 lei shipping: that's the correct boundary.
- `new` orders have no payment yet.
