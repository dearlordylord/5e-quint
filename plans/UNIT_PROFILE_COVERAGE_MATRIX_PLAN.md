# Plan: Unit Profile Coverage Matrix

> Source PRD: user grill on a second coverage layer for SRD Units plus public
> renamed Classic 2024 non-SRD mechanics-only Units.

## Architectural Decisions

Durable decisions that apply across all phases:

- **Classic meaning**: `Classic` names the PHB-shaped 2024 mechanics universe.
  SRD 5.2.1 is conceptually part of Classic, but it is stored separately because
  it has Creative Commons SRD provenance.
- **Collection split**: the combined Classic library is derived from two
  non-overlapping collections:

  ```text
  classic2024UnitLibrary =
    srd521UnitCollection
    + classic2024NonSrdMechanicsUnitCollection
  ```

  The combined library is a view, not an authored collection. Mixed provenance
  or mixed distribution policy is invalid at collection boundaries.
- **Classic non-SRD policy**: `classic2024NonSrdMechanicsUnitCollection`
  contains public, renamed, mechanics-only authored `UnitRecord`s for Classic
  mechanics not already covered by SRD. It intentionally preserves recognizable
  execution semantics while excluding protected expression.
- **Protected expression exclusion**: Classic non-SRD records must not copy
  canonical names, descriptions, flavor text, examples, rules prose, unique
  phrasing, table presentation, artwork/lore labels, or copyrighted naming
  taxonomy where avoidable.
- **Allowed mechanics facts**: Classic non-SRD records may preserve exact
  level gates, prerequisites, activation timing, resource cadence, dice,
  numerical values, damage types, conditions, durations, target shapes, action
  economy, and structural relationships needed for execution.
- **Synthetic naming**: Classic non-SRD human labels and ids use a stable
  mushroom/fungi-themed synthetic namespace for review recognition. Names are
  decorative and never semantic. Coverage/search uses structured fields.
- **Profile model**: QNT proves structural mechanics profiles, not individual
  authored Units. Unit coverage proves that every authored Unit maps to one or
  more supported profiles or to an explicit unsupported disposition.
- **Procedure parity vs Unit identity**: QMBT2-QMBT6 are Procedure Parity MBT:
  focused behavior-shape parity against production reducers. Specific Unit
  Parity MBT is a later, selective identity-aware lane driven by this matrix.
- **Selective MBT identity coverage**: deterministic projection/admission
  coverage should span every executable Unit. MBT by concrete Unit id is for
  representative or high-risk identities, not every Unit in the catalog.
- **No duplicate SRD overlap**: if a mechanic is covered by an SRD Unit, the
  Classic non-SRD collection does not author a duplicate renamed record for it.
- **Provenance discipline**: SRD provenance, Classic non-SRD mechanics source
  lane, structured import input, and runtime projection are distinct concepts.
  Do not collapse them into one field or one type.
- **Matrix relationship**: the existing RAW coverage matrix remains the rules
  text coverage layer. This plan adds a content/profile coverage layer that
  references RAW requirement ids and QNT profile ids where applicable.

## Data Shape

The planned artifacts should live under `plans/unit-profile-coverage/` until
the tracer proves the shape belongs in a package or script boundary:

- `collections.json`: generated or declared collection boundaries and
  distribution policy.
- `unit-claims.jsonl`: one row per authored Unit id, with collection id,
  synthetic display label, profile ids, RAW requirement links, and closure
  disposition.
- `profiles.jsonl`: one row per stable mechanics profile id.
- `task-claims.jsonl`: active-plan task claims against profile ids and Unit
  coverage slices, without duplicating task status.
- `UNIT_REPORT.md`: generated human report.
- `unit-matrix.json`: generated machine report.

Logical shapes:

```typescript
type UnitCollectionId =
  | "srd-5.2.1"
  | "classic-2024-non-srd-mechanics";

type UnitCollectionPolicy =
  | {
      readonly tag: "srd";
      readonly provenance: "srd-5.2.1";
      readonly distribution: "creative-commons-srd";
    }
  | {
      readonly tag: "classic-non-srd-mechanics";
      readonly provenance: "classic-2024-mechanics-source-lane";
      readonly distribution: "public-mechanics-only-renamed";
      readonly protectedExpression: "excluded";
    };

type MechanicsProfileClaim =
  | {
      readonly tag: "supported-profile";
      readonly profileIds: ReadonlyNonEmptyArray<string>;
      readonly rawRequirementIds: ReadonlyArray<string>;
    }
  | {
      readonly tag: "unsupported-profile";
      readonly reason: string;
      readonly futureProfileOwner?: string;
    }
  | {
      readonly tag: "needs-surface-widening";
      readonly issue: string;
    }
  | {
      readonly tag: "needs-assumption";
      readonly issue: string;
    }
  | {
      readonly tag: "closed-by-assumption";
      readonly assumptionId: string;
    };

type UnitCoverageClaim = {
  readonly unitId: string;
  readonly collectionId: UnitCollectionId;
  readonly syntheticLabel?: string;
  readonly sourceRecordPath: string;
  readonly claim: MechanicsProfileClaim;
};

type MechanicsProfile = {
  readonly id: string;
  readonly title: string;
  readonly profileKind:
    | "character-creation"
    | "passive"
    | "action"
    | "bonus-action"
    | "reaction"
    | "spell-invocation"
    | "persistent-effect"
    | "summoned-companion"
    | "stat-block-control"
    | "resource"
    | "equipment"
    | "table-caller";
  readonly qntOwners: ReadonlyArray<string>;
  readonly runtimeOwners: ReadonlyArray<string>;
  readonly verificationOwners: ReadonlyArray<{
    readonly kind: "qnt-proof" | "focused-mbt" | "runtime-test" | "catalog-test";
    readonly ownerPath: string;
  }>;
};
```

Invalid states to reject:

- Classic non-SRD collection containing SRD provenance.
- SRD collection containing Classic non-SRD provenance.
- Same Unit id in both collections.
- Classic non-SRD record with canonical names or copied text fields.
- Classic non-SRD record with no synthetic label.
- A Unit profile claim referencing a missing profile id.
- A supported profile with no QNT owner when it claims runtime execution
  semantics.
- A completed QMBT profile claim without focused MBT or runtime-test evidence.
- A Unit with executable mechanics that is neither profile-mapped nor explicitly
  closed by unsupported/widening/assumption disposition.

## Report Health And Coverage Metrics

The report must separate:

- **Installed collection inventory count**: installed Units discovered from
  configured collections. This is report health, not coverage, because the
  checker does not have an independent expected-inventory boundary.
- **Authored Surface Unit catalog admission**: authored Surface Unit-shaped
  records admitted to installed collections / authored Surface Unit-shaped
  records discovered.
- **Authored Surface executable catalog admission**: authored Surface
  Unit-shaped records with executable mechanics admitted to installed
  collections / authored Surface Unit-shaped records with executable mechanics.
- **Installed Unit profile classification coverage**: installed Units with
  profile/disposition claims / installed Units discovered.
- **Supported executable Unit coverage**: installed Units mapped to supported
  profiles / installed Units with executable mechanics.
- **QNT profile modeling coverage**: executable profiles with QNT owners /
  profiles whose kind requires executable evidence. Passive profiles count here
  when they have production runtime semantics.
- **QNT proof coverage**: executable profiles with proof evidence / executable
  profiles whose kind requires executable evidence.
- **Runtime mapping coverage**: executable profiles with runtime owners /
  profiles whose kind requires executable evidence.
- **Runtime parity coverage**: executable profiles with focused MBT or runtime
  tests / profiles whose kind requires executable evidence.
- **Deterministic admission/projection coverage**: supported Unit ids with
  deterministic admission/projection evidence / installed Units with
  supported-profile claims.
- **Selected identity MBT coverage**: supported Unit ids with selected identity
  MBT evidence / installed Units with supported-profile claims.
- **Classic non-SRD expression gate**: Classic non-SRD records passing the
  no-protected-expression checker / Classic non-SRD records.

---

## Phase 1: Collection Boundary Tracer

**User stories**:

- As a maintainer, I can distinguish SRD Unit provenance from public renamed
  Classic non-SRD mechanics records.
- As an author, I can add a Classic non-SRD mechanics-only Unit without
  polluting the SRD collection.
- As a reviewer, I can see that SRD remains conceptually part of Classic while
  storage stays split for provenance and distribution.

### What To Build

Create the initial unit-profile coverage directory, collection policy artifact,
and checker command. Add one tiny Classic non-SRD fixture record with a
mushroom/fungi synthetic id and no protected expression. The fixture should be
mechanically simple enough to prove provenance, duplicate-id, and naming gates
without requiring runtime behavior.

### Acceptance Criteria

- [ ] `srd521UnitCollection` remains SRD-only.
- [ ] `classic2024NonSrdMechanicsUnitCollection` is represented as a distinct
      collection boundary.
