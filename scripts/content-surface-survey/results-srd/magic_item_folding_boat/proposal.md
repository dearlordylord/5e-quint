# Widening Proposal: Folding Boat (`magic_item_folding_boat`)

**Outcome:** `structural_widening`

---

## Why it doesn't fit

The Folding Boat is a `magic_item`. `UnitRecord` in `types.ts` is:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord`. The tracer's top-level `switch` would throw `unhandled unit kind: magic_item` before any mechanic could be evaluated. This is a missing top-level kind — the narrowest honest classification is `structural_widening`.

---

## Required widenings (in order of dependency)

### 1. `MagicItemRecord` — new top-level record kind

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly rarity: "common" | "uncommon" | "rare" | "very_rare" | "legendary" | "artifact";
  readonly mechanics: MagicItemMechanics;
};
```

`UnitRecord` must gain `| MagicItemRecord`.

### 2. `MagicItemMechanics` family — new mechanics union

The Folding Boat uses a **multi-command-word** pattern: three named activations, each consuming a Magic action, each producing a different effect. A plausible family for this is `command_word`:

```typescript
export type CommandWordMechanics = {
  readonly family: "command_word";
  readonly activationCost: { readonly kind: "magic_action" };
  readonly commands: ReadonlyArray<{
    readonly name: string;
    readonly precondition?: CommandWordPrecondition;
    readonly effect: MagicItemEffect;
  }>;
};
```

### 3. `alter_item_kind` effect — already in v4 taxonomy, missing from `types.ts`

The core effect of the Folding Boat is switching the item between three physical forms. The v4 taxonomy lists `alter_item_kind` under Effect Atoms. It needs a surface type:

```typescript
export type AlterItemKindEffect = {
  readonly kind: "alter_item_kind";
  readonly targetForm: string;  // e.g. "rowboat", "keelboat", "box"
};
```

### 4. Activation cost variant: `magic_action`

`ClassFeatureActivationCost` currently only has `free` and `bonus_action`. Magic items activated by the Magic action need a new variant:

```typescript
| { readonly kind: "magic_action" }
```

This is a `surface_widening` relative to the existing activation cost shape.

### 5. Precondition guard on command words

The third command word ("fold back to box") only works "if no creatures are aboard." No precondition check shape exists in the surface. A minimal closed enum would serve:

```typescript
export type CommandWordPrecondition =
  | { readonly kind: "no_creatures_in_or_on_item" };
```

---

## What the trace would look like (sketch)

```
magic_item_root → command_word (Magic action)
  command_word[1: "Rowboat"] → alter_item_kind(rowboat)
  command_word[2: "Keelboat"] → alter_item_kind(keelboat)
  command_word[3: "fold"] [precondition: no_creatures_in_or_on_item]
    → alter_item_kind(box)
```

Relations used would be: `roots`, `grants`, `consumes`, `requires` (for the precondition).

---

## Notes on out-of-scope behavior

The following behaviors are **caller-owned** per `ARCHITECTURE.md` and do not need core atoms:
- Weight change when becoming a vessel ("weight becomes that of a normal vessel its size")
- Object transfer logic when folding/unfolding ("anything that was stored in the box remains in the boat")
- Destruction on HP reduction ("if either vessel is reduced to 0 Hit Points, the Folding Boat is destroyed")

These are physical/narrative consequences of the form change, not deterministic mechanical resolution atoms. Only the HP destruction trigger might eventually warrant a `return_on_end` or `break` lifecycle atom if a future item family models item HP.
