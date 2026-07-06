# SRDINV91A Recursive Battle Runtime Coverage Frontier Review

Task 336 reviewed the non-terminal battle-runtime coverage metrics that
SRDINV90B intentionally left open. The level-1 product-readiness lane remains
closed at 367/367 (100%), with 276 accepted rows and 91 accepted-no-battle-effect
rows. That metric is separate from supported executable Unit/profile coverage
and from evidence-density metrics.

## Frontier Metrics

Generated Unit matrix metrics from `plans/unit-profile-coverage/unit-matrix.json`:

- Supported executable Unit coverage: 85/117 (72.6%).
- Deterministic admission/projection coverage: 78/85 (91.8%).
- QNT proof coverage: 61/62 (98.4%).
- Selected identity replay coverage: 10/85 (11.8%).
- QNT profile modeling, runtime mapping, and runtime parity coverage are each
  100% for their current denominators.

## Concrete Gaps

The deterministic admission/projection metric has seven supported-profile Unit
identity gaps:

- `barbarian_unarmored_defense` and `monk_unarmored_defense` for
  `character-sheet.armor-class-base-formula`.
- `wizard_ritual_adept` for `character-sheet.spellbook-ritual-invocation`.
- `paladin_lay_on_hands` for `character-sheet.healing-resource-action`.
- `mastery_cleave`, `mastery_sap`, and `mastery_topple` for the promoted weapon
  mastery profiles.

One profile-subset-supported identity also lacks deterministic evidence, but it
is outside the 78/85 supported-profile metric denominator:

- `ranger_favored_enemy` for the supported Hunter's Mark
  `spell.invocation-marked-damage-rider` subset.

The QNT proof metric has one executable profile gap:

- `spell.invocation-condition-save`.

The selected identity replay metric remains intentionally sparse. Existing
selected identity replay evidence covers 10 supported identities, all in older
rule-core feature evidence. The remaining 75 supported-profile identities should
be handled by representative selected batches, not broad exploratory MBT.

## Source Review

No rule behavior was implemented in this task, but the newly selected follow-up
slices were checked against local SRD 5.2.1 text before being queued:

- `.references/srd-5.2.1/Classes/Barbarian.md` level 1 Unarmored Defense and
  Weapon Mastery text for Barbarian AC and mastery choice boundaries.
- `.references/srd-5.2.1/Classes/Monk.md` level 1 Unarmored Defense text for
  Monk AC formula selection.
- `.references/srd-5.2.1/Classes/Paladin.md` level 1 Lay On Hands and Weapon
  Mastery text for healing pool, Poisoned removal, and mastery choice evidence.
- `.references/srd-5.2.1/Classes/Wizard.md` lines 94-96 for Ritual Adept.
- `.references/srd-5.2.1/Equipment.md` lines 82-115 for Mastery Properties,
  Cleave, Sap, and Topple.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md` lines 807-817 for Color
  Spray's save-gated Blinded condition.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` lines 119-130 for
  Entangle's save-gated Restrained condition and escape action.
- `.references/srd-5.2.1/Rules-Glossary.md` condition and Saving Throw entries
  for Blinded, Restrained, and saving throw terminology.

`UBIQUITOUS_LANGUAGE.md` was checked for Armor Class, Unarmored Defense, Weapon
Mastery, Mastery Property, Saving Throw, Blinded, Restrained, Ritual, Spell
Definition, and Spell Invocation terminology.

## Decision

Append a three-task frontier batch:

1. SRDINV91B closes the seven supported-profile deterministic
   admission/projection stragglers.
2. SRDINV91C adds proof evidence for the condition-save spell invocation
   profile.
3. SRDINV91D selects the next representative identity MBT evidence batch after
   the deterministic and proof gaps are closed.

This preserves product readiness as a separate completed metric while keeping
the broader battle-runtime evidence frontier open.

## Verification

- `pnpm unit-profile-coverage:check` passed with 144 Units and 71 profiles.
- Active-plan consistency was updated across the Ralph index, DAG table, Task
  336 completion details, and new Task 337-339 details.
- The task did not run MBT because it made planning/documentation changes only
  and did not change promoted reducer semantics.

## reviewer loop Convergence

- Round 1: rejected choosing selected identity replay as the first follow-up
  because deterministic admission/projection and QNT proof have much smaller,
  exact gaps that should close before MBT evidence selection.
- Round 2: kept selected identity replay as a concrete follow-up task rather than a
  vague backlog item, but blocked it on SRDINV91B and SRDINV91C so the evidence
  batch is selected from a clean deterministic/proof baseline.
