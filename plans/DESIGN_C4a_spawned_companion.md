# §C4a Design — Spawned-Companion Payload

> Design doc for the first §C4 sub-problem: the Pattern-A stat-block
> grammar (spell ships an inline stat block parameterized by spell
> level + caster-chosen mode). 11 units pressure this shape (3 SRD +
> 8 XPHB, per `plans/RESEARCH_summons_and_polymorph.md`). No code
> changes yet — this doc proposes the types; once reviewed, landing
> is one implementation tick.

## Pressure set

Pattern-A units (inline level-parameterized stat block):

### SRD 5.2.1

- **Find Familiar** (L1, Wizard) — Wild Shape "Wild Companion" also casts this.
- **Find Steed** (L2, Paladin) — Otherworldly Steed stat block.
- **Summon Dragon** (L5, Wizard) — Draconic Spirit stat block.

### XPHB (research only; NOT shipped as content)

- **Summon Beast** (L2) — Bestial Spirit; mode = Air / Land / Water.
- **Summon Fey** (L3) — Fey Spirit; mode = Fuming / Mirthful / Tricksy.
- **Summon Undead** (L3) — Undead Spirit; mode = Ghostly / Putrid / Skeletal.
- **Summon Aberration** (L4) — Aberrant Spirit; mode = Beholderkin / Slaadi / Star Spawn.
- **Summon Construct** (L4) — Construct Spirit; mode = Clay / Metal / Stone.
- **Summon Elemental** (L4) — Elemental Spirit; mode = Air / Earth / Fire / Water.
- **Summon Celestial** (L5) — Celestial Spirit; mode = Avenger / Defender.
- **Summon Fiend** (L6) — Fiendish Spirit; mode = Demon / Devil / Yugoloth.

## Active Follow-Up Links

- `plans/COMPANION_SESSION_ADMISSION_AND_REAPPEARANCE_PLAN.md` (landed and
  deleted 2026-06-12; in git history) records the
  deferred out-of-battle companion session/admission workflow and the generic
  reducer-discovered reappearance path for temporarily dismissed companions.

## Concrete fields the stat block contains (per RAW text)

Across all 11 units:

| Field | Always | Sometimes | Notes |
|---|---|---|---|
| size | ✓ | | Small / Medium / Large / Huge |
| creature type | ✓ | | Fey / Fiend / Construct / Dragon / ... derived from typed source/procedure facts and selected mode |
| alignment | ✓ | | Usually Neutral; some spells tag Lawful/Chaotic by mode |
| AC | ✓ | | Formula in spell level: `N + spell level` or flat per mode |
| HP | ✓ | | Formula in spell level: `base + N per level above base` |
| speed | ✓ | | Walk; sometimes Fly / Swim / Burrow |
| ability scores | ✓ | | 6 scores; sometimes branch by mode |
| save mods | | ✓ | Explicit per-save proficiency vs raw ability mod |
| resistances | | ✓ | Often chosen by caster at cast time |
| immunities | | ✓ | Typically Charmed / Frightened / Poisoned fixed |
| senses | | ✓ | Blindsight / Darkvision ranges |
| languages | ✓ | | "Understands the languages you know"; Telepathy in some |
| CR | ✓ | | "None (XP 0; PB equals your Proficiency Bonus)" |
| traits | | ✓ | Mode-branch: "Shared Resistances", "Life Bond", etc. |
| actions | ✓ | | Multiattack count scales by spell level; attack rolls use caster's spell attack mod; damage formulas include spell level |
| bonus actions | | ✓ | Mode-gated (Fell Glare: Fiend only) |

## Proposed types

### High-level family addition

New payload family alongside `activation`, `ongoing_effect`,
`triggered_reaction`, `anchored_trigger`:

```ts
type SpellMechanics =
  | OngoingEffectMechanics
  | ActivationMechanics
  | TriggeredReactionMechanics
  | AnchoredTriggerMechanics
  | SpawnedCompanionMechanics;   // NEW

type SpawnedCompanionMechanics = SpellMechanicsHeader & {
  readonly family: "spawned_companion";
  readonly stat_block: CompanionStatBlock;
  readonly mode?: CompanionMode;         // cast-time choice, optional
  readonly control: CompanionControl;
  readonly dismissal: CompanionDismissal;
};
```

### Stat-block grammar

