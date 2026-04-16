# Proposal: Widening for `species_tiefling_fiendish_legacy`

## Outcome: `structural_widening`

## Primary Blocker — No `species_trait` UnitRecord kind

`UnitRecord` in `types.ts` is:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `SpeciesTraitRecord`. The tracer's `traceUnit` switch covers `spell`, `class_feature`,
and `mastery` only — a `species_trait` value throws immediately. No honest encoding is possible.

---

## Required Widenings (in priority order)

### 1. `SpeciesTraitRecord` — new `UnitRecord` variant (structural)

Minimum shape needed:

```typescript
export type SpeciesTraitRecord = UnitMetadata & {
  readonly kind: "species_trait";
  readonly mechanics: SpeciesTraitMechanics;
};
```

`tracer.ts` needs a `traceSpeciesTraitUnit` branch in `traceUnit`.

The v4 source atom `species_trait_root` already exists and should be emitted.

---

### 2. Creation-time legacy choice — new mechanics family (structural)

The Fiendish Legacy mechanic is not `activation` (no resource consumed at use time), not
`ongoing_effect` (no continuous attachment), and not any existing family. The player picks one
of N legacy bundles at character creation; the entire mechanical package is fixed from that
point.

Candidate mechanics family: `choose_at_creation` (or `creation_bundle`).

```typescript
export type ChooseAtCreationMechanics = {
  readonly family: "choose_at_creation";
  readonly options: ReadonlyArray<SpeciesTraitOption>;
};

export type SpeciesTraitOption = {
  readonly id: string;
  readonly label: string;
  readonly effects: ReadonlyArray<SpeciesTraitEffect>;
};
```

Where `SpeciesTraitEffect` is a union of the effect atoms listed below.

Alternatively, encode each legacy (Abyssal / Chthonic / Infernal) as a separate
`SpeciesTraitRecord`. That is simpler but loses the "pick one of three" structure; the choice
is then a character-builder concern, not a mechanics concern.

---

### 3. `grant_resistance` — new surface effect shape

The v4 atom `grant_resistance` exists but is not in `types.ts`. Needed for:

- Abyssal → Resistance to Poison damage
- Chthonic → Resistance to Necrotic damage
- Infernal → Resistance to Fire damage

Minimum surface shape:

```typescript
export type GrantResistanceEffect = {
  readonly kind: "grant_resistance";
  readonly damageType: DamageType;
};
```

---

### 4. `grant_spell_access` — new surface effect shape (two modes)

The v4 atom `grant_spell_access` exists but is not in `types.ts`. Fiendish Legacy needs two
modes:

**Mode A — always-known cantrip** (passive, no slot, no limit):

```typescript
export type GrantCantripEffect = {
  readonly kind: "grant_cantrip";
  readonly spellId: string;
};
```

**Mode B — prepared spell with once-free/long-rest use + slot fallback** (unlocked at
character level 3 or 5):

```typescript
export type GrantPreparedSpellEffect = {
  readonly kind: "grant_prepared_spell";
  readonly spellId: string;
  readonly freeUse: {
    readonly resource: UseCountResource;   // fixed cap 1
    readonly resetCadence: RestResetCadence; // long_rest
  };
  // "can also cast using any spell slots of the appropriate level" — slot fallback is
  // implicit; no additional field needed if the interpreter treats prepared spells as
  // always slot-castable.
};
```

---

### 5. Character-level-gated grant schedule

The `grant_prepared_spell` effects at levels 3 and 5 are not available at character level 1.
`LevelAxis` includes `"character"` but `DiceAmount` is the only surface type that uses it.

A new surface shape is needed for "unlock this effect at character level N":

```typescript
export type LevelGatedEffect<T> = {
  readonly unlocksAtCharacterLevel: number;
  readonly effect: T;
};
```

Or, encode each level-gate as a separate effect entry with a `condition` field.

The simplest approach: the `SpeciesTraitOption.effects` array carries each effect with an
optional `unlocksAtCharacterLevel` field. The tracer emits a `persist` lifecycle node with an
`expire`-less variant, or a `complete` node that fires at the unlock level.

---

### 6. Spellcasting ability choice

"Intelligence, Wisdom, or Charisma is your spellcasting ability … (choose the ability when
you select the legacy)"

This is a player-chosen parameter recorded at character-creation time. Options:

- Add an `abilityChoice: ReadonlyArray<Ability>` field to the prepared-spell effect and the
  cantrip effect, with the interpreter noting the choice is made at character creation.
- Or treat it as a builder-level parameter outside the mechanics surface (analogous to how
  the existing surface does not encode the caster's ability scores).

The second approach (out-of-scope for the mechanics surface) is more consistent with the
existing design, since spellcasting-ability derivation is already a character-projection
concern rather than a feature-mechanics concern.

---

## Affected Files

- `src/surface/types.ts` — add `SpeciesTraitRecord`, `SpeciesTraitMechanics`,
  `GrantResistanceEffect`, `GrantCantripEffect`, `GrantPreparedSpellEffect`,
  `LevelGatedEffect`, update `UnitRecord` union.
- `src/interpreter/tracer.ts` — add `traceSpeciesTraitUnit` and supporting helpers; add
  `species_trait_root` to `traceUnit` switch.

---

## Notes

- The "Otherworldly Presence" sub-trait (Thaumaturgy cantrip, same spellcasting ability)
  is a separate survey unit (`species_tiefling_otherworldly_presence`) and is not encoded
  here.
- The `Darkvision` sub-trait is similarly a separate survey unit. Neither is in scope for
  this encoding.
- The three legacy bundles are mechanically parallel (same structure, different damage types
  and spell lists). A single parameterized surface shape covers all three.
