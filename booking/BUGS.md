# Hotel booking page — bug key (spoilers)

> Don't read this before testing. Test the page first, write your bug reports, *then* compare.

Context: a room-booking page for "Hotel Brezaia" (made-up name). No login, no backend:
bookings live in memory and disappear on reload. You can:

- **Book a room** — check-in / check-out dates, room type, adults, children, optional
  breakfast, a promo code (**Aplică**), contact details, then **Rezervă**. A price
  summary updates as you fill in the form.
- **See your bookings** — three already exist; each has an **Anulează** button.
  "Total rambursat" adds up the refunds.

Unlike the older apps, the source files carry **no bug comments**: the rules on the page
(the "Regulile de rezervare" panel) are the specification.

The "current day" is pinned to **Thursday, 10 December 2026** and the page prints it as
*"Azi: joi, 10.12.2026"*. Days are counted in whole calendar days.

Existing bookings (all for Maria Ionescu, maria.ionescu@example.com):

| ID | Room | Stay | Guests | Extras | Total | Days until check-in |
|----|------|------|--------|--------|-------|---------------------|
| RZ-1002 | Standard | 12.12–14.12.2026 (Sat, Sun nights) | 2 adults | — | 680,00 | **2** → free cancellation |
| RZ-1003 | Deluxe | 11.12–13.12.2026 (Fri, Sat nights) | 2 adults | breakfast | 1.260,00 | 1 → first night (540) kept |
| RZ-1004 | Standard | 05.01–08.01.2027 (Tue–Thu nights) | 1 adult | FIRST50 used | 865,00 | 26 → free cancellation |

The apartment (only one) is already taken **20.12–23.12.2026** by another guest
(nights of 20, 21 and 22 December).

Default form values: Standard, 2 adults, 18.12 → 20.12.2026 (Friday + Saturday night).
Correct total: 2 × 360 + tax 2 × 2 × 5 = **740,00 RON**. The page shows **680,00 RON**.

## Planted bugs (19)

| # | Category | Severity | Bug |
|---|----------|----------|-----|
| 1 | Validation / boundary | High | Check-out = check-in (0 nights) is accepted; booking created with total 0,00 RON |
| 2 | Functional (business rule) | High | Weekend surcharge applied to Saturday and **Sunday** nights instead of Friday and Saturday |
| 3 | Boundary | Medium | 15 nights accepted (limit is 14); 16 is rejected |
| 4 | Functional (calculation) | Medium | Breakfast for children charged 40 RON/night instead of 20 |
| 5 | Functional (calculation) | High | IARNA15 discount also applied to the city tax |
| 6 | Functional | Low | Promo code is case-sensitive: `iarna15` rejected |
| 7 | Business rule | High | FIRST50 can be reused with the same email (e.g. maria.ionescu@example.com, who already used it on RZ-1004) |
| 8 | Validation | Medium | Standard room accepts 3 adults (only the 3-person total is checked, not the 2-adult limit) |
| 9 | Functional (availability) | Critical | Apartment overlap check only looks at the check-in date: 18.12–21.12 is accepted (double booking); 21.12–22.12 is correctly rejected |
| 10 | Boundary (business rule) | High | Cancelling exactly 2 days before check-in keeps the first night (RZ-1002 refunds 320 instead of 680) |
| 11 | State transition | High | Cancelled bookings keep the **Anulează** button; each click adds the refund to "Total rambursat" again |
| 12 | Validation | Medium | Email only checks for an `@` after some text: `ana@`, `ana@x` are accepted |
| 13 | UI / data integrity | High | Ticking **Mic dejun inclus** doesn't update the summary; the booking is saved with the breakfast included, so the confirmed total differs from what was shown |
| 14 | Security (XSS) | High | The name is inserted into the bookings list as HTML: `<img src=x onerror="alert(1)">` runs |
| 15 | Accessibility | Low | Invalid promo code is signalled only by a red border: no text, no `aria` message |
| 16 | Accessibility | Low | "Copii" is a `<span>`, not a `<label for="children">` — the select has no accessible name |
| 17 | Security / double submit | High | **Rezervă** is not disabled while "Se procesează…": a double click creates two bookings |
| 18 | Validation | High | Check-in in the past (e.g. 01.12.2026) is accepted — only the date picker's `min` stops it, typing the date bypasses it |
| 19 | Validation | Medium | Phone accepts 9 digits (`071234567`); 11 digits is correctly rejected |

