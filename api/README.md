# Meridian Bank API — documentație

API REST de exersare pentru „Meridian Bank” (bancă inventată). Rulează local și nu are
bază de date: datele stau în memorie și revin la starea inițială la fiecare pornire
(sau cu `POST /api/reset`).

> Testează API-ul pe baza acestei documentații: ea e specificația. Nu deschide
> `server.js` și `BUGS.md` până nu termini — acolo sunt bugurile.

## Pornire

Ai nevoie doar de Node.js (fără `npm install`):

```bash
cd ~/Documents/qa-practice-apps
node api/server.js
```

Serverul răspunde la **`http://localhost:3000`**. Fiecare cerere primită apare în
terminal (metodă, adresă, cod de răspuns, timp). Îl oprești cu `Ctrl+C`.

## Clienți de test

| Client | Email | Parolă | Conturi |
|--------|-------|--------|---------|
| Ana Pop | `client@meridian.ro` | `Parola123` | **101** curent, 2.500,00 RON · **102** economii, 10.000,00 RON |
| Ion Ionescu | `alt.client@meridian.ro` | `Parola456` | **201** curent, 1.800,00 RON |

IBAN-uri valide pe care le poți folosi:

| IBAN | Al cui e |
|------|----------|
| `RO55MERI0000000000000101` | contul 101 (Ana Pop) |
| `RO28MERI0000000000000102` | contul 102 (Ana Pop) |
| `RO71MERI0000000000000201` | contul 201 (Ion Ionescu) |
| `RO66BACX0000001234567890` | cont la altă bancă |
| `RO83CECE0000000000123456` | cont la altă bancă |
| `RO89BRDE0000000044556677` | cont la altă bancă |

## Autentificare

1. `POST /api/login` cu emailul și parola → primești un `token`.
2. La celelalte cereri trimiți tokenul în header:
   `Authorization: Bearer <token>`
   (în Postman: tab-ul **Authorization** → Type **Bearer Token** → lipești tokenul).
3. Tokenul e valabil 15 minute (`expiraIn: 900` secunde). După `POST /api/logout`
   nu mai e valabil.

## Format

- Cererile cu body trimit JSON (`Content-Type: application/json`).
  În Postman: **Body** → **raw** → **JSON**.
- Răspunsurile sunt JSON. Sumele sunt numere în RON, cu punct zecimal (`2500`, `318.45`).
- Erorile au forma `{ "eroare": "mesaj" }`.

## Coduri de răspuns

| Cod | Când |
|-----|------|
| `200 OK` | cererea a reușit |
| `201 Created` | s-a creat o resursă nouă (transfer, beneficiar) |
| `400 Bad Request` | date lipsă sau invalide în cerere, inclusiv un body care nu e JSON valid |
| `401 Unauthorized` | lipsește tokenul, e greșit sau a expirat; email sau parolă greșită la login |
| `403 Forbidden` | ești autentificat, dar resursa nu e a ta |
| `404 Not Found` | resursa sau endpoint-ul nu există |
| `405 Method Not Allowed` | endpoint-ul există, dar nu cu metoda folosită |
| `409 Conflict` | resursa există deja |
| `423 Locked` | cont blocat temporar după prea multe parole greșite |
| `500 Internal Server Error` | eroare neprevăzută a serverului |

## Reguli generale

- Toate endpoint-urile răspund în mai puțin de **1 secundă**.
- Toate endpoint-urile cer autentificare, în afară de `/`, `/api/health`, `/api/login`
  și `/api/reset`.
- Un client vede și modifică doar conturile, transferurile și beneficiarii lui.
- Un body care nu e JSON valid primește `400` cu
  `{ "eroare": "Corpul cererii nu este JSON valid." }`.

## Endpoint-uri

| Metodă | Endpoint | Auth | Ce face |
|--------|----------|------|---------|
| `GET` | `/api/health` | nu | starea serverului |
| `POST` | `/api/login` | nu | autentificare |
| `POST` | `/api/logout` | da | delogare |
| `GET` | `/api/conturi` | da | conturile clientului |
| `GET` | `/api/conturi/{id}` | da | un cont |
| `GET` | `/api/conturi/{id}/tranzactii` | da | istoricul unui cont |
| `POST` | `/api/transferuri` | da | transfer nou |
| `GET` | `/api/transferuri/{id}` | da | un transfer |
| `GET` | `/api/beneficiari` | da | beneficiarii salvați |
| `POST` | `/api/beneficiari` | da | beneficiar nou |
| `PATCH` | `/api/beneficiari/{id}` | da | modifică un beneficiar |
| `DELETE` | `/api/beneficiari/{id}` | da | șterge un beneficiar |
| `POST` | `/api/reset` | nu | readuce datele la starea inițială (unealtă, nu face parte din test) |

