# Learn: Hard Provenance and Package Boundaries

Pattern:

- code and payloads are separate strata;
- edition/version is encoded structurally;
- content family boundaries are visible in repo layout and manifests;
- provenance is not left to memory or README prose alone.

Main competitors:

- Open5e API
- 5e-database
- 5e-srd-api
- A5E

Our local counterpart:

- `.references/srd-5.2.1`
- future SRD payload packages
- future optional licensed packs
- the repo’s explicit provenance rules in `AGENTS.md`

## Why Read This

Read this if you want to see how content-heavy systems either preserve or blur provenance boundaries at the repository level.

The most useful lesson is that boundary hygiene is mostly a packaging and artifact problem, not a legal-text problem.

## Tracer Bullet

### 1. Read Open5e’s code/data seam

Read:

- [open5e-api `README.md:55`](./inspirations/open5e-api/README.md)
- [open5e-api `README.md:77`](./inspirations/open5e-api/README.md)
- [open5e-api `README.md:129`](./inspirations/open5e-api/README.md)

What to notice:

- the API code uses Django;
- content is pulled from `/data`;
- approval files are treated as reviewed artifacts;
- received outputs are explicitly not for commit.

Short examples:

```md
The API ... pulls the data from the `/data` directory.
```

```md
Approval tests are run against the approved files ...
Recieved files shall not be included in the git repo.
```

Why it matters:

- code and payload are distinct planes even though they live in one repo;
- generated or review-only artifacts are treated differently from source artifacts.

### 2. Read 5e-database’s edition partitioning

Read:

- [5e-database `README.md:6`](./inspirations/5e-database/README.md)
- [5e-database `README.md:31`](./inspirations/5e-database/README.md)
- the directory layout under [5e-database `src`](./inspirations/5e-database/src)

What to notice:

- the repo is clearly the data plane for another API;
- data refresh is its own workflow;
- edition folders are structurally separated.

Directory stops:

- [5e-database `src/2014`](./inspirations/5e-database/src/2014)
- [5e-database `src/2024`](./inspirations/5e-database/src/2024)
- [5e-database `src/2014/schemas`](./inspirations/5e-database/src/2014/schemas)
- [5e-database `src/2024/schemas`](./inspirations/5e-database/src/2024/schemas)

Why it matters:

- edition is a path-level boundary, not just a metadata field;
- that is exactly the right pattern for 5.1 vs 5.2.1 style separation.

### 3. Read 5e-srd-api’s versioned endpoint boundary

Read:

- [5e-srd-api `README.md:39`](./inspirations/5e-srd-api/README.md)
- [5e-srd-api `README.md:67`](./inspirations/5e-srd-api/README.md)
- [5e-srd-api `README.md:73`](./inspirations/5e-srd-api/README.md)

What to notice:

- route roots encode edition, such as `/api/2014`;
- the API is explicitly downstream of the database repo;
- local cross-repo wiring is described as a temporary local-only change.

Short example:

```md
The API is versioned by release years of the SRD.
Currently only `/api/2014` is available. The next version will be `/api/2024`.
```

Why it matters:

- versioning is structural and visible;
- temporary local coupling is intentionally not committed.

### 4. Read A5E’s multi-license pack boundary

Read:

- [A5E `README.md:42`](./inspirations/foundry-level-up-a5e/README.md)
- [A5E `README.md:93`](./inspirations/foundry-level-up-a5e/README.md)
- [A5E `public/system.json`](./inspirations/foundry-level-up-a5e/public/system.json)

What to notice:

- pack families are treated as content artifacts;
- the README names which directories correspond to which license/provenance class;
- the system software license is separated from pack content licenses.

Short example:

```md
The content of the `public/packs/dnd5e-*` directories is sourced from ... SRD 5.1 ...
The remaining content contained in the `public/packs/` directories is used under the terms of the OGL ...
The system software is distributed under the MIT License.
```

Why it matters:

- if one repo holds multiple content families, the boundary must be visible in directory structure and pack naming.

## What To Carry Back Into This Repo

Take:

- SRD-only content boundaries should be separate directories or packages;
- edition/version should be encoded structurally;
- optional future licensed packs should be separate artifacts;
- generated fixtures and approval artifacts should be treated differently from source payloads.

Do not take:

- mixed-provenance loaders that merge content classes before the boundary is explicit;
- a single undifferentiated content tree that relies on memory or convention.

Practical mapping for us:

- `.references/srd-5.2.1` is provenance;
- any future machine-readable import corpus should live in a separate structured-input boundary;
- runtime projection types in `packages/core/src` must remain separate from both.

## End Of Sequence

If you read the `LEARN_*.md` files in order, the intended progression is:

1. closed mechanic vocabulary
2. projection-time synthesis
3. explicit effect phases
4. item/feature payloads
5. deterministic replay and scenarios
6. provenance and package boundaries

