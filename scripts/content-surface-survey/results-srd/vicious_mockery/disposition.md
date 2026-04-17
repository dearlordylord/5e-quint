# Disposition — vicious_mockery

**Session:** 2026-04-16 (§A1 + §A13 landed)
**Outcome:** clean

## Notes

Full auth after §A13 landed. composite onFail now carries damage + modify_roll_advantage (disadvantage, count=1, expiresOn=end_of_next_turn). Duration bent to timed 1 round per Ray of Sickness convention to host the rider.

## Landed widenings

- EffectAtom.modify_roll_advantage { count?, expiresOn? } — §A13

## Artifacts
- `packages/prototype-content-surface/content/vicious_mockery.dhall`
- `packages/prototype-content-surface/content/vicious_mockery.json`
