# L3MSPEC-01 Candidate Triage

Task 1 classifies the morning Level 3 species and class-feature candidates
before implementation. This task changes no runtime behavior, QNT, Surface
schema, Unit catalog admission, or generated coverage files.

## RAW And Vocabulary Checked

- `.references/srd-5.2.1/Character-Origins.md:99-127`: Dragonborn has one
  Draconic Ancestry choice that affects Breath Weapon and Damage Resistance.
  Breath Weapon replaces one Attack-action attack with a Cone or Line,
  Dexterity saving throw, save-for-half damage, character-level dice scaling,
  and a Proficiency Bonus Long Rest use pool. Damage Resistance is keyed to the
  same Draconic Ancestry damage type. Darkvision is a 60-foot sense fact.
- `.references/srd-5.2.1/Character-Origins.md:129-139`: Dwarf Darkvision is a
  120-foot sense fact. Dwarven Resilience grants Poison Resistance and
  Advantage on saving throws to avoid or end Poisoned.
- `.references/srd-5.2.1/Character-Origins.md:194-213`: Goliath Powerful Build
  grants Advantage on ability checks to end Grappled and a carrying-capacity
  size fact.
- `.references/srd-5.2.1/Classes/Barbarian.md:58-68`,
  `.references/srd-5.2.1/Classes/Barbarian.md:94-100`, and
  `.references/srd-5.2.1/Classes/Barbarian.md:178-180`: Frenzy is tied to
  active Rage, Reckless Attack used while that Rage is active, the first
  Strength-based hit on the turn, Rage Damage bonus d6 count, and same damage
  type as the triggering weapon or Unarmed Strike.
- `UBIQUITOUS_LANGUAGE.md:7-21`: Ability Check, Saving Throw, Attack Roll,
  Advantage, and Disadvantage are distinct roll-mode terms.
- `UBIQUITOUS_LANGUAGE.md:86-87` and `UBIQUITOUS_LANGUAGE.md:362`: Damage Type
  and Resistance are target-side damage adjustment facts.
- `UBIQUITOUS_LANGUAGE.md:102`, `UBIQUITOUS_LANGUAGE.md:186`, and
  `UBIQUITOUS_LANGUAGE.md:361`: Grappled, Grapple, and escape resolution must
  stay condition/check scoped.
- `UBIQUITOUS_LANGUAGE.md:295-297` and `UBIQUITOUS_LANGUAGE.md:365-366`:
  Darkvision is a sense/illumination projection fact, not a standalone Unit
  procedure.

## Existing Evidence Checked

- `plans/unit-profile-coverage/unit-claims.jsonl`: existing unsupported-profile
  claims already keep the non-Orc species traits out of promoted support.
- `plans/unit-profile-coverage/unit-matrix.json`: the same species rows remain
  unsupported-profile; `barbarian_frenzy` is supported as
  `unit-feature.attack-damage-rider`.
- `plans/unit-profile-coverage/UNIT_REPORT.md`: generated report output
  already lists the same unsupported species reasons and Frenzy support owner.
- `packages/surface/content/species_dragonborn_breath_weapon.dhall`
- `packages/surface/content/species_dragonborn_damage_resistance.dhall`
- `packages/surface/content/species_dwarf_dwarven_resilience.dhall`
- `packages/surface/content/species_goliath_powerful_build.dhall`
- `packages/surface/content/barbarian_frenzy.dhall`
- `packages/battle-runtime/src/unit-profile-admission-martial-action-features.test.ts`
- `packages/battle-runtime/src/battle-runtime-class-action-features.test.ts`

## Candidate Classification

