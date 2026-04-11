# Plan: SRD Monster Database

> Source PRD: [PRD_MONSTER_DATABASE.md](../PRD_MONSTER_DATABASE.md)

## Architectural Decisions

Durable decisions that apply across all phases:

- **Owned collection**: Core owns a hand-authored SRD stat block collection in `packages/core`. The initial expansion does not assume generation or import pipelines.
- **Provenance**: Shipped monster records cite the local SRD corpus in `.references/srd-5.2.1/`. 5e-tools may inform structure, normalization, and review, but it is never provenance.
- **Key models**: `StatBlock` is the canonical monster-authored record. `Creature` remains the shared combat abstraction. Monster-authored sections are modeled explicitly as traits, actions, bonus actions, reactions, legendary actions, and spellcasting entries.
- **Ability representation**: The type system distinguishes executable abilities from text-only abilities structurally. Unsupported abilities remain in the stat block with authored text and an explicit non-executable reason.
- **Execution boundary**: Runtime behavior targets generic engine facilities such as attacks, multiattack, save effects, spell references, bonus-action options, reaction options, recharge, and legendary action costs. Monster-specific handlers are not an accepted expansion path.
- **Projection boundary**: Battle-owned data is derived from the canonical stat block exactly once. MCP, app, and other adapters consume those projections and do not maintain their own monster registries or duplicate monster-authored facts.
- **Spellcasting normalization**: First-pass spellcasting normalizes stable structure such as casting ability, authored save DC or spell attack bonus, spell references, and usage buckets. Tactical or procedural prose remains authored text until a generic execution surface exists.
- **Distribution policy**: The first shipped expansion covers SRD monsters only. Any future non-SRD or licensed packs must reuse the same schema and projection path while remaining explicitly segregated by provenance and distribution policy.

---

## Phase 1: Canonical Goblin Stat Blocks

**User stories**:

- As a core author, I can represent an SRD goblin stat block in canonical repo language instead of goblin-specific shortcuts.
- As a reviewer, I can inspect SRD provenance directly on the owned goblin records.
- As a battle consumer, I can keep using the current goblin encounter path while the underlying stat block shape becomes durable.

### What to build

Replace the current goblin-oriented stat block shortcuts with the canonical `StatBlock` shape and authored section model, while preserving the existing goblin encounter behavior end to end. This slice proves the domain vocabulary, provenance shape, and executable-versus-text-only split without widening public surfaces yet.

### Acceptance criteria

- [ ] `StatBlock` is the canonical monster-authored type and uses explicit authored sections rather than attack-only shortcuts as the primary shape.
- [ ] Goblin SRD entries carry explicit SRD provenance on the owned records.
- [ ] The type shape makes executable abilities and text-only abilities distinct without relying on a decorative status enum.
- [ ] Existing goblin battle flows still work through the same public battle and MCP surfaces after the stat block migration.

---

## Phase 2: Derived Generic Monster Action Surfaces

**User stories**:

- As a battle engine author, I can derive monster action availability from authored sections instead of parallel runtime-only monster flags.
- As an MCP or app consumer, I receive the same generic monster action surfaces without owning monster-specific rules.
- As a maintainer, I can add new monster-authored actions without inventing a second registry.

### What to build

Project the goblin-authored sections onto the existing generic battle surfaces so monster attacks, bonus actions, and reactions are derived from stat block data instead of being stored as separate monster shortcuts. This slice closes the loop between authoring and battle projection and removes the main duplication risk before expanding the dataset.

### Acceptance criteria

- [ ] Generic battle options for goblin attacks, bonus actions, and reactions are derived from authored stat block sections.
- [ ] Primary authored monster data no longer depends on separate shortcut fields for bonus-action or reaction availability.
- [ ] Public battle and MCP tokens remain generic rather than introducing monster-named commands.
- [ ] Adding or changing a goblin-authored section updates the derived battle surface through one projection path.

---

## Phase 3: First Broader SRD Data Slice

**User stories**:

- As a core author, I can add new SRD monsters by authoring data rather than engine code.
- As a reviewer, I can see which supported generic facilities each new monster uses.
- As a battle consumer, I can start encounters with more than the current goblin set through the same core-owned stat block path.

