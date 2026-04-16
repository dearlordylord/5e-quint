# Proposal: Find Steed — structural_widening

## Outcome

`structural_widening` — no existing `SpellMechanics` family can honestly encode this spell.

## Why no existing family fits

Find Steed (Conjuration 2, Instantaneous duration, Action cast) summons an **Otherworldly Steed** — a persistent companion creature governed by a stat block — that functions as a controlled mount and persists until it drops to 0 HP or the caster dies.

| Family | Why it fails |
|---|---|
| `ongoing_effect` | Duration is Instantaneous; operation types (`roll_modifier`, `damage_on_hit`) do not apply. |
| `activation` | `ActivationPhase` limited to `attack_roll \| save_gate`. No phase for companion creation. |
| `triggered_reaction` | Wrong activation shape; spell is a proactive cast, not a reaction. |
| `anchored_trigger` | Creates an autonomous actor, not a planted signal trigger. |

This is the **same structural gap** identified for Find Familiar. The `companion_summon` family proposed in `proposal-find_familiar.md` would cover both spells with `companionKind: "steed"`.

## v4 Atom Coverage

| Mechanic | v4 Atom | Status |
|---|---|---|
| Summon the steed | `create_companion` | Exists in v4 |
| Steed as attachment | `companion` (attachment atom) | Exists in v4 |
| Steed replaced on recast | `replace_on_recast` | Exists in v4 lifecycle |
| Steed disappears at 0 HP / caster death | `expire` (condition-gated) | Partial — `expire` is timed; a condition-gated variant is needed |

The structural gap is at the `SpellMechanics` family level, not the atom level.

## Steed-Specific Gaps Beyond Find Familiar

### 1. MountedCompanionCapability variant

The steed's combat role requires capabilities Find Familiar does not have:

```typescript
export type MountedCompanionCapability =
  | {
      readonly kind: "shared_initiative";
      // Steed acts on caster's initiative count, not its own.
    }
  | {
      readonly kind: "controlled_mount";
      // While ridden, the steed functions as a controlled mount
      // per mounted combat rules.
    }
  | {
      readonly kind: "incapacitation_fallback";
      // When caster has the Incapacitated condition, steed acts
      // immediately after caster's turn, independently, focusing
      // on protecting the caster.
      readonly trigger: "caster_incapacitated";
      readonly behavior: "independent_protect_caster";
    };
```

### 2. StatBlockLevelScaling (new pattern)

Upcasting scales the companion's stat block level, not a dice expression or numeric value. No existing scaling type handles this:

```
// No existing surface type for this. Conceptually:
// slot level ≥ N → use stat block at level N
// This is a reference into a companion stat block schema,
// not a DiceAmount or ThresholdTiers<number>.
```

This will recur for all "Summon X" spells (Summon Beast, Summon Aberration, etc.) that scale by stat block level.

### 3. Replace-on-recast lifecycle

"If you already have a steed from this spell, the steed is replaced by the new one." The v4 atom `replace_on_recast` exists; it needs a surface carrier in the companion lifecycle model.

### 4. Until-condition persistence

The steed persists until it drops to 0 HP or the caster dies. The Duration type has no variant for this. The `expire` lifecycle atom exists but the surface only supports timed expiry. A condition-gated `expire` variant (or a new `companion_summon` lifecycle field) is needed.

## Proposed Additions to companion_summon Family

Building on the shape proposed for Find Familiar:

```typescript
export type CompanionSummonMechanics = SpellMechanicsHeader & {
  readonly family: "companion_summon";
  readonly companionKind: "familiar" | "steed" | "beast" | "undead"; // extend as needed
  readonly capabilities: ReadonlyArray<CompanionCapability | MountedCompanionCapability>;
  readonly lifecycle: ReadonlyArray<CompanionLifecycle>;
  readonly onReplacement: "replace_existing" | "cannot_have_multiple";
  readonly slotScalesStatBlockLevel?: boolean; // true for Find Steed upcast
};
```

## Scope Note

Find Steed is the second pressure case for the `companion_summon` family (Find Familiar being the first). The mounted-combat and initiative-sharing patterns will recur for Phantom Steed. The stat-block-level-scaling pattern will recur across the entire "Summon X" spell family.
