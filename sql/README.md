# DemoShop: testarea bazei de date cu SQL

DemoShop e un magazin online de test, cu o pagină de administrare și o consolă SQL.
Scopul e să verifici două lucruri: dacă datele din bază respectă regulile de mai jos
și dacă ce arată pagina corespunde cu ce e în bază.

„DemoShop” e un nume inventat. Datele sunt fictive.

**Nu deschide `BUGS.md` și `seed.sql` înainte să termini**: acolo sunt erorile.

## Cum pornești

Ai nevoie doar de Node.js, fără `npm install`:

```bash
node sql/server.js
```

| Pagină | Adresă |
|--------|--------|
| Administrare magazin | http://localhost:3100 |
| Consolă SQL | http://localhost:3100/consola |

Deschide-le în două file, una lângă alta. Datele stau în memorie și revin la starea
inițială la fiecare pornire sau cu butonul **Resetează baza** din consolă.

## Consola SQL

- Rulezi cu butonul **Rulează** sau cu ⌘ + Enter, câte o singură interogare o dată.
- În stânga vezi tabelele, câte rânduri are fiecare și coloanele lor.
- Baza e SQLite, dar sintaxa de bază e aceeași ca în MySQL. Merg și `NOW()`, `CURDATE()`,
  `YEAR()`, `MONTH()`, `DAY()` și `DATEDIFF()`.
- Nu merg comenzile specifice MySQL, ca `USE`, `SHOW TABLES` și `DESCRIBE`.
  Nici nu ai nevoie de ele, pentru că tabelele se văd în stânga.

## Tabelele

| Tabel | Ce conține | Coloane |
|-------|------------|---------|
| `customers` | clienții | `id`, `first_name`, `last_name`, `email`, `phone`, `city`, `is_active` (1 = activ, 0 = inactiv), `created_at` |
| `products` | produsele | `id`, `name`, `category`, `price`, `stock`, `is_active` |
| `orders` | comenzile | `id`, `customer_id`, `order_date`, `status`, `shipping`, `total` |
| `order_items` | liniile unei comenzi | `id`, `order_id`, `product_id`, `quantity`, `unit_price` |
| `payments` | plățile | `id`, `order_id`, `amount`, `method`, `status`, `paid_at` |

Legături: `orders.customer_id` → `customers.id`, `order_items.order_id` → `orders.id`,
`order_items.product_id` → `products.id`, `payments.order_id` → `orders.id`.

## Regulile

### Clienți

- **R1.** Fiecare client are un email completat.
- **R2.** Emailul e unic: doi clienți nu pot avea același email.
- **R3.** Emailul are forma `nume@domeniu.tld`.

### Produse

- **R4.** Prețul e mai mare decât 0.
- **R5.** Stocul nu e niciodată negativ.

### Comenzi

- **R6.** `status` e una dintre valorile: `new`, `paid`, `shipped`, `delivered`, `cancelled`.
- **R7.** Fiecare comandă aparține unui client existent.
- **R8.** Fiecare comandă are cel puțin o linie în `order_items`.
- **R9.** Fiecare linie are `quantity` cel puțin 1 și un produs existent.
- **R10.** `total` = suma liniilor (`quantity × unit_price`) + `shipping`.
- **R11.** `shipping` e 15 lei dacă suma liniilor e sub 200 lei și 0 lei de la 200 lei în sus.
- **R12.** `order_date` nu e în viitor și nu e înainte de `created_at` al clientului.

### Plăți

- **R13.** O comandă `paid`, `shipped` sau `delivered` are exact o plată cu status `success`,
  iar `amount` e egal cu `total`.
- **R14.** O comandă `cancelled` nu are nicio plată rămasă cu status `success`.
  Dacă fusese plătită, plata are status `refunded`.

### Stoc

- **R15.** Când se plasează o comandă, stocul scade cu `quantity`.
  Nu poți comanda mai mult decât e în stoc.
- **R16.** Când se anulează o comandă, stocul crește înapoi cu `quantity`.

### Pagina de administrare

- **R17.** „Comenzi totale” și lista de comenzi includ toate comenzile din bază.
- **R18.** „Venituri” e suma `total` pentru comenzile `paid`, `shipped` și `delivered`.
- **R19.** „Clienți activi” e numărul clienților cu `is_active = 1`.
- **R20.** Detaliul comenzii arată prețul plătit (`order_items.unit_price`). Acesta poate
  fi diferit de prețul actual al produsului.
- **R21.** Lista de produse arată stocul real.
- **R22.** Căutarea de clienți găsește doar clienții al căror nume de familie conține textul scris.
