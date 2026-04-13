# SPELL1 — Frozen Spell Ownership Surface

## Purpose

Freeze the spell-owned boundary before `SPELL2a` so characters, monsters,
battle, and MCP all consume one canonical spell owner instead of growing
parallel spell schemas.

## RAW And Assumption Anchors

Sources consulted before freezing this boundary:

- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
  - `Gaining Spells`: a creature must have a spell prepared or otherwise have
    access to it before it can cast it.
  - `Using a Higher-Level Spell Slot`: the spell's own text defines what changes
    when cast above base level.
  - `Casting Time`: spells define whether they use the Magic action, a Bonus
    Action, a Reaction, or longer casting.
  - `One Spell with a Spell Slot per Turn`: slot-spend timing is runtime, not
    authored metadata on character or MCP input.
  - `Components`: the spell defines component requirements; legality depends on
    runtime hand/speech state.
  - `Duration`, `Targets`, `Saving Throws`, `Attack Rolls`: the spell text owns
    effect structure, target rules, save ability, and attack-roll usage.
- `.references/srd-5.2.1/Rules-Glossary.md`
  - `Concentration`: another concentration effect, damage, and the
    Incapacitated or Dead states break Concentration.
  - `Ready [Action]`: readying a spell expends resources now, requires an
    action-cast spell, holds the spell with Concentration, and releases it with
    a Reaction.
  - `Magic [Action]`: long-casting-time spells repeatedly consume the Magic
    action and fail without slot expenditure if Concentration breaks.
  - `Spell`: a spell is a magical effect with the characteristics described in
    `Spells`.
  - `Spellcasting Focus`: focus substitution is part of component legality, not
    a second spell record.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`
  - `Counterspell`: the interrupt window, refund rule, and trigger timing are
    battle-time behavior.
- `UBIQUITOUS_LANGUAGE.md`
  - use `Spell Slot`, `Concentration`, `Spell Save DC`, `Spell Component`,
    `Base Spell Level`, `Cast Level`, `Casting Time`, and `Duration`.
- `ASSUMPTIONS.md`
  - `A7`: incapacitated creatures cannot start concentration.
  - `A10`: ritual casting is caller-orchestrated slot omission, not a separate
    spell-owned wrapper.
  - `A38`: creature-level prepared-spell support is a narrow helper layer only;
    battle remains the authoritative spell-resolution layer.

## Current Ownership Inventory

### Spell-owned authored data

- `packages/core/src/features/spell-registry.ts`
  - `SRD_SPELLS` is the current broad SRD spell catalog.
  - `SpellInfo` already owns spell-authored metadata such as display name,
    spell level, school, casting time, range, components, duration,
    concentration, ritual tag, and class lists.
- `packages/core/src/features/spell-*.ts`
  - school files currently own modeled spell-authored mechanics such as save
    ability, damage typing, concentration flags, and higher-level-slot math.
- `packages/core/src/features/spell-available-actions.ts`
  - currently projects a modeled subset into runtime-facing helper shapes such
    as `ModeledPreparedSpellInfo` and `BattleReadyableSpellPayload`.

### Character-owned spell references

- `packages/core/src/character-spellcasting.ts`
  - owns spell access and preparation choices, spellbooks, spellcasting ability,
    spell attack bonus, spell save DC, and slot state.
- Character code is therefore the owner of actor-derived casting capability,
  not the owner of spell-authored rules text.

### Monster-owned spell references

- `packages/core/src/monster-types.ts`
  - `MonsterSpellReference` and `MonsterSpellcastingAbility` own monster-local
    spellcasting prose, usage text, spellcasting ability, optional save DC, and
    optional attack bonus.
- Monster code is therefore the owner of monster-authored access and prose, not
  the owner of canonical spell records.

### Battle-owned spell transactions

- `packages/core/src/battle-machine-events.ts`
  - current spell events expose the existing multi-step battle transaction
    surface.
- `packages/core/src/battle-machine-types.ts`
  - battle state already owns spell-transaction state such as concentration,
    stack entries, ready-spell hold state, and AoE continuation state.
- `packages/core/src/battle-init-creature-config.ts`
  - battle init already consumes projected spell availability and slot state.

### MCP/public inputs

- `plans/MCP_EVENT_SURFACE_AUDIT.md` and
  `plans/MCPA6_GENERIC_SPELL_RESOLUTION_OWNERSHIP.md`
  - already establish that generic spell casting must surface as battle actions,
    not raw table events.
- `packages/mcp/src/server-runtime.ts`
  - currently forwards bounded battle follow-up requests rather than owning a
    second spell rules model.

## Frozen Ownership Decision

### 1. Canonical spell owner

The canonical authored spell record belongs in core spell-owned data. It does
not belong in character spellcasting state, monster stat blocks, battle state,
or MCP schemas.

`SPELL2a` must evolve the existing spell-side code into one canonical spell
record plus one-way projection helpers. It must not create a second spell
registry beside `SRD_SPELLS`.

### 2. Canonical spell identity is a stable `SpellId`

The canonical identity of a shipped spell is a stable `SpellId`, not a display
name string and not a monster- or character-local alias.

Frozen rule:

- `SpellId` is the canonical key for authored spell records and for references
  from characters, monsters, battle payload builders, and MCP inputs.
- For shipped SRD spells, the canonical `SpellId` is the existing normalized
  snake_case identifier already used across the repo (`fireball`,
  `hold_person`, `counterspell`, etc.).
- The human-readable spell name remains a separate authored field on the
  canonical record. Display name is not a second identity system.
- The current open `SpellName` string surface is an adapter/input convenience.
  `SPELL2a` should converge authored storage and references on `SpellId`, with
  validation/projection from display names or legacy strings as needed.

Consequences:

- character prepared-spell lists, monster spell references, and battle spell
  payload builders all point at the same canonical key;
- a monster spellcasting entry may quote `Counterspell` in prose, but the
  structured reference still resolves to the canonical `SpellId`;
- no layer gets to invent a parallel identity such as MCP-only spell names,
  monster-local spell IDs, or battle-only spell keys.

### 3. Canonical spell provenance mirrors monster provenance

Spell provenance, structured input, and runtime projection are three different
concepts and must stay structurally distinct.

Frozen provenance rule:

- the canonical spell record owns exactly one canonical provenance block;
- supporting machine-readable inputs, if present, are recorded separately as
  supporting inputs;
- runtime payloads never carry either provenance block.

The spell provenance shape is frozen to the same pattern already used for
monsters:

```ts
interface SpellRecordProvenance {
  readonly provenance: {
    readonly sourceName: string
    readonly sourceKind: "canonicalRulesText" | "licensedPack"
    readonly license: string
    readonly citation: {
      readonly document: string
      readonly section: string
    }
  }
  readonly supportingInputs?: ReadonlyArray<{
    readonly sourceName: string
    readonly sourceKind: "supportingStructuredInput"
    readonly license: string
    readonly role: "normalizationInput" | "crossCheck"
    readonly citation: {
      readonly document: string
      readonly section: string
    }
  }>
}
```

Frozen SRD rule for this batch:

- the shipped SRD spell catalog is an SRD-only collection;
- every record in that collection has canonical provenance
  `sourceName: "srd-5.2.1"`, `sourceKind: "canonicalRulesText"`,
  `license: "CC-BY-4.0"`;
- the citation points to the spell description document and section for that
  spell;
- 5e-tools or any other machine-readable source can appear only in
  `supportingInputs`, never in `provenance`.

Invalid states made unrepresentable:

- one spell record cannot claim both SRD provenance and some other canonical
  provenance at the same time;
- a supporting structured input cannot masquerade as provenance;
- a battle payload or character reference cannot become the place where the
  repo stores spell provenance.

If the repo later ships non-SRD spell packs, they belong in a distinct
collection or a deliberately widened typed collection. `SRD_SPELLS` or its
successor must not silently become mixed-provenance while still presenting
itself as the SRD spell catalog.

### 4. Canonical spell record contents

The canonical spell record owns authored spell facts only.

It must include:

- `id: SpellId`;
- display name;
- canonical provenance;
- broad authored metadata already carried by `SpellInfo`;
- authored mechanics that come from the spell text and are needed by modeled
  downstream consumers, such as save ability, attack-roll usage,
  higher-level-slot behavior, concentration requirement, and effect-family data.

It must not include:

- caster-derived values such as numerical `Spell Save DC` or spell attack bonus;
- battle-transaction state such as pending counterspell windows, held ready
  spells, per-target AoE continuation, or current concentration owner;
- MCP-only transport fields.

Important split:

- the spell record owns whether a spell uses a saving throw and which ability
  that saving throw uses;
- the acting creature owns the numerical `Spell Save DC`, because the SRD
  defines that number from the caster's spellcasting ability modifier and
  proficiency bonus, not from the spell text itself.

### 5. Characters and monsters own references, not spell facts

Character and monster spell references stay intentionally thin.

They may own:

- `spellId: SpellId`;
- owner-local access facts such as prepared, always prepared, at will, per-day,
  or spellbook membership;
- owner-local casting stats such as spellcasting ability, spell attack bonus,
  spell save DC, and slot resources;
- monster-authored spellcasting prose and usage text.

They must not own:

- duplicated canonical provenance;
- duplicated spell metadata such as casting time, duration, components, school,
  range, or class lists;
- duplicated spell-authored mechanics such as save ability, half-on-success
  behavior, damage typing, concentration duration, or higher-level-slot rules;
- battle-ready payload blobs.

### 6. Battle owns spell transactions after projection

Battle consumes projected spell facts and actor/runtime context, then owns the
entire cast transaction.

This battle-owned surface is anchored as follows:

- action economy and one-slot-per-turn enforcement:
  `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
  `Casting Time` and `One Spell with a Spell Slot per Turn`;
