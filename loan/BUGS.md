# Simulare credit page — bug key (spoilers)

> Don't read this before testing. Test the page first, write your bug reports, *then* compare.

Context: a loan simulator for "Meridian Bank". You enter an amount, a period and
your net monthly income, optionally tick life insurance, and press **Calculează**.
No backend — a successful calculation just adds a line to "Simulări efectuate".

The stated limits (in the page subtitle): amount 1.000–150.000 RON, period 6–120
luni. Nominal rate is fixed at 9,49% / an, plus a 1% one-time analysis commission.

## Planted bugs (14)

| # | Category | Bug | Where to find it | How to reproduce |
|---|----------|-----|------------------|------------------|
| 1 | Functional / calc | Monthly installment ~3x too high — annual rate used as the monthly rate | "Rată lunară" | Simulate 20.000 RON / 36 luni. Shown rata ≈ 1.974 RON; the correct annuity installment at 9,49%/an is ≈ 640 RON. The code uses `RATE/100` per month instead of `RATE/100/12`. |
| 2 | Functional / UI | Text field ↔ slider sync is one-way | Sumă / Perioadă | Drag the slider → the number updates. Type `100000` into the number field → the slider stays put. The two controls now disagree and the calculation uses whichever you typed, with no visual cue. |
| 3 | Validation / boundary | Amount has no min / max / sign check | Sumă credit | Enter `500` (below the 1.000 minimum), `900000` (above the 150.000 maximum) or `-5000` → all accepted. Negative amount produces a negative rata. |
| 4 | Validation / boundary | Period accepts 0 | Perioadă (luni) | Enter `0` and calculate → "Rată lunară" shows `Infinity RON` (division by zero in the annuity formula). Also try a negative period. |
| 5 | Validation | Monthly income is never validated | Venit lunar net | Leave it empty or enter `0` and calculate → the affordability line reads "Rata reprezintă NaN% din venitul tău" / "Infinity%". Negative income is also accepted. |
| 6 | Functional | Affordability (DTI) threshold is wrong | Line under the results | The "Nu ești eligibil" warning only triggers when the rate is **over 100%** of income. Enter an income where the rata is ~90% of it → it still says "Ești eligibil". The regulated limit is around 40%. |
| 7 | Data integrity | "Total de plată" ≠ "Rată lunară" × perioadă | Results grid | 20.000 / 36 luni → Rată lunară ≈ 1.974 RON (×36 ≈ 71.000) but "Total de plată" shows ≈ 21.898 RON. Total is computed with a separate simple-interest formula that ignores the term entirely. |
| 8 | UI / Functional | Inconsistent money formatting | All result boxes | Values print as `21898.00 RON` — dot decimal, no thousands separator — while the rest of the site uses `21.898,00 RON`. "Total dobândă" is printed raw, so floating-point noise like `1897.6800000000003 RON` appears. |
| 9 | Functional | "Asigurare de viață" checkbox does nothing to the rate | Insurance checkbox vs. "Rată lunară" | Calculate, note the rata. Tick "Adaugă asigurare de viață", calculate again → "Rată lunară" is identical. "Asigurare / lună" shows a value, but it is never added into the installment or the total. |
| 10 | Functional | DAE equals the nominal rate | "DAE" box | DAE always shows `9.49%`, the same as the nominal rate, no matter the amount or period. A real DAE must include the 1% analysis commission (and insurance when selected), so it should always be higher than 9,49%. |
| 11 | Accessibility | Broken label association + wrong input type | "Sumă credit" label / all number inputs | The "Sumă credit" label's `for="sumaField"` points to a non-existent id (input id is `amountField`) — clicking the label doesn't focus the field. All numeric fields are `type="text"`, so mobile shows a text keyboard and the browser gives no numeric validation. The two range sliders have no `<label>` at all. |
| 12 | UI / GUI | Result values get clipped | Result boxes | Trigger a large number (e.g. amount `900000`, or just the inflated rata from bug 1 on a big loan). The `.result-box` has a fixed `height: 60px` with `overflow: hidden` and `white-space: nowrap`, so long values are cut off instead of wrapping or shrinking. Also check narrow / mobile widths. |
| 13 | Functional | Stale result is never cleared or flagged | Results panel after editing inputs | Calculate. Then move the amount slider (the number field updates, bug 2). The whole results panel and the eligibility verdict still show the previous calculation, with no "învechit" / "recalculează" indication. A user can read numbers that no longer match the form. |
| 14 | Functional / Security | Double-submit not prevented | "Calculează" button | Click it rapidly several times → one "Simulări efectuate" row per click. The button is never disabled and there is no in-flight guard. |

## Reasoning-trap note

**Bug 13** is this round's "I assumed it was intentional" trap. Many simulators
only recompute on button press, so it is tempting to treat the stale panel as
expected behaviour and not report it. It is still a defect: the displayed rate,
total and eligibility verdict silently stop matching the form, with nothing on
screen saying so. **Report the observed inconsistency and let the product owner
decide whether it's acceptable — don't pre-excuse it.**

**Bug 2** is a softer version of the same trap: "the slider is just a rough
input, typing is the precise one" sounds reasonable, but two controls bound to
the same value that silently disagree is a real finding.

## Suggested test-category checklist for this page

- Functional / calc: cross-check rata against an independent annuity calculation; rata × perioadă vs. "Total de plată"; DAE vs. nominal; insurance on/off
- Validation / boundary: amount below 1.000 / above 150.000 / zero / negative / non-numeric; period 0 / negative / non-multiple of 6; income empty / 0 / negative
- Cross-field / state: slider vs. text field agreement; result panel after changing inputs without recalculating
- Formatting: decimal separator, thousands grouping, number of decimals, floating-point noise, currency label
- Affordability logic: find the exact income where the verdict flips; compare to a sane DTI limit (~40%)
- Accessibility: click each label to focus its field; keyboard-only operation of the sliders; input types on mobile
- UI / GUI: result boxes with very large values; layout at 375–414px width

## Notes / rejected false positives

- The native `<input type="range">` thumb styling differing between browsers is not a bug.
- The rate being fixed (not user-editable) is a product decision, not a defect.
- "Simulări efectuate" not persisting after a page reload is expected — there is no backend.
