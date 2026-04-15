# Classes And Feature Subunits: Next Extraction Pass

This note is the extraction plan for the next step after [UNITS_classes_and_features.md](./UNITS_classes_and_features.md). Do not duplicate the class/subclass inventory here; keep that file as the canonical home for the Pass 1 class and subclass lists, and use this note only to describe how to extract feature-bearing subunits.

## Scope And Inputs

Local sources used for this pass:

- [book-xphb.json](../5etools-src/data/book/book-xphb.json) for structured PHB book content.
- [04_classes.md](../inspirations/open5e-api/data/raw_sources/srd_5_2/sections/04_classes.md) for prose-first class chapter text.
- [Character-Creation.md](../srd-5.2.1/Character-Creation.md) and class pages under [Classes/](../srd-5.2.1/Classes/) for RAW cross-checks.
- [XPHB_SECTION_INDEX.json](./XPHB_SECTION_INDEX.json) and [CHAPTER_SPINE_PAIRING.md](./CHAPTER_SPINE_PAIRING.md) for local structure and chapter anchoring.
- Local API/data taxonomy cross-checks: [5e-srd-api class routes](../inspirations/5e-srd-api/src/routes/api/2014/classes.ts), [subclass routes](../inspirations/5e-srd-api/src/routes/api/2014/subclasses.ts), and [feature routes](../inspirations/5e-srd-api/src/routes/api/2014/features.ts).

## What The PHB JSON Exposes Cleanly vs Poorly

| Surface | Cleanly exposed | Poorly exposed | Implication |
|---|---|---|---|
| Chapter spine | `Chapter 3: Character Classes` is a clear top-level chapter in `book-xphb.json` and `XPHB_SECTION_INDEX.json`. | Feature subunits are not first-class chapter nodes. | Start from chapter/class anchors, not from feature anchors. |
| Class roots | Each class appears as a class entry under Chapter 3. | The class payload is a long mixed block of prose, tables, and tagged references. | Class traversal must parse internal structure, not just top-level nodes. |
| Subclasses | Subclass prose and feature lists are present as structured entries. | Subclass feature rows are embedded in the subclass content, not normalized into a feature inventory. | Treat subclass features as child subunits to extract, not as separate chapter objects. |
| Feature names | Inline tags and headings give usable anchors. | Search by exact feature table names is unreliable in `book-xphb.json`; e.g. `Barbarian Features` and `Wizard Features` do not appear as clean string anchors. | Prefer heading/titled-entry traversal over plain text grep. |

## Likely Extraction Approaches

- Class entry traversal: walk each class entry from Chapter 3, then harvest nested headings, tables, and `Level X: ...` blocks as feature-bearing units.
- Tagged references: use inline tags (`@class`, `@subclass`, `@feat`, `@spell`, `@variantrule`) as linkage points, not as inventory keys.
- Chapter structure: use `XPHB_SECTION_INDEX.json` to keep the chapter/class boundary stable while feature extraction gets more granular.
- Competitor taxonomy cross-check: mirror the separate resource split already used by [5e-srd-api class / subclass / feature routes](../inspirations/5e-srd-api/src/routes/api/2014/classes.ts), and note that local `5e-database` / Foundry / PF2E source layouts already separate class-family content from feature-family payloads.

## Mechanic Surfaces To Capture

Once feature subunits are extracted, the important surfaces are likely:

- level gate and subclass gate;
- action economy hooks (`Action`, `Bonus Action`, `Reaction`, `Magic action`);
- resource counters and recharge cadence (`Short Rest`, `Long Rest`, per-turn, per-turn-extension);
- choice lists and replacement rules;
- duration, concentration, and cleanup conditions;
- spell references, prepared-spell rules, and spell-slot links;
- condition application, movement rider clauses, and save/attack/DC clauses;
- passive scaling tables such as proficiency bonus, uses, damage dice, or mastery counts.

## Concrete Next-Step Recipe

1. Use [book-xphb.json](../5etools-src/data/book/book-xphb.json) and [XPHB_SECTION_INDEX.json](./XPHB_SECTION_INDEX.json) to enumerate each class root under Chapter 3 once.
2. For each class root, extract feature-bearing subunits from the raw entry tree: level headings, subclass headers, tables, and named rule blocks.
3. Emit feature subunits keyed by `class -> feature` or `subclass -> feature`, with level and provenance attached, but do not re-emit the class/subclass inventory.
4. Cross-check every extracted subunit against [04_classes.md](../inspirations/open5e-api/data/raw_sources/srd_5_2/sections/04_classes.md) and the local SRD class pages to ensure the feature text is actually present in the corpus.
5. Keep `UNITS_classes_and_features.md` as the only inventory file for roots; append feature subunit notes beneath the relevant class/subclass sections only after the extraction pass is concrete enough to promote.

