# Proposal: `magic_item_pearl_of_power`

## Outcome: `atom_widening`

## Missing atom: `recover_spell_slot`

### SRD text

> While this pearl is on your person, you can take a Magic action to regain one expended spell slot of level 3 or lower. Once you use the pearl, it can't be used again until the next dawn.

### What fits

The record shape and mechanics family are fully expressible:

- **Kind**: `magic_item`
- **Family**: `activation`
- **Activation cost**: `{ kind: "standard_action", action: "magic" }`
- **Resource**: `{ kind: "use_count", cap: { kind: "fixed", uses: 1 } }`
- **Reset cadence**: `{ kind: "dawn" }`
- **Attunement**: `requiresAttunement: true`, `attunementRestriction: { kind: "spellcaster" }`
- **Condition**: `{ kind: "wearing_item" }` (covers "while this pearl is on your person")
- **Destruction**: `{ kind: "none" }`

### What is missing

The entire mechanical payload — recovering an expended spell slot — has no corresponding `EffectAtom` in the current surface. No existing atom comes close:

- `grant_spell_access` — grants the ability to cast a spell, not to recover a slot
- `heal_hp` — wrong resource domain
- `grant_temp_hp` — wrong resource domain
- All other atoms — unrelated to the spell-slot economy

### Proposed new atom

```typescript
| {
    readonly kind: "recover_spell_slot";
    // Maximum slot level that may be recovered. The player chooses any
    // expended slot at or below this level at activation time.
    readonly maxLevel: SpellLevel;
  }
```

**Semantics**: At activation time, the bearer chooses one expended spell slot of level ≤ `maxLevel` from their own spell slot pool and regains it. This is player-chosen at the moment of activation and constrained to the bearer's own slots.

**Pressure**: Pearl of Power is the sole SRD 5.2.1 unit with this shape in this survey batch, but the mechanic is well-established in 5e design (Arcane Recovery, Natural Recovery, Spell Mastery all share similar slot-recovery semantics — they differ in cadence and scope). A bounded `maxLevel` field covers the Pearl's "level 3 or lower" constraint and generalises to other potential slot-recovery items.

**v4 taxonomy placement**: `effect` category — it changes the bearer's resource state (spell slot pool) deterministically. Not `resource` (that's the source pool atom), not `lifecycle` (no duration/expiry). The outcome is immediate and complete on resolution.

### Tracer subgraph sketch

```
activate
  → consumes: use_count (max 1)
  → consumes: action_quota (magic)
  → resets_via: duration_window (daily at dawn)
  → requires: wearing_item
  → grants: direct_apply [phase 1]
    → grants: recover_spell_slot (maxLevel=3)
```