```ts
// Level-parameterized inline stat block. Every numeric field may be
// a literal OR a formula in the cast slot level (+ caster stats).
//
// CasterDerivedValue threads caster fields into the stat block:
//   "spell attack modifier", "spell save DC", "PB".
type StatBlockValue =
  | { kind: "literal"; value: number }
  | { kind: "per_spell_level";
      base: number;
      perLevel: number;
      startingAtLevel: number }   // "AC 14 + spell's level"; "HP 50 + 10 per level above 5"
  | { kind: "caster_derived";
      source: "spell_attack_mod" | "spell_save_dc" | "proficiency_bonus" | "spellcasting_ability_mod" };

type StatBlockSize = "tiny" | "small" | "medium" | "large" | "huge" | "gargantuan";

type CompanionStatBlock = {
  readonly display_name: string;              // "Draconic Spirit"
  readonly size: StatBlockSize | CastTimeChoice<StatBlockSize>;
  readonly creature_type: CreatureType | CastTimeChoice<CreatureType>;
  readonly ac: StatBlockValue;
  readonly hp: StatBlockValue;
  readonly speeds: ReadonlyArray<CompanionSpeed>;
  readonly ability_scores: SixAbilityScores;  // literal or mode-branched
  readonly save_proficiencies?: ReadonlyArray<Ability>;
  readonly resistances?: CompanionResistanceList;
  readonly immunities?: CompanionImmunityList;
  readonly senses?: ReadonlyArray<CompanionSense>;
  readonly languages?: "caster_languages" | ReadonlyArray<string>;
  readonly actions: ReadonlyArray<CompanionAction>;
  readonly bonus_actions?: ReadonlyArray<CompanionAction>;
  readonly reactions?: ReadonlyArray<CompanionAction>;
  readonly traits?: ReadonlyArray<CompanionTrait>;
};

type SixAbilityScores = {
  readonly str: number;
  readonly dex: number;
  readonly con: number;
  readonly int: number;
  readonly wis: number;
  readonly cha: number;
};

type CompanionSpeed = {
  readonly kind: "walk" | "fly" | "swim" | "climb" | "burrow";
  readonly feet: StatBlockValue;
  readonly requiresSlotLevel?: number;        // Otherworldly Steed Fly only at slot 4+
};

type CompanionResistanceList =
  | { kind: "fixed"; damageTypes: ReadonlyArray<DamageType> }
  | { kind: "choose_one_from"; options: ReadonlyArray<DamageType> };   // Summon Dragon "Shared Resistances"

type CompanionImmunityList = {
  readonly damageTypes?: ReadonlyArray<DamageType>;
  readonly conditions?: ReadonlyArray<Condition>;
};

type CompanionSense = {
  readonly kind: SenseKind;
  readonly rangeFeet: number;
};
```

### Actions grammar

Each companion action is one of: multiattack-dispatch, attack-roll
action, save-gate action, support action (heal/buff).

```ts
type CompanionAction = {
  readonly name: string;                            // "Rend", "Breath Weapon", "Healing Touch"
  readonly kind: CompanionActionKind;
  readonly multiattackCount?: StatBlockValue;       // "half the spell's level (round down)"
};

type CompanionActionKind =
  | {
      readonly kind: "attack_roll";
      readonly attackType: "melee" | "ranged";
      readonly attackBonus: StatBlockValue;         // almost always caster_derived.spell_attack_mod
      readonly reachFeet?: number;
      readonly rangeFeet?: { normal: number; long: number };
      readonly onHit: ReadonlyArray<EffectAtom>;    // reuses existing EffectAtom grammar
    }
  | {
      readonly kind: "save_gate";
      readonly ability: Ability;
      readonly dc: DcSource;                        // typically caster_spell_save_dc
      readonly area: AreaShapeDescriptor;
      readonly onFail: EffectAtom;
      readonly onSuccess: SaveSuccessOutcome;
    }
  | {
      readonly kind: "support";                     // Summon Celestial Defender heal mode
      readonly target: "self" | "ally_in_range";
      readonly rangeFeet?: number;
      readonly effect: EffectAtom;                  // heal_hp, etc.
    }
  | {
      readonly kind: "multiattack";                 // dispatches other actions
      readonly dispatches: ReadonlyArray<{
        readonly name: string;
        readonly count: StatBlockValue;
      }>;
    };
```

### Trait grammar

```ts
type CompanionTrait = {
  readonly name: string;                           // "Shared Resistances", "Life Bond"
  readonly description: string;                    // plain-text RAW trait text (auxiliary)
  readonly effect?: CompanionTraitEffect;
};

type CompanionTraitEffect =
  | {
      readonly kind: "caster_shared_resistance";    // Summon Dragon: caster gets resistance to chosen type
      readonly chosenFrom: "resistances_list";
    }
  | {
      readonly kind: "caster_heal_link";            // Find Steed: steed heals when caster heals from L1+ spell
      readonly rangeFeet: number;
    };
```