- component legality:
  `.references/srd-5.2.1/Spells/Gaining-and-Casting.md` `Components` plus
  `UBIQUITOUS_LANGUAGE.md` hand-occupancy terminology;
- `Counterspell` interrupt timing and refund behavior:
  `.references/srd-5.2.1/Spells/Descriptions-A-D.md` `Counterspell`;
- concentration start/replacement/break/cleanup:
  `.references/srd-5.2.1/Rules-Glossary.md` `Concentration`,
  `.references/srd-5.2.1/Rules-Glossary.md` `Incapacitated [Condition]`, and
  `ASSUMPTIONS.md` `A7`;
- ready-spell hold and release lifecycle:
  `.references/srd-5.2.1/Rules-Glossary.md` `Ready [Action]`;
- longer-casting-time failure without slot spend:
  `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
  `Longer Casting Times` and `.references/srd-5.2.1/Rules-Glossary.md`
  `Magic [Action]`;
- per-target AoE continuation:
  battle-owned sequencing choice derived from spell-authored target/effect text;
  the spell record defines the effect, but battle owns iterating live targets
  and pending follow-up state.

Battle therefore owns runtime sequence and state. It is not the owner of the
canonical authored spell catalog.

### 7. MCP owns bounded inputs only

MCP/public input may identify:

- actor identity;
- canonical `SpellId`;
- cast level / slot choice when applicable;
- target choice or other bounded external runtime facts that core does not own,
  such as area membership or externally rolled saves.

MCP/public input must not supply:

- canonical provenance;
- spell-authored metadata or mechanics;
- caster-derived values that core can compute, such as numerical spell save DC;
- battle follow-up state such as counterspell legality, concentration
  transitions, or AoE continuation state.

MCP is not an importer and not a second spell schema owner.

## `SPELL2a` Implementation Contract

`SPELL2a` is now bounded to these concrete moves:

1. Introduce one canonical spell record keyed by `SpellId` with the frozen
   provenance shape above.
2. Keep any structured-input helper surface distinct from canonical provenance
   and distinct from runtime payloads.
3. Update character and monster spell references to point at canonical
   `SpellId` without copying spell-authored fields.
4. Build one-way projection helpers from canonical spell records to battle
   payloads for the currently modeled spell family.

`SPELL2a` must not:

- invent a second catalog beside `SRD_SPELLS`;
- leave identity split between display-name strings and canonical IDs;
- store 5e-tools or other machine-readable inputs as spell provenance;
- widen battle or MCP into authored spell owners;
- implement the whole generic spell execution backlog.

## Explicit Non-Owners

- Monster stat blocks are not the canonical owner of spell records.
- Character spellcasting summaries are not the canonical owner of spell
  metadata.
- Numerical `Spell Save DC` is not canonical spell metadata; it is actor-derived
  runtime data.
- Battle state and battle events are not the canonical owner of spell-authored
  facts.
- MCP request schemas are not the canonical owner of spell payloads.
- Supporting structured inputs are not spell provenance.

## Verification

- Acceptance-criteria check:
  the note now freezes one canonical spell owner, one canonical identity
  (`SpellId`), one explicit provenance shape, and one battle/MCP/reference seam
  concrete enough for `SPELL2a` to implement without reopening `SPELL1`.
- RAW traceability check:
  each boundary claim above is tied either to the cited SRD section or to the
  existing repo assumption called out in `ASSUMPTIONS.md`.
- Monster-owner check:
  monsters remain owners of spellcasting prose, usage, and actor-local casting
  stats only; they are explicitly forbidden from owning canonical spell
  metadata, provenance, or battle payloads.
- `/simplify` convergence:
  - Round 1: replaced category-level guidance with a concrete canonical
    identity/provenance contract and removed ambiguous ownership wording.
  - Round 2: re-checked every battle-boundary claim against exact SRD sections
    and existing assumptions; remaining claims are now either directly anchored
    or explicitly identified as battle sequencing choices.

## Plan Impact

- Status: `applied`
- `SPELL1`: this ownership decision is frozen and can be marked `done`.
- `SPELL2a`: this task can move to
  `ready-for-implementation-after-light-research` because the missing
  identity/provenance seam is now explicit.