- [ ] The combined Classic view is derived from the two collections and cannot
      be authored directly as a mixed collection.
- [ ] The checker rejects duplicate Unit ids across SRD and Classic non-SRD.
- [ ] The checker rejects Classic non-SRD records without mushroom/fungi-themed
      synthetic labels.
- [ ] The checker rejects Classic non-SRD records containing protected
      expression fields or canonical-name markers.
- [ ] The generated report explains that SRD is a subset of Classic
      conceptually, but stored separately.

---

## Phase 2: Profile Taxonomy Tracer

**User stories**:

- As a QNT author, I can prove a mechanics profile once instead of proving every
  authored Unit separately.
- As a Surface author, I can see which profile a Unit instantiates.
- As a reviewer, I can reject broad profile names that hide unsupported
  mechanics.

### What To Build

Define the first narrow `MechanicsProfile` rows and map a small set of existing
SRD Units plus the Classic non-SRD fixture to them. Start with profiles already
represented by QCORE/QMBT work, such as action feature, reaction feature,
spell invocation, and persistent effect. Keep profile ids stable and domain
named.

### Acceptance Criteria

- [ ] At least one SRD Unit maps to a supported profile.
- [ ] At least one Classic non-SRD Unit maps to a supported profile.
- [ ] Unsupported Units carry a typed unsupported/widening/assumption
      disposition, not an empty profile list.
- [ ] Profile rows cite QNT owners when they claim executable semantics.
- [ ] Owner artifacts cite profile ids with a parseable claim convention.
- [ ] The checker verifies both directions between profile rows and owner
      artifact claims.

---

## Phase 3: Catalog Gate

**User stories**:

- As a maintainer, I can prove every shipped Unit is classified by profile or
  explicitly closed.
- As a runtime author, I can rely on profile support gates rather than Unit ids.
- As a reviewer, I can catch unsupported authored mechanics before they leak
  into runtime.

### What To Build

Extend the checker to load every installed Unit record from SRD and Classic
non-SRD collections. Validate parse success, collection policy, duplicate ids,
profile claims, and closure disposition. Do not duplicate Unit facts in matrix
artifacts; generated inventory comes from the authored collections.

### Acceptance Criteria

- [ ] Every installed SRD Unit appears in `unit-matrix.json`.
- [ ] Every installed Classic non-SRD Unit appears in `unit-matrix.json`.
- [ ] Every Unit has exactly one coverage disposition: supported profile,
      unsupported profile, needs Surface widening, needs assumption, or closed
      by assumption.
- [ ] The checker fails when a Unit disappears from the generated inventory but
      remains claimed.
- [ ] The checker fails when a claim references an unknown Unit id.
- [ ] The checker remains deterministic and fast enough for routine use.

---

## Phase 4: QCORE Profile Backfill

**User stories**:

- As a project owner, I can see which existing QCORE proofs cover authored Unit
  profiles.
- As a QNT author, I can choose the next profile based on uncovered Units.
- As a maintainer, I can distinguish profile coverage from raw SRD text
  coverage.

### What To Build

Backfill profile claims for existing QCORE7-QCORE11 proof families. Map current
SRD Units that instantiate those profiles. Keep the matrix honest: if a Unit
contains mechanics beyond a proved profile, split its claim or mark the
remainder as unsupported/widening.

### Acceptance Criteria

- [ ] QCORE7 movement/grapple-related Unit pressure maps to profile ids where
      relevant.
- [ ] QCORE8 reaction/continuation-related Unit pressure maps to profile ids.
- [ ] QCORE9 feature procedure Units map to profile ids.
- [ ] QCORE10 spell procedure Units map to profile ids.
- [ ] QCORE11 stat-block control pressure remains separate from `UnitRecord`
      claims where the authored source is `StatBlockRecord`.
- [ ] The report shows profile coverage by QCORE task without duplicating task
      status from `ACTIVE_PLAN.md`.

---

## Phase 5: QMBT Profile Parity

**User stories**:

- As a runtime author, I can see which supported profiles have parity tests.
- As a maintainer, I can avoid running MBT for every individual Unit.
- As a reviewer, I can verify representative profile semantics through focused
  MBT lanes.

### What To Build

Backfill QMBT1-QMBT6 profile parity claims. Add planned parity rows for ready
tasks and completed parity rows for done tasks. Keep MBT scarce: profile MBT is
representative semantics coverage, while catalog tests cover per-Unit
classification.

