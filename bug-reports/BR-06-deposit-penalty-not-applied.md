# BR-06 — Term deposits: early-liquidation penalty is shown but never applied

| | |
|---|---|
| **App** | Term deposits — [`deposit/index.html`](../deposit/index.html) |
| **Environment** | Brave (Chromium), macOS, desktop width |
| **Type** | Functional / Calculation |
| **Severity** | Critical |
| **Priority** | High |

## Preconditions

- The "Depozite la termen" page is open. The page date is "Azi: joi, 3 septembrie 2026".
- Current account balance: 25.000,00 RON.
- Active deposit **D-1003**: 8.000,00 RON, 6 months, 4,00% p.a., opened
  2026-08-18 (16 days ago), maturity 2027-02-18.

## Steps to reproduce

1. On deposit **D-1003**, click **Lichidează anticipat**.
2. Read the panel: Principal, Zile scurse, Dobândă recalculată, Vei primi.
3. Click **Confirmă lichidarea anticipată**.
4. Check the message, the current account balance and the history.

## Expected result

The amount credited is the amount shown in the panel before confirming:

- Principal 8.000,00 RON + recalculated interest at the penalty rate
  (0,25% p.a. for 16 days) 0,88 RON = **8.000,88 RON**.
- Current account: 25.000,00 → 33.000,88 RON.

## Actual result

The panel shows "Vei primi **8.000,88 RON**", but after confirming:

- Message: "Depozit lichidat. Ai primit **8.160,00 RON**."
- Current account: 25.000,00 → **33.160,00 RON**.
- History: "Lichidare anticipată D-1003 · +8.160,00 RON".

8.160,00 = 8.000 + the full 6-month interest (160,00). The penalty is ignored,
and the customer receives the full interest for a deposit held only 16 days.

## Notes

- The confirmed amount differs from the amount shown to the customer just
  before confirming. Any such difference is a defect, whichever side it favours.
- Financial impact: the bank pays 159,12 RON too much on this one deposit.