---

### `GET /api/health`

Verifică dacă serverul merge.

Răspuns `200`:

```json
{ "stare": "ok" }
```

---

### `POST /api/login`

Body:

```json
{ "email": "client@meridian.ro", "parola": "Parola123" }
```

Răspuns `200`:

```json
{
  "token": "3f9c0a7e…",
  "tip": "Bearer",
  "expiraIn": 900,
  "utilizator": { "id": 1, "nume": "Ana Pop", "email": "client@meridian.ro" }
}
```

Erori:

| Cod | Mesaj | Când |
|-----|-------|------|
| `400` | `Emailul și parola sunt obligatorii.` | lipsește unul dintre câmpuri |
| `401` | `Email sau parolă greșită.` | emailul nu există **sau** parola e greșită — același cod și același mesaj în ambele cazuri |
| `423` | `Cont blocat temporar. Încearcă din nou peste 15 minute.` | după 5 parole greșite la rând; blocarea ține 15 minute, chiar dacă între timp introduci parola corectă |

---

### `POST /api/logout`

Răspuns `200`:

```json
{ "mesaj": "Te-ai delogat." }
```

Tokenul folosit devine invalid: orice cerere ulterioară cu el primește `401`.

---

### `GET /api/conturi`

Răspuns `200`:

```json
{
  "conturi": [
    { "id": 101, "tip": "curent", "iban": "RO55MERI0000000000000101", "valuta": "RON", "sold": 2500, "titular": "Ana Pop" },
    { "id": 102, "tip": "economii", "iban": "RO28MERI0000000000000102", "valuta": "RON", "sold": 10000, "titular": "Ana Pop" }
  ]
}
```

---

### `GET /api/conturi/{id}`

Exemplu: `GET /api/conturi/101` → `200` cu un singur cont (aceleași câmpuri ca mai sus).

Erori:

| Cod | Mesaj | Când |
|-----|-------|------|
| `403` | `Nu ai acces la acest cont.` | contul există, dar e al altui client |
| `404` | `Cont inexistent.` | nu există cont cu acest id |

---

### `GET /api/conturi/{id}/tranzactii`

Parametru opțional în URL: `tip=debit` (doar ieșiri) sau `tip=credit` (doar încasări).
Exemplu: `GET /api/conturi/101/tranzactii?tip=debit`
(în Postman îl poți scrie în URL sau în tab-ul **Params**).

Răspuns `200` — cele mai noi tranzacții primele; o sumă negativă e o ieșire:

```json
{
  "contId": 101,
  "numar": 2,
  "tranzactii": [
    { "id": "T-1006", "data": "2026-10-22", "descriere": "EMAG.RO comanda 90412", "suma": -1249, "tip": "debit" },
    { "id": "T-1005", "data": "2026-10-18", "descriere": "Transfer de la Pop Maria", "suma": 150, "tip": "credit" }
  ]
}
```

`numar` = câte tranzacții sunt în listă.

Erori:

| Cod | Mesaj | Când |
|-----|-------|------|
| `400` | `Parametrul tip poate fi doar debit sau credit.` | altă valoare la `tip` |
| `403` | `Nu ai acces la acest cont.` | contul e al altui client |
| `404` | `Cont inexistent.` | nu există cont cu acest id |

---

### `POST /api/transferuri`

Body:

```json
{
  "contSursa": 101,
  "ibanDestinatie": "RO28MERI0000000000000102",
  "suma": 100,
  "descriere": "Economii"
}
```

Reguli:

- `contSursa` — obligatoriu, id-ul unui cont **al tău**.
- `ibanDestinatie` — obligatoriu, IBAN românesc valid: 24 de caractere, începe cu `RO`,
  cifrele de control corecte. Poate fi un cont Meridian (banii ajung imediat în el) sau un
  cont de la altă bancă. Nu poate fi chiar contul sursă.