### Mode-branch (cast-time subtype picker)

```ts
type CompanionMode = {
  readonly label: string;                           // "mood", "environment", "subtype"
  readonly options: ReadonlyArray<{
    readonly id: string;                            // "avenger", "defender"
    readonly displayName: string;
    readonly overrides: CompanionStatBlockOverrides;  // partial stat-block updates
  }>;
};

type CompanionStatBlockOverrides = {
  readonly creature_type?: CreatureType;
  readonly speeds?: ReadonlyArray<CompanionSpeed>;
  readonly resistances?: CompanionResistanceList;
  readonly immunities?: CompanionImmunityList;
  readonly traits?: ReadonlyArray<CompanionTrait>;
  readonly actions?: ReadonlyArray<CompanionAction>;
  readonly bonus_actions?: ReadonlyArray<CompanionAction>;
};
```

### Control + dismissal

`CompanionControl` means rule protocol, not tactic policy. It records RAW facts
such as command cost, command range, initiative relationship, turn timing, and
fixed default behavior. Runtime code may expose legal companion acts and require
holes/fills or table-supplied witnesses, but the table chooses the command,
action, target, route, and placement. The in-world caster/owner may be the rules
actor; runtime code still receives explicit choices instead of choosing them. Do
not implement autonomous companion tactics in this family.

```ts
type CompanionControl = {
  readonly initiative: "shared_with_caster" | "own_roll";
  readonly turnOrder?: "immediately_after_caster";     // paired with shared_with_caster
  readonly commandCost:
    | { kind: "no_action_required"; }                  // "obeys your verbal commands"
    | { kind: "bonus_action"; }                        // Animate Dead, Create Undead
    | { kind: "action"; };
  readonly commandRangeFeet: number;                   // 60 / 100 / 500 ft
  readonly defaultBehavior: "dodge_and_avoid" | "independent"; // independent means table-selected acts, not runtime tactic policy
  readonly telepathy?: {
    readonly rangeFeet: number;
    readonly sharedSenses?: "bonus_action";
  };
  readonly oneAtATime?: true;                          // Find Familiar "One Familiar Only"
};

type CompanionDismissal = {
  readonly onZeroHp: "disappears";
  readonly onSpellEnd: "disappears";
  readonly caster0Hp?: "disappears";                    // Find Steed "if you die"
  readonly manualDismiss?: "magic_action" | "never";
  readonly leavesBehind?: "equipment" | "nothing";
};
```

### Shared primitive: CastTimeChoice

Generic wrapper for "caster picks at cast time from a closed list".
Parallels the existing DamageTypeRef.choice + SkillFilter.choice
patterns.

```ts
type CastTimeChoice<T> = {
  readonly kind: "choice";
  readonly label: string;
  readonly options: ReadonlyArray<T>;
};
```

## Coverage check — 11 units against the grammar

| Unit | Size | Mode | Level-param | Caster-derived | Multiattack | Support-mode | Permanent? | Passenger? |
|---|---|---|---|---|---|---|---|---|
| Find Familiar | tiny | choice (type: Celestial/Fey/Fiend) | no (slot L1 only) | no | no | no | no | no |
| Find Steed | large | choice (type) | AC + HP + Slam damage | spell_attack_mod | no | no | no | no |
| Summon Dragon | large | no | AC + HP + Multiattack count + Rend + Breath | spell_attack_mod + spell_save_dc | yes | no | no | no |
| Summon Beast | med | env (3-way) | AC + HP + attack damage | spell_attack_mod + spell_save_dc | yes | no | no | no |
| Summon Fey | med | mood (3-way) | same | same | yes | no | no | no |
| Summon Undead | med | subtype (3-way) | same | same | yes | no | no | no |
| Summon Aberration | large | subtype (3-way) | same | same | yes | no | no | no |
| Summon Construct | med | subtype (3-way) | same | same | yes | no | no | no |
| Summon Elemental | large | elem (4-way) | same | same | yes | no | no | no |
| Summon Celestial | med | role (2-way) | same | same | yes | **yes (Defender heal)** | no | no |
| Summon Fiend | med | subtype (3-way) | same | same | yes | no | no | no |

