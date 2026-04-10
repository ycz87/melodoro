# Issue #83 Proof

## Validation
- `npm run build`
- `npm run lint`

Both commands passed locally on `feature/issue-83-circus-tent-loop`.

## Manual proof log

### 1. First activation clears thief and enables same-day protection + growth bonus
Setup before click (localStorage on `http://127.0.0.1:4173/`):

```json
{
  "guardianBarrierDate": "",
  "circusTentActivatedAt": 0,
  "thiefPresent": true,
  "circusTentCount": 2
}
```

After clicking the Farm chip `Melon Circus Tent · 2`:

```json
{
  "guardianBarrierDate": "2026-04-10",
  "circusTentActivatedAt": 1775780726334,
  "thiefPresent": false,
  "circusTentCount": 1
}
```

Observed UI state after the click:
- Farm chip changed to `Melon Circus Tent · +20% · Today`
- Existing guardian barrier chip also became active because the protection truth source is still `guardianBarrierDate`
- The active circus-tent chip was disabled, preventing same-day re-trigger

### 2. Reload keeps the active state and persisted effect
After a full page reload and reopening Farm:

```json
{
  "guardianBarrierDate": "2026-04-10",
  "circusTentActivatedAt": 1775780726334,
  "thiefPresent": false,
  "circusTentCount": 1
}
```

Observed UI state after reload:
- Farm chip still rendered as `Melon Circus Tent · +20% · Today`
- Chip remained disabled

### 3. Same-day repeat use is a no-op
Attempted a second activation on the same day by clicking the disabled Farm chip again:

```json
{
  "buttonDisabled": true,
  "beforeActivatedAt": 1775780726334,
  "afterActivatedAt": 1775780726334,
  "beforeBarrierDate": "2026-04-10",
  "afterBarrierDate": "2026-04-10",
  "beforeCount": 1,
  "afterCount": 1
}
```

This confirms the repeat action does not re-activate, does not move the bonus start timestamp, and does not deduct inventory again.

### 4. Cross-day persisted state expires automatically
Simulated next-day persisted storage by writing yesterday's `guardianBarrierDate` and `circusTentActivatedAt`, then forcing a full reload:

```json
{
  "guardianBarrierDate": "2026-04-09",
  "circusTentActivatedAt": 1775694484178,
  "thiefPresent": true,
  "circusTentCount": 1,
  "buttonDisabled": false,
  "buttonText": "Melon Circus Tent · 1"
}
```

Observed UI state after the reload:
- The active `+20% · Today` state disappeared
- The chip returned to its normal inventory label `Melon Circus Tent · 1`
- The chip was enabled again
- A thief remained present, showing the expired prior-day protection no longer auto-clears or blocks the current-day thief state

## Implementation note for additive bonus behavior
`circus-tent` now feeds the existing `calculateFarmGrowthBonusMinutes()` path. The function sums weighted overlap from:
- circus-tent: `0.20`
- lullaby: `0.30`
- supernova bottle: `0.50`

That keeps the three buffs additive in one existing bonus bucket instead of creating a separate multiplier path.
