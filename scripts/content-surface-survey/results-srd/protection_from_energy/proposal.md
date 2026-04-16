# Widening Proposal: Protection from Energy

**Unit:** `protection_from_energy` (spell, srd-5.2.1)
**Outcome:** `surface_widening`

## What fits

Protection from Energy is a Level 3 Abjuration concentration spell (1 hour) that touches a willing creature and grants it Resistance to one caster-chosen damage type for the duration. The `ongoing_effect` family is the correct shape — it is a persistent concentration buff on a single target, exactly like Bless or Hunter's Mark. Every structural field is representable:

| Field | Surface type | Value |
|---|---|---|
| `family` | `SpellMechanics["family"]` | `"ongoing_effect"` |
| `level` | `SpellLevel` | `3` |
| `school` | `SpellSchool` | `"abjuration"` |
| `castingTime` | `CastingTime` | `{ kind: "action" }` |
| `range` | `Range` | `{ kind: "touch" }` |
| `components` | `Components` | `{ v: true, s: true, m: false }` |
| `duration` | `Duration` | `{ kind: "concentration", upTo: { unit: "hour", amount: 1 } }` |
| `attachment` | `Attachment` | `{ kind: "target", selection: { mode: "one" } }` |

All five damage types mentioned in the spell (acid, cold, fire, lightning, thunder) are already members of `DamageType`.

## What is missing

`OngoingOperation` currently has two variants:

```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

- `roll_modifier` — adds a numeric delta to attack rolls or saving throws (Bless)
- `damage_on_hit` — adds a damage rider when the caster hits the marked creature (Hunter's Mark)

Neither variant captures **granting Resistance** — the game mechanic that halves all incoming damage of a specified type received by the target. This is a distinct concept with no representation in the operation vocabulary.

## Proposed widening

Add a new variant to `OngoingOperation` in `src/surface/types.ts`:

```typescript
export type GrantResistanceOperation = {
  readonly kind: "grant_resistance";
  readonly damageType: DamageType;
};

export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | GrantResistanceOperation;
```

Add a corresponding branch in `traceOngoingOperation` in `src/interpreter/tracer.ts`:

```typescript
case "grant_resistance": {
  const id = ids("op");
  nodes.push({
    id,
    category: "effect",
    atomKind: "grant_resistance",
    label: `grant_resistance\n${op.damageType}`,
  });
  edges.push({ from: procId, to: id, relation: "grants" });
  edges.push({ from: id, to: attId, relation: "attaches_to" });
  return;
}
```

## Atom inventory

`grant_resistance` is a named atom in the v4 taxonomy (TAXONOMY_atoms_graph.md, §9 Effect Atoms, line 198). No new atom is needed. This is purely a surface type widening — a new variant of an existing union.

## Notes on encoding after widening

Once the widening lands, the authored Dhall for this unit would be:

```
{ id = "protection_from_energy"
, name = "Protection from Energy"
, kind = "spell"
, provenance = { kind = "srd-5.2.1", section = "Spells/Descriptions-P#Protection-from-Energy" }
, description = "..."
, mechanics =
    { family = "ongoing_effect"
    , level = 3
    , school = "abjuration"
    , castingTime = { kind = "action" }
    , range = { kind = "touch" }
    , components = { v = True, s = True, m = False }
    , duration = { kind = "concentration", upTo = { unit = "hour", amount = 1 } }
    , attachment = { kind = "target", selection = { mode = "one" } }
    , operation = { kind = "grant_resistance", damageType = "<chosen at cast>" }
    }
}
```

The `damageType` field encodes the caster's one-time choice at cast. The five valid choices (acid, cold, fire, lightning, thunder) are all valid `DamageType` members.
