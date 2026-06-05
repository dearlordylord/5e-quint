# L3MMETA-06 Quickened Remaining Action-Spells Survey

## Scope

Task 6 surveys the current supported Spell Procedure Profile registry and
recommends one runnable next Quickened Spell slice. It does not promote new
runtime behavior; Task 7 owns that implementation.

RAW and domain checks consulted:

- `.references/srd-5.2.1/Classes/Sorcerer.md#Level 2: Metamagic`
- `.references/srd-5.2.1/Classes/Sorcerer.md#Quickened Spell`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md#Casting Time`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Eldritch Blast`
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md#Scorching Ray`
- `.references/srd-5.2.1/Rules-Glossary.md#Attack Roll`
- `.references/srd-5.2.1/Rules-Glossary.md#Spell Attack`
- `.references/srd-5.2.1/Playing-the-Game.md#Bonus Actions`
- `UBIQUITOUS_LANGUAGE.md#Action Lifecycle`
- `UBIQUITOUS_LANGUAGE.md#Spell Invocation`

Quickened Spell changes a spell with action casting time to a Bonus Action for
that casting, costs 2 Sorcery Points, and imposes the same-turn level 1+ spell
limit. The runtime boundary should therefore promote procedure shapes only when
the procedure can thread `actionCostOverride: "bonusAction"` and
`metamagicApplications` through the existing spell-cast resource boundary.

## Current Promoted Quickened Procedures

`unit-feature.metamagic-cast-governor-quickened` is currently a
profile-subset-supported claim. The promoted `bonusActionRewrite` procedures in
`REGISTERED_SPELL_PROCEDURE_PROFILES` are:

| Procedure | Current evidence |
|---|---|
| `directHitPointRestoration` | Quickened Cure Wounds runtime and governor MBT coverage |
| `scalarBuff` | Quickened False Life runtime and governor MBT coverage |
| `saveGatedDamage` | Quickened Burning Hands runtime coverage; core support already marks this admitted |
| `saveGatedCondition` | Quickened Color Spray governor MBT coverage |
| `saveGatedConditionImmunity` | Quickened Calm Emotions governor MBT coverage |
| `directCondition` | Quickened Invisibility governor MBT coverage |
| `rollModifier` | Quickened Bless governor MBT coverage |
| `spellAttackDamage` | Quickened Ray of Frost runtime and selected-identity MBT coverage |

Small evidence note: `unit-feature-quickened-action-spell-procedure-support-core.qnt`
admits `QuickenedSaveGatedDamageProcedure`, but
`unit-feature-quickened-action-spell-procedure-support-core-examples.qnt` omits
the matching positive example assertion. This is evidence-list drift, not a
runtime behavior blocker.

## Remaining Registered Action-Spell Procedures

These registered procedures still have
`metamagicCompatibility: "actionSpellResolverNotRewritten"` and are therefore
blocked from Quickened discovery by
`QUICKENED_ACTION_SPELL_PROCEDURE_UNSUPPORTED_MESSAGE`.

### Closest Procedure Slices

| Procedure | Why it is close | Main Task 7 risk |
|---|---|---|
| `spellAttackSequence` | Already accepts `actionCostOverride` and `metamagicApplications`, resolves through `spendSpellCastResources`, has deterministic admission coverage for Eldritch Blast and Scorching Ray, and has focused Eldritch Blast MBT coverage. | Need selected-identity/governor witness for indexed attack-sequence fills and same-turn Quickened lock across cantrip and slot paths. |
| `attackBurstSaveDamage` | Already accepts `actionCostOverride` and `metamagicApplications`. | It combines an attack and burst save damage, so the first slice would exercise both attack and save fill families at once. |
| `chainedSpellAttackDamage` | Already accepts `actionCostOverride` and `metamagicApplications`. | Cast-local damage-type choice plus chained replay makes it larger than a first remaining Quickened slice. |

### Save Or Control Lifecycles

These procedures have Metamagic plumbing in places, but their runtime value is
mostly target/save lifecycle or control-state specific rather than a narrow
action-cost rewrite:

- `command`
- `hideousLaughter`
- `hypnoticPattern`
- `sleepTargetAdmission`
- `abilityD20TestRollModeSaveGate`
- `saveGatedAttackRollAdvantage`
- `conditionImmunityAndTurnStartTemporaryHitPoints`
- `creatureSizeIncrease`
- `creatureSizeDecrease`
- `creatureTypeProtection`
- `conditionRemovalProtection`
- `directConditionRemoval`
- `levitatedCreature`

### Ongoing Area, Zone, Object, And Table-Witnessed Effects

These procedures are valid future Quickened candidates but are worse as the
next slice because the proof/runtime witness usually has to carry area identity,
movement, object-contact, suppression, or cleanup facts in addition to the
Bonus Action rewrite:

- `antimagicFieldOngoingSpellSuppression`
- `dancingLightsSeparateCast`
- `dancingLightsCombinedCast`
- `flamingSphere`
- `fogCloudObscurement`
- `greaseGroundHazard`
- `gustOfWindLine`
- `magicalDarknessPointOrigin`
- `moonbeam`
- `objectContactDamage`
- `objectLight`
- `spikeGrowthMovementHazard`
- `spiritualWeaponAttackProxy`
- `webRestraintHazard`

### Other Action-Time Effects

These remain valid but lower-priority because they either lack the same close
fit to the promoted spell-attack procedure or do not exercise a broadly reusable
next family:

- `blurAttackRollDefense`
- `damageReduction`
- `heldLight`
- `heldLightHurl`
- `makeStable`
- `mirrorImageHitInterception`
- `persistentArmorEffect`
- `seeInvisibleObserverSight`
- `selfTransformationMode`
- `spellHostedWeaponAttack`
- `thaumaturgyBoomingVoice`
- `wardingBond`
- `repeatedDamageAllocation`

## Recommendation For Task 7

Promote exactly `spellAttackSequence` as the next Quickened procedure slice.

Recommended scope:

1. Change `spellAttackSequenceProfile.metamagicCompatibility` from
   `actionSpellResolverNotRewritten` to `bonusActionRewrite`.
2. Add runtime tests in `battle-runtime-metamagic-resource.test.ts` for:
   - Quickened Eldritch Blast discovery as a `bonusActionSpell`.
   - Quickened Eldritch Blast resolving after the Magic Action is spent.
   - Sorcery Point spend, Bonus Action spend, no Magic Action spend, and
     Quickened same-turn level 1+ lock after the cantrip.
   - At least one Spell Slot `spellAttackSequence` case, using Scorching Ray,
     to confirm Spell Slot spend and same-turn spell-slot accounting.
3. Add a selected-identity MBT witness for the promoted procedure, preferably a
   narrow Eldritch Blast literal projection. Keep the driver as a leaf witness;
   do not import behavioral rule modules.
4. Add the `QuickenedSpellAttackSequenceProcedure` variant or equivalent
   procedure fact to the rule-core Quickened support slice, rather than folding
   it into the existing `QuickenedSpellAttackProcedure` name. The domain shape
   is distinct: one spell invocation with indexed independent attack parts.
5. Update the unit-profile and rules-kernel evidence rows only after the runtime
   and parity witnesses exist.

Why this is the runnable next slice:

- It is the smallest remaining procedure that already has the two mechanical
  hooks Quickened needs: action-cost override and Metamagic applications.
- It extends the already-promoted spell attack family without adding table area
  geometry, ongoing cleanup, or repeat-save identity threading.
- It can use SRD-authored evidence already present in the local corpus:
  Eldritch Blast for cantrip attack-sequence scaling and Scorching Ray for a
  level 2 Spell Slot attack sequence.

## Verification Guidance

For this survey task, no MBT run is needed because no behavior changed.

Task 7 should verify the implementation with:

- `pnpm --filter @dnd/battle-runtime exec vitest run src/battle-runtime-metamagic-resource.test.ts`
- A focused selected-identity MBT run for the new Quickened spell-attack-sequence witness, using the AGENTS.md timing/background protocol.
- `pnpm unit-profile-coverage:check -- --write`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `pnpm quality`