### What to build

Add a small hand-authored set of non-goblin SRD monsters that fit the already-supported generic facilities. Choose representative monsters that prove the widened schema is genuinely reusable, but keep the slice thin enough that each monster lands through the same end-to-end path: owned stat block, SRD provenance, battle projection, and verification.

### Acceptance criteria

- [ ] At least one non-goblin SRD monster can be added without introducing a monster-specific runtime handler.
- [ ] Each new monster cites SRD provenance directly on the owned record.
- [ ] The new monsters reuse the same `StatBlock` and projection path as goblins.
- [ ] Any unsupported authored ability is preserved structurally as text-only data instead of being dropped or silently improvised.

---

## Phase 4: Spellcasting Foundation Slice

**User stories**:

- As a core author, I can represent an SRD monster with spellcasting in a way that is structurally reliable even before full automation exists.
- As a battle or app consumer, I can inspect monster spellcasting data without relying on monster-specific code.
- As a maintainer, I can extend generic spell execution later without reauthoring the underlying stat block.

### What to build

Land the first spellcasting monster path using the repo's stable spellcasting foundation: normalized spellcasting structure, spell references, authored usage buckets, and prose retained where a generic execution surface does not yet exist. This slice proves that the database can grow ahead of full spellcasting automation without losing fidelity or smuggling in bespoke code.

### Acceptance criteria

- [ ] A spellcasting SRD monster can be represented in the canonical stat block shape with stable spellcasting structure and explicit SRD provenance.
- [ ] Structured spellcasting fields capture spell references and authored usage buckets without requiring brittle procedural parsing.
- [ ] Tactical or exception prose remains available as authored text where no generic execution facility exists yet.
- [ ] The battle or app layer consumes the normalized spellcasting data through existing generic spell references or descriptive output, not per-monster code paths.

---

## Phase 5: Advanced Monster Ability Slice

**User stories**:

- As a core author, I can support common advanced monster patterns such as multiattack, recharge, or legendary actions through generic facilities.
- As a maintainer, I can add one new generic facility when a repeated SRD pattern justifies it instead of adding monster-specific handlers.
- As a battle consumer, I can use advanced monster stat blocks through the same projection path as simpler monsters.

### What to build

Add a narrow set of advanced SRD monsters whose authored sections require one or more generic facilities beyond the initial goblin-style attack path. Use this phase to validate the intended expansion model: introduce generic support only when a repeated pattern demands it, keep the authored text intact, and continue projecting everything through the same battle initialization path.

### Acceptance criteria

- [ ] At least one repeated advanced monster pattern such as multiattack, recharge, or legendary action support is handled through a generic facility.
- [ ] The chosen monsters use that generic facility through canonical authored sections rather than bespoke runtime code.
- [ ] Unsupported advanced clauses remain present as text-only entries with explicit reasons instead of being silently discarded.
- [ ] Public battle and MCP surfaces remain generic after the advanced slice lands.

---

## Phase 6: Hand-Authored SRD Dataset Expansion

**User stories**:

- As a project owner, I can grow the SRD monster dataset without blurring provenance or inventing a second source of truth.
- As a contributor, I can tell which SRD monster abilities are already executable and which still need generic support.
- As an adapter author, I can rely on the core-owned SRD stat block collection rather than maintaining my own monster data.

### What to build

Expand from representative tracer-bullet monsters to the agreed hand-authored SRD dataset, using the proven schema and projection path from the earlier phases. Track unsupported patterns explicitly so future generic-facility work has a grounded queue, but keep the owned dataset shippable even when some abilities remain text-only.

### Acceptance criteria

- [ ] The agreed SRD monster dataset exists as hand-authored core-owned stat block data with explicit SRD provenance.
- [ ] New monster additions are primarily data entry and projection, not monster-specific engine work.
- [ ] The project has an explicit report or audit view of unsupported ability patterns to drive later generic-facility work.
- [ ] MCP, app, and other adapters continue consuming the core-owned stat block collection instead of maintaining parallel monster registries.