All 11 fit the grammar. Summon Celestial's Defender heal uses the
`support` action kind. Find Familiar's no-attack shape uses
`actions: []` (or a single utility action).

## Reuse with existing surface

- **`EffectAtom`** — used inside `onHit`, save-gate `onFail` / `onSuccess`, and `support.effect`. Reuses all existing atom vocabulary (damage, heal, apply_condition, grant_resistance, grant_temp_hp, etc.). No new atoms for the spawned-companion family itself.
- **`AreaShapeDescriptor`** — used for save-gate area actions (Breath Weapon cone).
- **`DamageType`, `DamageTypeRef`** — used in resistance / immunity lists and action damage fields.
- **`DcSource`** — used in save-gate actions.
- **`Condition`** — used in immunity list.
- **`SenseKind`** — used in senses list.
- **`Ability`** — used in save-gate actions and save proficiencies.
- **`CastTimeChoice<T>`** (new primitive, but parallels existing `DamageTypeRef.choice` / `SkillFilter.choice`) — widens to additional types used by this family.

## Tracer implications

The tracer's spawned-companion emission will add a new subgraph:
- `create_companion` effect atom (already in V4 whitelist).
- `command_companion` effect atom for the command-cost edge.
- Per action: its own resolution atom chain (attack_roll → on_hit_window; save_gate; direct-apply for support).
- Mode-branch emitted as a `choice` subgraph if present.

These atoms are already in v4 (`create_companion`, `command_companion`)
— the widening is surface-types only, no new atoms.

## What this does NOT cover (separate sub-problems)

- **C4b — Catalog reanimation** (Animate Dead, Create Undead). Different pattern: reference external monster catalog entries, slot-tiered menus, 24h refresh cycle, multi-creature control. Separate grammar.
- **C4c — Templated multi-spawn with size branches** (Animate Objects). Count-by-spellcasting-mod, per-instance size picker with 3-row Slam damage. Overlaps with C4a for action grammar but adds per-instance branching.
- **C4d — Target-replacement with retained fields** (Polymorph, Shapechange, True Polymorph, Wild Shape). Different core: the *target's* stats swap, retained-field selector, dismissal = revert to original.
- **C4e — Self-modify without stat-block swap** (Alter Self). Modes add/override atomic modifiers on caster.
- **C4f — Shared companion control mechanics.** Partially in C4a via `CompanionControl`; refinements may surface in C4b/c.
- **C4g — Object-target transform** (True Polymorph object mode).
- **C4h — Permanent-after-concentration** (True Polymorph concentrate-full-hour rule).

## Implementation plan (when landing)

1. Add types from this doc to `src/surface/types.ts`.
2. Add tracer arm for `family === "spawned_companion"`. Emit `create_companion` + action subgraph.
3. Author **Find Familiar** as first validation ref (simplest — no attack, CR-0 roster mode).
4. Author **Find Steed** as second (level-parameterized AC/HP/damage; type-mode).
5. Author **Summon Dragon** as third (multiattack + breath weapon + trait).
6. Run regression. If clean, move on to C4b.

XPHB units (Summon Beast/Fey/Undead/…) are NOT authored as Dhall; they
are research-only pressure cases. The grammar must still cover them
so a future XPHB-lane authoring pass doesn't force another widening.

## Open questions for implementation

None require user input — all design choices above are my call per
your delegation. If you want to override any:

- **Should `SpawnedCompanionMechanics` be a sub-family of `ActivationMechanics` (one-phase direct that spawns)** rather than a new top-level family? Separate family is cleaner (the stat block is a core payload, not a phase effect), but blurs the boundary with `ActivationPhase.direct`. I chose separate.
- **Should the mode-branch be cast-time or build-time?** For spells, always cast-time. For Druid Wild Shape (class feature), it's build-time (caster has a "known forms" roster). Current `CompanionMode` encodes cast-time. Wild Shape belongs to C4d (self-stat-block-swap) anyway, so not a conflict here.
- **Should action-damage use `DiceAmount` (the existing primitive) or a new `StatBlockValue`?** DiceAmount scales with caster/slot/class level but has `DiceExpr`-shaped output. StatBlockValue is numeric-only. Stat-block action damage like "1d6 + 4 + the spell's level" is a DiceExpr with `flat = 4 + spell_level_value` — which DiceAmount's `DiceExprDelta.flat` can carry if we extend it to accept `StatBlockValue`. Cleanest is to keep DiceAmount, extend `DiceExprDelta.flat` to accept a `StatBlockValue` alternative. Flagging for implementation.
