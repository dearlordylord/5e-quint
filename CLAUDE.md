# D&D 5e PHB — project notes

## Package manager

This is a pnpm workspace. Never use npm.

## System-wide design

This is a greenfield project with no external consumers. We own the Quint spec,
runtime core, TypeScript features, MBT bridge, and React UI. Change any layer
needed for the best system design; do not preserve an internal boundary by
adding adapters, registries, or parallel structures.

Never duplicate state that already exists elsewhere in the stack. Search the
whole codebase before adding a field, then reference, project, re-export, or
thread the existing fact through. Derive labels and execution projections from
one canonical source rather than storing them beside it.

Make invalid states unrepresentable. Redesign shapes that permit contradictory
provenance, ownership, derived facts, or unsupported status combinations.
Optional fields and empty collections must name distinct domain states; do not
use `undefined` as a second spelling for an empty collection. Avoid migration
contrast names such as `normalized`, `legacy`, `current`, or `new` unless both
concepts genuinely exist at that domain boundary.

## Authored identity and PHB+ content

Keep these concepts distinct:

- **provenance** — canonical rules source claimed by shipped data;
- **structured input** — machine-readable import or cross-check material;
- **runtime projection** — derived execution facts consumed by the engine.

SRD is provenance for shipped SRD monsters. 5e-tools may be structured input or
normalization inspiration, but is never provenance. A collection presented as
the SRD catalog must make mixed provenance or licensing unrepresentable.

**PHB+** is official D&D content outside this repository's redistributable SRD
corpus. Public source, tests, fixtures, docs, and generated artifacts must not
copy real PHB+ ids, names, slugs, prose, headings, page references, examples, or
public source-to-Mushroom crosswalks. Use visibly synthetic renamed records for
non-SRD mechanics examples. The standing policy lives in
[`docs/mushroom-playbook/AUTHORING.md`](docs/mushroom-playbook/AUTHORING.md).

**Authored identity** includes record identity and protected expression. It may
appear only at authored catalog/schema/content boundaries, SRD or synthetic
tests, selection/composition boundaries that retain identity chosen elsewhere,
source-authored cross-record references, and explicitly documented
support-profile admission boundaries. Production execution must dispatch on
parsed Surface shape, typed procedure facts, and runtime state—not names, ids,
slugs, or provenance sections. This applies to SRD records too.

## Domain and documentation ownership

When a union name fits only some members, treat that as domain conflation even
if the type is safe. Split or rename it in domain terms first.

Consult [`CONTEXT-MAP.md`](CONTEXT-MAP.md) before adding or moving domain,
architecture, assumption, Cleanroom, or acceptance documentation. Keep each
fact in one owning document and link to it elsewhere. Package-local boundaries
belong in the owning package README or architecture document.

## TypeScript conventions

- Parse once at a boundary and pass the narrowed type forward. Boundary adapters
  may accept `unknown`; typed internals must not.
- Return the narrowest available type. If only one discriminated branch can be
  returned, do not widen it to the whole union.
- Brand primitives when they acquire protocol or domain meaning.
- Define fixed domain values as a typed `as const` array and derive the union
  from `typeof VALUES[number]`; never maintain both separately.
- Match literal and discriminated unions with `effect/Match` and
  `Match.exhaustive`. Do not use a `default` branch.

Example: a function that only accepts damage effects should take
`DamageEffect`, not `Effect` and another `kind === "damage"` check.

Runtime/domain failures such as absent lookups, unsupported authored data,
invalid tool input, unreadable content, or session conflicts must use `Either`,
`Option`, parser results, or precise discriminated unions rather than
exceptions. Assertions and `require*` helpers are only for facts already proved
by the compiler or an immediately preceding parser, guard, or exhaustive match.

## Connascence

Before finalizing code, ask what else must change if a literal, type, position,
order, phase, support gate, or caller protocol changes. Name/type coupling is
usually acceptable; distant coupling by value, position, algorithm, timing, or
identity is risky.

