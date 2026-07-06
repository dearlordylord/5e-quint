# L3MMETA-14 Heightened Area And Multi-Target Repeat-Save Boundary

## Scope

Task 14 resolves the remaining Heightened Spell repeat-save carry-through
shape after the combatant-owned Hideous Laughter slice. It does not promote new
runtime behavior, QNT behavior, selected-identity replay evidence, or generated
ledger rows.

RAW and domain checks consulted:

- `.references/srd-5.2.1/Classes/Sorcerer.md#Heightened Spell`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Grease`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Gust of Wind`
- `packages/surface/content/grease.dhall`
- `packages/surface/content/gust_of_wind.dhall`
- `UBIQUITOUS_LANGUAGE.md#Spell Invocation`
- `UBIQUITOUS_LANGUAGE.md#Spell Effect`
- `UBIQUITOUS_LANGUAGE.md#D20 Rolls`
- `UBIQUITOUS_LANGUAGE.md#Spellcasting`

Heightened Spell applies to one target of a Spell Invocation and gives that
target Disadvantage on saves against that spell. Grease and Gust of Wind both
create a persisted area Spell Effect that can force later Saving Throws against
the same spell occurrence. Repeating `saveGatedCondition` profiles create later
end-turn Saving Throws from combatant-owned Spell Effects.

## Current Boundary

The support gate remains correctly closed for the remaining repeat-save
families in `packages/battle-runtime/src/battle-reducer/metamagic-support.ts`:

- `greaseGroundHazard`
- `gustOfWindLine`
- `saveGatedCondition` when `effect.repeatSave !== null`

Current active-effect ownership differs by family:

- `greaseGroundHazard` and `gustOfWindLine` effects are stored on the source
  combatant, keyed by `sourceCombatantId`, `sourceSpellId`, and `areaId`.
- `gustOfWindLine` also stores mutable `directionId`, but a direction change is
  a property change on the same Line occurrence, not a new authored spell or a
  new selected target.
- Repeating `saveGatedCondition` effects are stored on each failed target as
  `spellConditionEndTurnSave`, so the active-effect owner is the later save
  target.

The current supported Heightened claim already says the remaining area and
multi-target repeat-save lifecycles are deferred under
`L12G-FOLLOWUP-SORCERER-METAMAGIC-SAVE-OPTIONS`. That remains correct.

## State-Shape Decision

Do not add a registry keyed by authored spell id, spell name, provenance
section, procedure name, or Metamagic option identity. The selected target is a
fact about one Spell Invocation's created Spell Effect occurrence.

Area Spell Effects need an explicit selected-target rider because the effect is
not owned by the affected target. The future area shape should colocate the
selected target id with the area occurrence:

```typescript
type AreaSpellEffectHeightenedRepeatSaveRider =
  | null
  | {
      readonly kind: "heightenedSpellTargetDisadvantage";
      readonly targetId: CombatantId;
    };
```

Attach that rider to the active area effect that already owns later save hole
creation:

- `greaseGroundHazard`: the rider belongs beside `areaId`, `save`, and
  `expiresAt`.
- `gustOfWindLine`: the rider belongs beside `areaId`, `directionId`, `save`,
  `pushDistanceFeet`, movement cost, and expiration. Direction replacement must
  preserve the rider because it changes the Line direction, not the selected
  Heightened target.

The later area save hole builders should add the Disadvantage projection only
when the triggering `targetId` equals the rider's `targetId`. This keeps
ordinary area membership, movement facts, push facts, and save outcomes table
supplied; Heightened only contributes the roll-mode fact for the selected
target.

Repeating `saveGatedCondition` should follow the combatant-owned Hideous
Laughter pattern instead of the area pattern. The target id is already the
active-effect owner, so storing it again would allow contradictory state. The
future `spellConditionEndTurnSave` shape should carry only a presence rider:

```typescript
type CombatantOwnedRepeatSaveRollModeRider =
  | null
  | "heightenedSpellTargetDisadvantage";
```

