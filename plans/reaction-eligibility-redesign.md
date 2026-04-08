# Plan: Reaction Eligibility Redesign

> Source PRD: [battle/PRD-reaction-eligibility.md](../battle/PRD-reaction-eligibility.md)

## Architectural decisions

Durable decisions that apply across all phases:

- **Authoritative model**: `battle.qnt` remains the source of truth for battle reaction legality. Runtime changes must mirror the spec, not lead it.
- **Boundary**: spatial facts remain caller-provided inputs. This work only formalizes the reaction legality that RAW prescribes once those inputs are known.
- **Reaction window model**: reaction windows must carry both eligible responders and the legal named reactions available in that exact interrupt.
- **Naming**: reaction decisions should use domain language for named flow features rather than generic placeholders.
- **No duplicate state**: legality facts should be captured at interrupt creation time from already-known trigger context, not recomputed later from partial state or copied into parallel registries.
- **Parity path**: every phase that changes battle semantics must update Quint, runtime, bridge mappings, deterministic scenario tests, and Tier 1 battle MBT.
- **Downstream dependency**: the available-actions / MCP surface must not expose semantic reaction actions until this redesign provides owned trigger-window state.

---

## Phase 1: Damage Window Ownership

**User stories**: owned trigger-window state for damage reactions; prevent impossible damage reactions from being expressed

### What to build

Redesign the damage-reaction interrupt as a complete vertical slice before migrating specific named reactions onto it. The battle model should preserve the trigger facts needed to decide whether the defender can legally use a damage reaction, and the damage window should only exist when there is at least one legal response in that moment. This phase establishes owned trigger-window state and decision validation without requiring the full named-reaction migration yet.

### Acceptance criteria

- [x] The authoritative battle model preserves the trigger facts needed to validate damage reactions at the interrupt point.
- [x] If no legal damage reaction exists, the battle proceeds without opening a meaningless damage-reaction window.
- [x] Illegal damage-reaction decisions are rejected by the battle engine rather than being silently accepted.
- [x] The redesign is verified end-to-end through deterministic battle scenarios, even if only a minimal representative damage reaction is enabled at this stage.
- [x] Tier 1 battle parity checks pass after the redesign.

### Phase 1 notes

- Implemented with owned `legalReactions` on `PIAttackDamage`, plus the trigger facts that later named-reaction phases need: `targetCanSeeAttackerAtHit` and `isWeaponAttack`.
- The damage window now opens only when the target has at least one legal response at the interrupt point.
- Deterministic coverage proves:
  - no damage window when the target has no legal damage reaction
  - no `Uncanny Dodge` window when the attacker is unseen
  - illegal damage-reaction decisions are rejected as no-ops against the owned window state
- Phase 1 verification also surfaced and fixed a pre-existing projection-driver drift: the projection MBT fixture still initialized combatant `D` as a non-fighter even though `battle.qnt` has `D` as fighter 5.

---

## Phase 2: Named Damage Reactions

**User stories**: RAW-faithful named damage reactions; explicit legality for `Uncanny Dodge` and `Deflect Attacks`

### What to build

Move the first named damage reactions onto the owned damage-window model from Phase 1. This phase should make the modeled damage reactions use domain naming, enforce their exact legality rules, and demonstrate that the redesigned window can support named flow features without generic loopholes.

### Next implementation notes

- Rename the generic damage-reduction branch to `RDeflectAttacks` in both Quint and TS.
- Keep `Uncanny Dodge` and `Deflect Attacks` as the only legal named damage reactions on this window.
- Add deterministic scenario coverage for:
  - positive `Uncanny Dodge`
  - positive `Deflect Attacks`
  - negative `Deflect Attacks` on a non-weapon or wrong-damage attack unless Deflect Energy applies

### Acceptance criteria

- [x] Damage-reaction decisions use domain naming for the reactions they represent.
- [x] `Uncanny Dodge` is modeled as a named legal damage reaction with the required trigger conditions.
- [x] `Deflect Attacks` is modeled as a named legal damage reaction with the required trigger conditions.
- [x] Deterministic scenario tests cover positive and negative legality cases for the first named damage reactions.
- [x] Tier 1 battle parity checks pass after the redesign.

