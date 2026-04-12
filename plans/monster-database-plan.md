# Plan: SRD Monster Database

> Source PRD: [PRD_MONSTER_DATABASE.md](../PRD_MONSTER_DATABASE.md)

## Architectural Decisions

Durable decisions that apply across all phases:

- **Owned collection**: Core owns a hand-authored SRD stat block collection in `packages/core`. The initial rollout does not assume generation or import pipelines.
- **Provenance**: Shipped monster records cite the local SRD corpus in `.references/srd-5.2.1/`. 5e-tools may inform structure, normalization, and review, but it is never provenance.
- **Key models**: `StatBlock` is the canonical monster-authored record. `Creature` remains the shared combat abstraction. Monster-authored sections are modeled explicitly as traits, actions, bonus actions, reactions, legendary actions, and spellcasting entries.
- **Ability representation**: The type system distinguishes executable abilities from text-only abilities structurally. Unsupported abilities remain in the stat block with authored text and an explicit non-executable reason.
- **Execution boundary**: Runtime behavior targets generic engine facilities such as attacks, multiattack, save effects, spell references, bonus-action options, reaction options, recharge, and legendary action costs. Monster-specific handlers are not an accepted expansion path.
- **Projection boundary**: Battle-owned data is derived from the canonical stat block exactly once. MCP, app, and other adapters consume those projections and do not maintain their own monster registries or duplicate monster-authored facts.
- **Spellcasting normalization**: First-pass spellcasting normalizes stable structure such as casting ability, authored save DC or spell attack bonus, spell references, and usage buckets. Tactical or procedural prose remains authored text until a generic execution surface exists.
- **Distribution policy**: The first shipped expansion covers SRD monsters only. Any future non-SRD or licensed packs must reuse the same schema and projection path while remaining explicitly segregated by provenance and distribution policy.

---

## Phase 1: Canonical Goblin Tracer Bullet

**User stories**:

- As a core author, I can represent an SRD goblin stat block in canonical repo language instead of goblin-specific shortcuts.
- As a reviewer, I can inspect SRD provenance directly on the owned goblin records.
- As a battle consumer, I can keep using the current goblin encounter path while the underlying stat block shape becomes durable.

### What to build

Replace the current goblin-oriented stat block shortcuts with the canonical `StatBlock` shape and authored section model, while preserving the existing goblin encounter behavior end to end. This first tracer bullet proves the domain vocabulary, provenance shape, and executable-versus-text-only split without widening public surfaces.

### Acceptance criteria

- [ ] `StatBlock` is the canonical monster-authored type and uses explicit authored sections rather than attack-only shortcuts as the primary shape.
- [ ] Goblin SRD entries carry explicit SRD provenance on the owned records.
- [ ] The type shape makes executable abilities and text-only abilities distinct without relying on a decorative status enum.
- [ ] Existing goblin battle flows still work through the same public battle and MCP surfaces after the stat block migration.

---

## Phase 2: Second Monster Tracer Bullet

**User stories**:

- As a core author, I can prove the schema works for a non-goblin SRD monster without introducing a monster-specific runtime handler.
- As a reviewer, I can see that a materially different stat block shape still uses the same ownership, provenance, and projection rules.
- As a maintainer, I can add the next monster primarily by authoring data rather than engine code.

### What to build

Add one non-goblin SRD monster that exercises a meaningfully different slice of the schema through the same owned record and projection path. Prefer a monster that proves a structurally different concern from goblins, such as spellcasting, a text-only unsupported authored ability, or another section shape not yet represented in the catalog.

### Acceptance criteria

- [ ] At least one non-goblin SRD monster can be added without introducing a monster-specific runtime handler.
- [ ] The new monster cites SRD provenance directly on the owned record.
- [ ] The new monster reuses the same `StatBlock` and projection path as goblins.
- [ ] Any unsupported authored ability on this monster is preserved structurally as text-only data instead of being dropped or silently improvised.

---

## Phase 3: Advanced Pattern Tracer Bullet

**User stories**:

- As a core author, I can support a repeated advanced monster pattern through a generic facility instead of a monster-specific handler.
- As a maintainer, I can add one new generic facility only when a real SRD pattern justifies it.
- As a battle consumer, I can use a more advanced monster through the same projection path as simpler monsters.

### What to build

Add one monster that requires a genuine advanced repeated pattern such as recharge, legendary actions, a stronger multiattack shape, or another durable generic facility beyond the initial goblin path. If the needed facility does not already exist, add exactly one generic facility and express the monster through canonical authored sections. Keep unsupported clauses as authored text.

### Acceptance criteria

- [ ] At least one repeated advanced monster pattern such as multiattack, recharge, or legendary action support is handled through a generic facility.
- [ ] The chosen monster uses that generic facility through canonical authored sections rather than bespoke runtime code.
- [ ] Unsupported advanced clauses remain present as text-only entries with explicit reasons instead of being silently discarded.
- [ ] Public battle and MCP surfaces remain generic after the advanced tracer-bullet slice lands.

---

## Phase 4: Hand-Authored SRD Dataset Expansion

**User stories**:

- As a project owner, I can grow the SRD monster dataset without blurring provenance or inventing a second source of truth.
- As a contributor, I can tell which SRD monster abilities are already executable and which still need generic support.
- As an adapter author, I can rely on the core-owned SRD stat block collection rather than maintaining my own monster data.

### What to build

Expand from the tracer-bullet monsters to the agreed hand-authored SRD dataset, using the proven schema and projection path from the earlier phases. Track unsupported patterns explicitly so future generic-facility work has a grounded queue, but keep the owned dataset shippable even when some abilities remain text-only.

### Acceptance criteria

- [ ] The agreed SRD monster dataset exists as hand-authored core-owned stat block data with explicit SRD provenance.
- [ ] New monster additions are primarily data entry and projection, not monster-specific engine work.
- [ ] The project has an explicit report or audit view of unsupported ability patterns to drive later generic-facility work.
- [ ] MCP, app, and other adapters continue consuming the core-owned stat block collection instead of maintaining parallel monster registries.