| Candidate | Classification | Owner Boundary | Task Gate |
| --- | --- | --- | --- |
| Dragonborn Breath Weapon | battle-runtime executable, with Character Sheet source facts | A future species attack-replacement profile should consume typed Draconic Ancestry damage type, shape choice, Constitution DC, character-level dice tier, Proficiency Bonus use pool, and Long Rest reset. The runtime must not dispatch on Dragonborn identity. | Unblock Task 2 for Surface/support-profile shape. Task 3 remains blocked on Task 2. |
| Dragonborn Damage Resistance | battle-runtime target-side damage adjustment, with Character Sheet source fact | A passive Resistance profile can be promoted only if it reuses the same typed Draconic Ancestry damage-type source fact as Breath Weapon. Do not duplicate the damage type in a separate resistance-only field. | Unblock Task 4, but require it to share or define the Draconic Ancestry source fact expected by Task 2. |
| Dwarven Resilience poison Resistance | battle-runtime target-side damage adjustment | This is a passive Poison Resistance fact. It must remain separate from the saving-throw roll-mode fact even though both facts originate from one SRD trait. | Unblock Task 5. |
| Dwarven Resilience Poisoned saving throw Advantage | battle-runtime roll-mode support, sourced from the same trait | This is condition-scoped Advantage on saving throws to avoid or end Poisoned. It is not a generic Poisoned condition rule and should not be collapsed into the Resistance profile. | Leave Task 6 blocked on Task 5 so the shared trait/source boundary is settled first. |
| Goliath Powerful Build Grappled escape Advantage | battle-runtime roll-mode support, with a character-sheet sibling fact | The battle-relevant fact is Advantage on ability checks made to end Grappled. The carrying-capacity fact belongs to Character Sheet or inventory projection and must not be copied into battle state. | Unblock Task 7 for the Grappled escape fact only. |
| Goliath Powerful Build carrying capacity | Character Sheet or inventory projection | Count-as-one-size-larger for carrying capacity is durable character/equipment math, not battle execution. | Leave outside Task 7 runtime scope. |
| Species Darkvision | table-owned presentation/sight projection with Character Sheet source facts | Species traits can supply Darkvision range facts, but promoted battle reducers consume observer range, illumination, distance, and visibility projections. Do not create standalone battle Units for species Darkvision. | Revise Task 10 into closure/report work unless the decider wants a separate shared sense-source projection lane. |
| Barbarian Frenzy | battle-runtime attack-damage rider, already supported | Existing evidence admits and executes Frenzy through `unit-feature.attack-damage-rider`; Task 8 should verify there is no missing owner before Task 9 starts. | Leave Task 8 ready for audit. Task 9 should be blocked unless Task 8 finds a real missing slice. |

## Invalid States Rejected

- A Breath Weapon profile with its own damage type and a separate Damage
  Resistance damage type is invalid. Both derive from one Draconic Ancestry
  character source fact.
- A Dwarven Resilience profile that treats Poison Resistance and Poisoned
  saving-throw Advantage as one generic "poison support" flag is invalid. They
  affect different procedures.
- A Powerful Build runtime profile that stores carrying capacity in battle
  state is invalid. Carrying capacity is derivable character/inventory data;
  only the Grappled escape Ability Check Advantage is battle-relevant.
- A Darkvision Unit runtime that treats species trait identity as the executor
  is invalid. Darkvision execution belongs to sight/illumination projection
  over observer facts and table/caller visibility facts.
- A Frenzy implementation that dispatches on `barbarian_frenzy` identity in the
  reducer without parsed attack-damage-rider support facts would be invalid.
  The existing path uses profile admission and runtime owner tests.

## Reviewer Loop

Round 1 RAW and ubiquitous-language pass:

- Confirmed Breath Weapon is battle-runtime executable but needs typed
  character facts for ancestry damage type, character level, Constitution
  modifier, Proficiency Bonus, and resource reset.
- Confirmed Dwarven Resilience and Powerful Build each contain multiple domain
  facts that must be split by procedure owner without losing their single
  authored trait identity.
- Confirmed Darkvision is a sense/source fact feeding sight projection, not a
  standalone battle procedure.

Round 2 architecture and connascence pass:

- The strongest coupling is Draconic Ancestry to both Breath Weapon and Damage
  Resistance. Future tasks should colocate that source fact or make the shared
  dependency type-visible.
- Dwarven Resilience's two mechanics should share selected trait/source
  identity but produce distinct target-side damage and saving-throw roll-mode
  facts.
- Powerful Build's carrying-capacity and Grappled escape facts have different
  owners; keeping them in one runtime profile would duplicate non-battle state.
- No generated metrics were rewritten because the existing matrix already
  carries the current unsupported species claims and supported Frenzy claim.

## Verification

- RAW/ubiquitous-language check performed from the local SRD and
  `UBIQUITOUS_LANGUAGE.md` references above.
- `pnpm unit-profile-coverage:check -- --write`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check`
- `pnpm quality`
- MBT not run: this task adds a triage artifact only and changes no runtime,
  QNT, profile parser, or generated matrix behavior.