Populate that rider only for a failed target whose id matched the
`heightenedSpellTargetId` selected during the Spell Invocation. Later end-turn
save holes can derive the target from the owning combatant and combine the
rider through the existing Saving Throw roll-mode projection semantics.

## Family Decisions

`greaseGroundHazard` should be its own first area slice. The cast applies
Prone immediately to failed on-cast targets and creates a persisted ground
hazard. The Heightened rider belongs on the ground-hazard occurrence, not on
the initial failed target list, because the later entry and end-turn saves are
created from the active hazard and can involve the selected target later.

`gustOfWindLine` should be a separate area slice from Grease. It has the same
selected-target rider shape, but its later save also owns push facts and a
mutable Line direction. The selected target must survive Bonus Action direction
replacement, while the hole remains keyed to the current direction facts that
validate the table-supplied Line.

Repeating `saveGatedCondition` should be a separate combatant-owned
multi-target slice. Multi-target casting can create several failed-target
active effects, but only the failed target matching the selected Heightened
target receives the presence rider. This slice should not introduce area
identity or selected-target storage on the active effect.

## Support Gate And Evidence

Leave all three support gates closed until each promoted family has focused
runtime tests, focused QNT parity, and selected-identity evidence:

1. `greaseGroundHazard`: prove on-cast selected target carry-through into
   entry and end-turn Grease saves, with non-selected targets unaffected.
2. `gustOfWindLine`: prove initial selected target carry-through into end-turn
   Line saves and through direction replacement, with push facts still
   validated by the Line occurrence.
3. repeating `saveGatedCondition`: prove multi-target failed effects attach
   the presence rider only to the selected failed target and apply it to the
   later end-turn save.

Each slice should update the focused QNT owner before runtime support is
opened. Selected-identity replay rows, and paired QNT replay owners when needed,
should be added only after runtime and QNT owners carry the occurrence-local
rider.

## Connascence Check

The strong coupling is occurrence identity: later save commands must find the
same Spell Effect occurrence that the cast created. For area effects, the
coupled facts are `sourceCombatantId`, `sourceSpellId`, `areaId`, and for Gust
the current `directionId` used by spatial validation. The Heightened target
rider must live with that occurrence so a change to area identity cannot leave
an out-of-band selected target behind.

For combatant-owned repeat saves, the coupled fact is the active-effect owner.
Adding `targetId` to the active effect would create distant value connascence
between the map key and a stored field. The presence-only rider avoids that
duplication.

## Plan Impact

Task 14 should be marked done as a boundary resolution. No existing runtime
profile should be promoted by this task.

The future implementation work should be split into concrete follow-up tasks:

- `L3MMETA-20-HEIGHTENED-GREASE-AREA-REPEAT-SAVE-SLICE`
- `L3MMETA-21-HEIGHTENED-GUST-OF-WIND-LINE-REPEAT-SAVE-SLICE`
- `L3MMETA-22-HEIGHTENED-SAVE-GATED-CONDITION-MULTITARGET-REPEAT-SAVE-SLICE`

`L12G-FOLLOWUP-SORCERER-METAMAGIC-SAVE-OPTIONS` remains the umbrella
follow-up in generated unit-claim artifacts until those concrete slices update
runtime, QNT, selected-identity, and ledger evidence.

## Verification Guidance

No MBT run is needed for this boundary task because no runtime behavior
changed.

Reviewer-loop convergence:

- RAW/ubiquitous-language pass: confirmed Heightened Spell, Grease, and Gust of
  Wind text in the SRD corpus and used Spell Invocation / Spell Effect language
  for ownership.
- Architecture/domain pass: rejected authored-identity dispatch and rejected a
  parallel selected-target registry.
- Connascence pass: localized selected-target state to the active Spell Effect
  occurrence for areas and to a presence rider for combatant-owned effects.
- Code-review pass: no executable code changed; the existing support gate stays
  closed.

Future implementation slices should verify with focused runtime tests, focused
QNT owner tests, selected-identity replay only after runtime and QNT witnesses
exist, and then:

- `pnpm unit-profile-coverage:check -- --write`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `pnpm quality`
