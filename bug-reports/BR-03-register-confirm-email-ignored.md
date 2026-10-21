# BR-03 — Registration: "Confirmă adresa de email" is never compared to the email

| | |
|---|---|
| **App** | Registration — [`register/index.html`](../register/index.html) |
| **Environment** | Brave (Chromium), macOS, desktop width |
| **Type** | Functional / Validation |
| **Severity** | Major |
| **Priority** | Medium |

## Preconditions

- The "Deschide cont curent" page is open.

## Steps to reproduce

1. Fill in every required field with valid data:
   - **Nume complet**: `Ana Pop`
   - **Adresă de email**: `ana.pop@exemplu.ro`
   - **Parolă** / **Confirmă parola**: `Parola123` / `Parola123`
   - **CNP**: `2900101123456`
   - **Data nașterii**: `01.01.1990`
   - **Telefon**: `0722123456`
   - **Județ**: any
   - tick **Sunt de acord cu termenii și condițiile.**
2. In **Confirmă adresa de email**, type a different address: `alt.email@exemplu.ro`.
3. Click **Creează cont**.

## Expected result

The account is not created. An error under **Confirmă adresa de email** says the
two addresses do not match.

## Actual result

The account is created: "Cont creat pentru ana.pop@exemplu.ro." and a new line
appears in "Conturi create". The confirmation field has no effect at all.

## Notes

- The confirmation field exists to catch typos in the email. If it is not
  checked, a customer with a typo never receives the activation email and cannot
  recover the account.
- The **Confirmă parola** field should get the same "values match" test.