Prefer named domain constants, fields over tuple positions, shared algorithms,
single operations over caller sequencing, and narrowed types that carry support
facts forward. Strong connascence must be local and named after the invariant;
comments alone are not enforcement. Pay particular attention to `current`,
`supported`, `slice`, `phase`, `first`, `only`, `activation`, `hole`, `unit`,
`index`, `order`, `TODO`, `temporary`, and `for now`.

## Rules and formal models

The working RAW authority is SRD 5.2.1 in `.references/srd-5.2.1/`; the official
5.1→5.2.1 delta is in `.references/srd-5.2.1-conversion/`. Before implementing a
rule, read the relevant local passage and [`UBIQUITOUS_LANGUAGE.md`](UBIQUITOUS_LANGUAGE.md).
Search `.references/srd-5.2.1/` for the expected passage in a separate bounded
command that includes hidden and ignored paths (for example, `rg -uu`), then
inspect the likely corpus file directly. Treat truncated output, a nonzero
status, unreadable content, or tool failure as unresolved evidence, not proof
that the passage is absent. Claim that the corpus is insufficient only after
both checks, and verify this discovery workflow in the checkout and a linked
worktree. If the corpus is then insufficient, stop and ask rather than browsing
another rules source.

Quint is a direct formalization of the SRD: no homebrew or reasonable
extensions. Every modeled rule must trace to local RAW. Record only choices the
SRD leaves ambiguous in [`ASSUMPTIONS.md`](ASSUMPTIONS.md). The QNT corpus is a
forest of reusable rule-core slices and focused runtime/MBT owners; see
[`docs/adr/0001-forest-of-qnt-slices.md`](docs/adr/0001-forest-of-qnt-slices.md).

## Verification and review

Run public scripts directly. `pnpm typecheck`, `pnpm test`, and `pnpm quality`
acquire the shared heavy-verification lock and cap workspace concurrency; do not
wrap them in another lock, run raw Turbo, or call their internal `:body`/`:turbo`
scripts. For another broad command use:

```sh
. scripts/resource-lock-owner.sh && \
  with_resource_lock_owner scripts/with-broad-workspace-lock.sh <command>
```

Proof and battle-MBT public scripts acquire the same lock. Direct Quint or
filtered MBT commands must use `scripts/with-mbt-lock.sh`; never nest the broad
and MBT wrappers. Detailed QNT/MBT limits live in
[`docs/agents/QNT-MBT.md`](docs/agents/QNT-MBT.md).

Exit 137 or SIGKILL is an emergency: stop verification, record the command and
child PIDs, inspect verification processes, memory/load, and readable cgroup
memory events, then kill only confirmed orphan verification children. Do not
retry unchanged; first remove the demonstrated resource cause. Report the
evidence, and never describe a partial run as verification.

Every implementation plan must include reviewer-loop convergence. After
significant changes, repeat RAW traceability, ubiquitous-language/domain,
architecture/connascence, and code-review passes until no reasonable findings
remain. Fix reasonable findings; reject one only with a concrete reason. A
single pass is sufficient only for a trivial change under roughly 20 lines.

Review agents must read [`.claude/review-rules.md`](.claude/review-rules.md).
When the user asks for review, findings with file/line evidence are the primary
output.

## Agent behavior and scoped instructions

If asked only “is it implemented?”, first ask “Implemented what?” Distinguish a
Rule Capability Increment, Authored Record, and whole Target SDK. Once clear,
lead with `yes`, `no`, or `partially`, name the subject, and give the decisive
evidence or missing fact without reciting acceptance jargon.

Do not write to the memory system unless explicitly asked.

- Quint proofs, focused QNT, or battle MBT:
  [`docs/agents/QNT-MBT.md`](docs/agents/QNT-MBT.md)
- Ralph harness work: [`docs/tooling/ralph/README.md`](docs/tooling/ralph/README.md)
- GitHub Issues and Wayfinder maps:
  [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md)
- Domain-doc consumption: [`docs/agents/domain.md`](docs/agents/domain.md)
