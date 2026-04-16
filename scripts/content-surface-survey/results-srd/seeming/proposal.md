# Proposal: Widenings required for Seeming

**Unit:** Seeming (Level 5 Illusion spell, SRD 5.2.1)  
**Outcome:** `atom_widening`  
**Blocker:** The core effect payload — persistent illusory appearance change on a creature — has no effect atom in v4 or `types.ts`.

---

## 1. New atom: `alter_appearance` (Effect)

**Category:** effect  
**Justification:**  
Seeming's delivered effect is changing the apparent physical form of creatures (bodies, equipment, height, apparent weight) for 8 hours. This is mechanically real: it affects what observers perceive, it is gated by a saving throw for unwilling targets, and it is pierceable by Investigation checks. It is not reducible to any existing effect atom:

- Not `apply_condition` — "disguised" or "illusory appearance" is not an SRD-defined condition in the conditions list.
- Not `damage` / `heal` / `modify_max_hp` — no HP interaction.
- Not `modify_ac` / `modify_roll_*` / `modify_speed` — no numeric modifier.
- Not `block_targeting` / `grant_resistance` — no combat-immunity effect.

The atom `alter_item_kind` exists in v4 for items, but does not extend to creatures. A new `alter_appearance` effect atom is needed for spells that overwrite a creature's sensory presentation (Seeming, Disguise Self, Polymorph's cosmetic layer, etc.).

**Evidence:**  
> "The spell can change the appearance of the targets' bodies and equipment. You can make each creature seem 1 foot shorter or taller and appear heavier or lighter."

---

## 2. New variant: unbounded target selection (`choose_any_in_range`)

**Category:** surface_widening (variant of `TargetSelection`)  
**Justification:**  
Seeming targets "each creature of your choice that you can see within range" — no numeric cap, no per-slot scaling. The current `choose_up_to` mode requires a `SlotScaling<number>` count. A new `TargetSelection` mode is needed:

```typescript
| { readonly mode: "choose_any_in_range" }
```

This covers "any subset of visible creatures within range, caster-chosen at cast time, no numeric limit."

**Evidence:**  
> "You give an illusory appearance to each creature of your choice that you can see within range."

---

## 3. New variant: consent-filter save gate

**Category:** surface_widening (variant of `ActivationPhase` save_gate, or new attachment filter)  
**Justification:**  
The Cha save applies **only to unwilling targets**. Willing targets are automatically affected and do not roll. This is structurally different from the existing `save_gate` ActivationPhase, which applies uniformly to every creature in the attachment.

Options:
- Add `readonly willingBypass: boolean` to the `save_gate` phase — willing targets skip the save.
- Or model as a two-step attachment: willing targets attach directly; unwilling targets go through a save gate.

The simplest and most reusable shape is a boolean on the existing `save_gate` phase:

```typescript
| {
    readonly kind: "save_gate";
    readonly attachment: Attachment;
    readonly ability: Ability;
    readonly dc: DcSource;
    readonly willingBypass: boolean;   // NEW
    readonly onFail: Effect;
    readonly onSuccess: Effect;
  }
```

**Evidence:**  
> "An unwilling target can make a Charisma saving throw, and if it succeeds, it is unaffected by this spell."

---

## 4. New atom: `scrutiny_check_window` (Window)

**Category:** atom_widening  
**Justification:**  
Any observer can use the Study action to attempt an Investigation check (vs spell save DC) to detect that a target is disguised. This is a post-cast, observer-initiated, ability-check-gated reveal mechanic. It is distinct from all existing window atoms:

- Not `reaction_window` — the observer is not reacting to an event targeting them.
- Not `post_action_window` — `post_action_window` in the tracer is used for the anchored-trigger "enters area" pattern, not ability-check reveals.
- Not `save_gate` as a resolution — it is an ability check (Investigation), not a saving throw, and it is initiated by an observer, not the target.

A new window atom `scrutiny_check_window` (or `investigation_window`) is needed to represent "observer takes specific study action → ability check → illusion revealed" patterns. This would recur for Major Image, Silent Image, Programmed Illusion, and similar spell families.

**Evidence:**  
> "A creature that takes the Study action to examine a target can make an Intelligence (Investigation) check against your spell save DC. If it succeeds, it becomes aware that the target is disguised."

---

## Summary

| Gap | Kind | Priority |
|-----|------|----------|
| `alter_appearance` effect atom | `new_atom` | **Blocker** — core payload missing |
| `choose_any_in_range` target selection | `new_variant` | Required for honest attachment |
| Consent-filter save gate | `new_variant` | Required for willing/unwilling distinction |
| `scrutiny_check_window` | `new_atom` | Required for investigation-reveal mechanic |

All four gaps must be resolved before Seeming can be encoded honestly. The `alter_appearance` atom is the primary blocker; the others compound it.