## How to reproduce

**1.** Set check-out equal to check-in → summary shows 0 nights, **Rezervă** creates a 0,00 RON booking.
Expected: "Check-out-ul trebuie să fie după check-in."

**2.** Default dates 18.12 → 20.12 (Fri + Sat): summary says *"din care 1 de weekend"*, cazare 660.
Expected 2 weekend nights, 720. Also 13.12 → 14.12 (Sunday night only) gets the +20%.

**3.** 10.01.2027 → 25.01.2027 (15 nights) is booked. 26.01 is rejected with "cel mult 14 nopți".

**4.** 1 adult + 1 child, 1 weekday night, breakfast → breakfast 80 RON, expected 60 RON.
(Tick breakfast *before* changing another field — see bug 13.)

**5.** Default form + IARNA15: reducere −126,00 = 15% × (660 + 0 + 20). Expected 15% of
cazare + mic dejun only. With the correct weekend rule: 15% × 720 = 108, total 632.

**6.** Type `iarna15` → **Aplică** → red border, no discount.

**7.** Email `maria.ionescu@example.com`, code FIRST50 → booking accepted with −50 RON. Book a
second time with the same email + FIRST50 → accepted again.

**8.** Standard, 3 adults, 0 children → accepted. 1 adult + 3 children → correctly rejected.

**9.** Apartament 18.12 → 21.12.2026 → booked although 20.12 is taken. 21.12 → 22.12 is rejected.
Also 19.12 → 24.12 (wraps the whole occupied period) is accepted.

**10.** Cancel RZ-1002 (check-in 12.12, 2 days away) → "Rambursat: 320,00 RON". Expected 680,00.
RZ-1003 (1 day) correctly refunds 720; RZ-1004 correctly refunds 865.

**11.** Cancel RZ-1004 → Total rambursat 865. Click **Anulează** again → 1.730,00.

**12.** Email `ana@` → booking accepted.

**13.** Load the page, tick **Mic dejun inclus** → total stays 680,00. Fill in contact, **Rezervă**
→ "Total: 840,00 RON" in the confirmation and in the list.

**14.** Name `<img src=x onerror="alert(1)">` → alert when the booking is listed.

**15.** Promo `ABC` → **Aplică** → only the border turns red.

**16.** Inspect "Copii": `<span class="pseudo-label">`, not a label; a screen reader announces
an unnamed combobox. "Adulți" is a proper label for comparison.

**17.** Valid form, double-click **Rezervă** quickly → two bookings with consecutive IDs.

**18.** Type 01.12.2026 into check-in (the picker greys out past days, typing does not) → booked.

**19.** Phone `071234567` (9 digits) → booked. `07123456789` (11) is rejected.

## What correct behaviour looks like (quick reference)

- Nights: 1–14. Check-in from 10.12.2026 to 10.12.2027 (365 days).
- Weekend = nights starting on Friday or Saturday, room price × 1,2.
- Breakfast 40/adult/night, 20/child/night. City tax 5/adult/night.
- IARNA15: −15% of (cazare + mic dejun), ≥ 2 nights, check-in ≤ 28.02.2027.
- FIRST50: −50 RON, once per email. Codes case-insensitive. One code per booking.
- Capacity: Standard 2 adults / 3 people, Deluxe 3 / 4, Apartament 4 / 6.
- Cancel: ≥ 2 days before check-in → full refund; otherwise refund = total − first night's room price.
  A cancelled booking can't be cancelled again.

## Bonus bugs (found during practice, not planted)

| # | Category | Severity | Bug |
|---|----------|----------|-----|
| B1 | Functional (availability) | Critical | A new Apartament booking doesn't make the apartment unavailable: only the pre-existing 20.12–23.12 stay is checked, so the same dates (e.g. 05.01–07.01.2027) can be booked again and again. Found 2026-11-05. |
| B2 | UX (observation) | Low | The price summary still shows a total for a stay the form will reject (e.g. 16 nights) — nothing marks it as invalid. Spec is silent; reported as an observation. Found 2026-11-05. |