- `suma` — obligatoriu, **număr mai mare decât 0**. Poți transfera cel mult soldul
  contului sursă — inclusiv tot soldul.
- `descriere` — opțional.

Header opțional **`Idempotency-Key: <un text unic>`** — dacă retrimiți o cerere cu aceeași
cheie (de exemplu după un timeout, când nu știi dacă prima a ajuns), serverul **nu** face al
doilea transfer: răspunde `200` cu transferul deja creat, iar soldul nu se mai modifică.

Răspuns `201`:

```json
{
  "id": 5001,
  "contSursa": 101,
  "ibanDestinatie": "RO28MERI0000000000000102",
  "suma": 100,
  "descriere": "Economii",
  "stare": "efectuat",
  "data": "2026-10-26T10:15:00.000Z",
  "soldNou": 2400
}
```

`soldNou` = soldul contului sursă după transfer. Transferul apare și în istoricul
contului sursă (și al contului destinație, dacă e un cont Meridian).

Erori:

| Cod | Mesaj | Când |
|-----|-------|------|
| `400` | `Câmpul contSursa este obligatoriu.` | lipsește `contSursa` |
| `400` | `IBAN destinatar invalid.` | IBAN lipsă sau invalid |
| `400` | `Contul sursă și cel destinatar sunt identice.` | IBAN-ul destinație e chiar contul sursă |
| `400` | `Câmpul suma este obligatoriu.` | lipsește `suma` |
| `400` | `Suma trebuie să fie un număr mai mare decât 0.` | `suma` nu e număr, e 0 sau e negativă |
| `400` | `Fonduri insuficiente.` | `suma` e mai mare decât soldul |
| `403` | `Nu ai acces la acest cont.` | `contSursa` e contul altui client |
| `404` | `Contul sursă nu există.` | nu există cont cu acest id |

---

### `GET /api/transferuri/{id}`

Răspuns `200` cu transferul (aceleași câmpuri ca la creare).

Erori: `404` `Transfer inexistent.` — nu există, sau e transferul altui client.

---

### `GET /api/beneficiari`

Răspuns `200`:

```json
{
  "beneficiari": [
    { "id": 1, "nume": "Maria Pop", "iban": "RO31BTRL0123456789012345", "alias": "Mama" },
    { "id": 2, "nume": "Popescu Ion", "iban": "RO95RNCB0090000123456789", "alias": "Chirie" }
  ]
}
```

---

### `POST /api/beneficiari`

Body:

```json
{ "nume": "George Popa", "iban": "RO66BACX0000001234567890", "alias": "Frate" }
```

Reguli:

- `nume` — obligatoriu.
- `iban` — obligatoriu, IBAN românesc valid (aceleași reguli ca la transferuri).
- `alias` — opțional.

Răspuns `201` cu beneficiarul creat:

```json
{ "id": 4, "nume": "George Popa", "iban": "RO66BACX0000001234567890", "alias": "Frate" }
```

Erori:

| Cod | Mesaj | Când |
|-----|-------|------|
| `400` | `Câmpul nume este obligatoriu.` | lipsește `nume` |
| `400` | `IBAN invalid.` | IBAN lipsă sau invalid |
| `409` | `Ai deja un beneficiar cu acest IBAN.` | IBAN-ul e deja în lista ta |

---

### `PATCH /api/beneficiari/{id}`

Trimiți **doar câmpurile pe care vrei să le schimbi**; celelalte rămân cum erau.

Body (exemplu):

```json
{ "alias": "Mami" }
```

Răspuns `200` cu beneficiarul complet, după modificare.

Erori: `400` `IBAN invalid.` · `404` `Beneficiar inexistent.` — id-ul nu există sau nu e al tău.

---

### `DELETE /api/beneficiari/{id}`

Răspuns `200`:

```json
{ "mesaj": "Beneficiar șters." }
```

Erori: `404` `Beneficiar inexistent.` — id-ul nu există sau nu e al tău.

---

### `POST /api/reset`

Unealtă pentru exersare: readuce toate datele la starea inițială și invalidează toate
tokenurile. Folosește-l când vrei să o iei de la capăt. Nu face parte din ce testezi.

Răspuns `200`:

```json
{ "mesaj": "Datele au fost resetate la starea inițială." }
```