After QMBT2-QMBT6, use the matrix as the input to a separate Specific Unit
Parity MBT lane only where identity matters. That lane should bind selected
Unit ids into production runtime fixtures, not enumerate all Units in QNT.

### Acceptance Criteria

- [ ] Completed QMBT profile claims require focused MBT or runtime-test owners.
- [ ] Planned QMBT profile claims are reported separately from completed parity.
- [ ] The report lists supported profiles lacking runtime parity.
- [ ] The checker rejects completed runtime parity claims without owner
      artifacts.
- [ ] No broad battle MBT is required for matrix-only profile edits.
- [ ] Specific Unit Parity MBT candidates are chosen from matrix risk/profile
      pressure, not from a goal of one MBT per Unit id.

---

## Phase 6: Classic Non-SRD Authoring Lane

**User stories**:

- As an author, I can add public mechanics-only renamed Classic non-SRD records
  safely.
- As a reviewer, I can inspect synthetic mushroom-themed names and structured
  mechanics without protected expression.
- As a maintainer, I can prevent SRD overlap from being duplicated in the
  Classic non-SRD collection.

### What To Build

Define the authoring workflow for Classic non-SRD mechanics-only records:
synthetic naming, allowed mechanics fields, prohibited expression fields,
source-lane notes, and profile mapping requirements. Add focused fixtures that
exercise obvious copyright-boundary risks.

### Acceptance Criteria

- [ ] Authoring docs explicitly allow recognizable mechanics identity.
- [ ] Authoring docs explicitly forbid protected expression.
- [ ] The checker rejects near-canonical ids or labels using a maintained deny
      list or review-required marker.
- [ ] The checker rejects records that duplicate SRD Unit mechanics under a
      Classic non-SRD id.
- [ ] Every Classic non-SRD record has a supported profile or closure
      disposition before it can be counted as matrix-complete.

---

## Phase 7: Broad Unit Coverage

**User stories**:

- As a project owner, I can see profile coverage over all shipped Units.
- As a planner, I can choose future Surface widenings from unsupported Units.
- As a runtime author, I can focus implementation on profiles with many blocked
  Units.

### What To Build

Expand from the tracer to all installed SRD Units and the first tranche of
Classic non-SRD mechanics-only Units. Keep this matrix as a coverage and
planning tool, not as an execution registry. Runtime behavior continues to flow
from authored Surface records through package-local support gates.

### Acceptance Criteria

- [ ] 100% of installed SRD Units have profile/disposition claims.
- [ ] 100% of installed Classic non-SRD Units have profile/disposition claims.
- [ ] The report ranks unsupported Units by profile pressure, source
      collection, and future owner.
- [ ] The report separates profile coverage from RAW text coverage.
- [ ] The checker fails when a shipped Unit lacks a claim.

---

## Phase 8: Workspace Workflow

**User stories**:

- As a contributor, I get a clear failure when adding a Unit without profile
  coverage.
- As a planner, I can connect QCORE/QMBT work to Unit profile pressure.
- As a maintainer, I can keep provenance and distribution boundaries visible.

### What To Build

Promote the checker into workspace scripts once stable. Update active-plan
rules so new Surface Unit, QCORE, and QMBT tasks cite Unit profile impact.
Document how this matrix interacts with `plans/raw-coverage/`.

### Acceptance Criteria

- [ ] Workspace scripts include the unit-profile checker once it is stable.
- [ ] New Unit authoring tasks must add or update profile claims.
- [ ] New QCORE tasks must cite profile ids when they prove Unit-facing
      mechanics.
- [ ] New QMBT tasks must cite profile ids when they add runtime parity.
- [ ] The docs clearly state that RAW coverage and Unit profile coverage are
      separate but linked layers.

## Verification

Every implementation phase must include:

- [ ] RAW/source check: read relevant local SRD text for SRD Units and the
      approved Classic non-SRD source-lane notes for Classic mechanics-only
      records.
- [ ] Provenance check: prove collection boundaries reject mixed provenance and
      duplicate Unit ids.
- [ ] Expression check: prove Classic non-SRD records contain only mechanics
      facts and synthetic labels.
- [ ] Type/schema check: invalid states described in this plan are rejected by
      types, parser results, or the checker.
- [ ] Matrix check: run the unit-profile checker and `pnpm raw-coverage:check`
      when RAW requirement links change.
- [ ] Runtime parity gate: run promoted or focused MBT only after completed
      behavior changes, not for matrix-only edits.
- [ ] `/simplify` convergence: after implementation, run `/simplify` for at
      least two rounds and continue until no important fixes remain.