### Phase 2 notes

- Renamed the generic damage-reduction decision to `RDeflectAttacks` across Quint, runtime, MBT bridges, and scenario coverage.
- Deterministic coverage now proves:
  - positive `Uncanny Dodge`
  - positive `Deflect Attacks`
  - negative `Deflect Attacks` on a non-weapon spell attack before Deflect Energy
- This phase did not change the Phase 1 ownership shape; it only moved the damage window onto explicit domain naming.

---

## Phase 3: Hit Reaction Ownership

**User stories**: RAW-faithful hit reactions; explicit legality for named hit-interrupt features; reusable reaction-window architecture

### What to build

Apply the same ownership pattern to hit-reaction windows. The hit interrupt should carry explicit legal reaction options for each responder rather than relying on a generic responder set plus caller-chosen decision variant. This phase should cover the named hit reactions already modeled by the battle system and align their legality with the battle-domain window model established in Phase 1.

### Next implementation notes

- Unlike the damage window, `PIAttackHit` is genuinely multi-responder. This phase should use a per-creature legal-reaction map rather than another target-local set.
- `Shield` is already close to fully ownable from current battle state: prepared spell identity, slot availability, reaction availability, and one-slot-per-turn are already tracked.
- `Cutting Words` is not yet fully ownable because battle combatants do not currently carry bardic-inspiration charge state.
- `Parry` is not yet fully ownable because battle combatants do not currently carry a named parry capability or parry-bonus source.
- So Phase 3 should explicitly include the owned-state additions that make those hit reactions honest, rather than narrowing the hit window back to `Shield` alone.

### Acceptance criteria

- [ ] Hit-reaction windows explicitly model legal named reactions for responders in that interrupt.
- [ ] Generic responder-only hit windows are removed or narrowed so they no longer allow impossible reaction choices.
- [ ] Deterministic scenario tests cover at least one positive and one negative legality case for the named hit reactions already modeled.
- [ ] The battle runtime and authoritative model remain in parity for hit-reaction sequencing.
- [ ] Tier 1 battle parity checks pass after the redesign.

---

## Phase 4: Reaction Facility Normalization

**User stories**: consistent reaction-window architecture across battle flow; easier future addition of named SRD reactions

### What to build

Normalize the shared reaction-window architecture so the battle layer has one coherent way to represent reaction legality across interrupt types. This phase should align the battle-domain representation of interrupt windows, legal reaction options, and decision validation so future flow reactions can plug into the same architecture without reintroducing generic loopholes.

### Acceptance criteria

- [ ] Battle interrupt windows use a consistent legality model across at least hit and damage reaction facilities.
- [ ] Decision validation happens against authoritative window state rather than ad hoc runtime assumptions.
- [ ] The architecture for adding future named reactions is documented and consistent with the implemented window model.
- [ ] Existing deterministic scenario coverage for reactions still passes on the normalized facility.
- [ ] Tier 1 battle parity checks pass after normalization.

---

## Phase 5: Action-Surface Reaction Tokens

**User stories**: honest semantic reaction actions in the supported action-query surface; no over-suggested reaction actions

### What to build

Expose semantic reaction-cost actions through the supported action-query and MCP surface, now that trigger-window ownership exists in the battle model. The first exposed reaction actions should be chosen from the candidates already identified as blocked by missing owned trigger state, and they should only appear when the exact trigger window and legality conditions are satisfied.

### Acceptance criteria

- [ ] At least one semantic reaction action is exposed honestly through the supported action-query surface.
- [ ] The exposed reaction token appears only when the corresponding legal trigger window exists.
- [ ] The action-query surface does not suggest reaction actions based solely on resource availability.
- [ ] End-to-end tests cover both action discovery and execution for the exposed semantic reaction action.
- [ ] The implementation reuses the authoritative reaction-window legality rather than introducing parallel query-only state.
