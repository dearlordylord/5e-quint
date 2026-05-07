# QMBT28 Spell Admission Triage

Date: 2026-05-07

## Decision

Select a direct Hit Point restoration spell admission batch:

- `cure_wounds`
- `mass_healing_word`

Both spells are SRD-provenance authored Spell Definitions with ordinary
creature-targeted `heal_hp` effects. They should be promoted as deterministic
admission/projection evidence before adding broader spell effect families.

Keep `fire_bolt` out of supported spell Unit evidence. QMBT23 remains the
authority: Fire Bolt needs an explicit object-target Spell Invocation branch
and object-ignition Spell Effect outcome before deterministic admission can be
honest.

## Source Check

Local RAW anchors read for this decision:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`, `Cure Wounds`: Action,
  Touch, one creature regains `2d8 + spellcasting ability modifier`, plus
  `2d8` per slot level above 1.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md`, `Mass Healing Word`:
  Bonus Action, 60 feet, up to six creatures regain
  `2d4 + spellcasting ability modifier`, plus `1d4` per slot level above 3.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`, `Healing Word`: QMBT25
  precedent for Bonus Action spell-slot healing.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`, `Fire Bolt`: still has
  creature-or-object targeting and object ignition.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Target`, `Object`, and
  `Breaking Objects`: confirm Fire Bolt's blocker is a real object execution
  boundary, not a display label.

`UBIQUITOUS_LANGUAGE.md` anchors checked:

- Spell Definition, Spell Access, Spell Invocation, and Spell Effect, to keep
  authored spell content, creature-owned access, runtime target choice, and
  execution outcomes distinct.
- Magic Action, Spell Slot, Casting Time, and Hit Points, to keep Action vs
  Bonus Action cost and HP restoration explicit.
- Object and Target terminology via QMBT23's local check.

## Candidate Triage

| Candidate | Decision |
| --- | --- |
| `cure_wounds` | Select. It is direct creature Hit Point restoration using the existing `heal_hp` authored effect family. The admission task must widen the current Healing Word-shaped runtime support from Bonus Action only to action-cost-aware healing Spell Invocations, not add an authored-id registry. |
| `mass_healing_word` | Select. It is direct creature Hit Point restoration using the existing `heal_hp` family and the existing Bonus Action spell-slot timing, widened to up to six targets and level-3 minimum slots. |
| `mass_cure_wounds` | Not selected for this batch. It is also healing, but its SRD area-centered target selection adds point/area targeting pressure. Admit after the direct target-list batch proves the generalized healing boundary. |
| `heal` | Not selected for this batch. It combines fixed healing with condition removal. That needs condition-removal Spell Effect support, not just Hit Point restoration admission. |
| `power_word_heal` | Not selected for this batch. It combines heal-to-max, condition removal, and a target Reaction to stand up. That is a separate effect-family and reaction-boundary slice. |
| `aid` | Not selected for this batch. It modifies both Hit Point maximum and current Hit Points for an 8-hour duration. That is max-HP persistent effect support, not direct healing. |
| `light` | Not selected for this batch. It is object-targeted and creates an illumination effect on an object. This belongs with an object/effect boundary, not the direct creature healing batch. |
| `detect_magic` | Not selected for this batch. It is a concentration sensing/aura information effect and does not create a promoted battle damage/healing invocation. |
| `sleep` | Not selected for this batch. It requires concentration condition lifecycle, repeat saves, early end on damage or waking action, and target immunity gates. |
| `thunderwave` | Not selected for this batch. It combines area save damage, half damage on success, forced movement, unsecured object movement, and audible boom. |
| `fire_bolt` | Blocked by QMBT23. Do not count it as supported until object targets and object ignition are execution-facing. |

## Red/Green Plan

1. Rename or widen the spell healing profile in domain terms.

   The current `spell.bonus-action-healing` profile name fits Healing Word but
   not Cure Wounds. The implementation task should introduce a profile name
   that can represent the selected batch without lying about action cost, such
   as `spell.hit-point-restoration`, or split action-cost-specific profiles if
   the runtime boundary needs that distinction. The profile must make action
   cost, target count, minimum slot level, dice expression, and selected slot
   level explicit rather than deriving them from authored ids.

2. Model QNT procedure facts before runtime widening.

   Extend the QCORE10 spell procedure profile from Healing Word-shaped facts to
   direct Hit Point restoration facts:

   - casting action cost: Action or Bonus Action;
   - minimum slot level;
   - selected slot level;
   - target count and target validity;
   - healing dice count, die size, and spellcasting ability modifier;
   - HP recovery and 0-HP recovery lifecycle per the existing healing model.

3. Promote production support through authored Spell Definitions.

   Extend the battle-runtime supported spell projection to parse `heal_hp`
   spells by shape:

   - `family: "activation"`;
   - one direct phase;
   - creature target selection with `mode: "one"` or `choose_up_to`;
   - one `heal_hp` effect;
   - action cost either Action or Bonus Action;
   - linear slot scaling whose base includes the spellcasting ability modifier.

   Do not add a spell-id allow list for `cure_wounds` or
   `mass_healing_word`.

4. Keep target multiplicity executable.

   The runtime should derive target count and healing application from the
   parsed Spell Invocation profile. `mass_healing_word` needs one healing roll
   expression applied to each selected target, while `cure_wounds` needs exactly
   one target. Use the existing Spell Access path: catalog Spell Definition,
   creature-owned Spell Access, then `discoverBattleActs`.

5. Add deterministic admission/projection evidence.

   Import `cure_wounds` and `mass_healing_word` into the SRD Unit collection
   only when support is executable. Add supported claims and deterministic
   evidence rows after the runtime path proves:

   - the authored Spell Definitions load from the production catalog;
   - prepared Spell Access exposes supported Spell Invocation acts;
   - Cure Wounds spends the Magic Action and a Spell Slot;
   - Mass Healing Word spends the Bonus Action and a Spell Slot;
   - target count gates reject adjacent invalid target counts;
   - Fire Bolt remains `needs-surface-widening`.

6. Refresh generated matrix artifacts.

   Run `pnpm unit-profile-coverage:check` after claims and evidence updates and
   include generated report/matrix changes in the implementation task.

## Verification For Implementation Task

- RAW and `UBIQUITOUS_LANGUAGE.md` check for Cure Wounds, Mass Healing Word,
  Healing Word precedent, Spell Definition, Spell Access, Spell Invocation,
  Spell Effect, Casting Time, Spell Slots, and Hit Points.
- Focused QNT proof for generalized direct Hit Point restoration Spell
  Invocation facts.
- Focused QMBT spell parity with the mandatory timed background protocol if
  production battle behavior changes.
- `pnpm unit-profile-coverage:check`.
- Relevant package typecheck/tests.
- `pnpm quality` for the production behavior change.
- `/simplify` convergence, minimum two rounds.

## Task 123 Verification

- RAW checked locally against the SRD spell and glossary anchors listed above.
- `UBIQUITOUS_LANGUAGE.md` checked for the spell ownership and action/resource
  terms listed above.
- `/simplify` round 1: kept the selected batch to direct `heal_hp` creature
  restoration and moved condition removal, max-HP modification, object targets,
  area point targeting, sensing, repeat-save conditions, and forced movement to
  non-selected boundary rows.
- `/simplify` round 2: no important changes found; the decision still selects
  one coherent spell-effect family, avoids Fire Bolt re-admission, and does not
  require MBT for this research-only task.
- MBT not run: Task 123 is research-only and makes no promoted battle-runtime
  behavior change.

## Plan Impact

QMBT30 should append a follow-on spell implementation task. Suggested task:

`QMBT32 - Promote Direct Hit Point Restoration Spell Batch`

Scope: implement the red/green plan above and close `cure_wounds` and
`mass_healing_word` as supported SRD spell Unit profiles. Out of scope:
Fire Bolt object targeting/ignition, Mass Cure Wounds area-centered targeting,
condition removal, max-HP modification, heal-to-max, target Reaction stand-up,
noncombat sensing spells, concentration condition lifecycle, and forced
movement spells.
