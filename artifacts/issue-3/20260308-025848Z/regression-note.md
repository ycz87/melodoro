# Issue #3 Regression Note

## Scope
- Fix the remaining mobile bottom abnormal blank-area problem called out in review.
- Keep desktop visuals on the same path as the previous proof.

## What changed
- Removed the `720px` cap for `compactMode + narrow screen` farm scene height, so the farm review scene now fills the mobile viewport instead of ending early.
- Changed the compact review shell background to match the farm scene gradient, preventing a dark green break if extra area is exposed.

## Regression check
- `390x844`: no black edge / dark bottom band; main 3x3 plot region remains fully visible on first screen.
- `360x800`: no black edge / dark bottom band; main 3x3 plot region remains fully visible on first screen.
- `1440x900`: no obvious desktop visual regression observed.

## Proof
- `mobile-390x844-fix2.png`
- `mobile-360x800-fix2.png`
- `desktop-1440x900-fix2.png`
