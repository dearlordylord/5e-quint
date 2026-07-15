# Mushroom Playbook Authoring Policy

This document owns the standing public/private authoring boundary for the
Mushroom Playbook. Accepted specifications own product scope and acceptance and
should link here rather than restating these rules.

This policy is a repository publication gate, not legal advice or a claim that
renaming alone authorizes use of PHB+ material.

## Record and provenance boundary

- A Mushroom-authored record remains an ordinary Unit Record or Stat Block
  Record. Runtime behavior must not branch on Mushroom identity.
- Its public provenance is the canonical Mushroom Playbook, expressed through a
  separately owned, provenance-homogeneous Mushroom collection.
- Its PHB+ relationship is private **Mechanical Correspondence** authoring
  evidence. Do not encode that relationship as public provenance, a euphemistic
  source value, runtime state, or a hidden public mapping.
- Real PHB+ source ids, names, slugs, prose, examples, headings, page references,
  and source-to-Mushroom crosswalks stay outside the public repository and its
  GitHub issues, comments, commits, logs, fixtures, generated artifacts, and
  releases.
- PHB+ structured input, Mechanical Correspondence, and non-public review
  evidence may live only in the access-controlled Private Authoring Repository
  outside the public worktree. The public repository must not depend on that
  repository's checkout or revision.

## Private-to-public boundary

- Construct each candidate as a new typed public record from permitted public
  fields. Never copy a private record and attempt to redact or filter it into a
  publishable shape.
- Before a candidate enters the public worktree, strictly decode it with excess
  fields rejected, scan it against the private source material, and resolve all
  mechanics and creative-review findings. Errors and uncertainty block the
  candidate.
- Only approved public source records cross the repository boundary. Public
  JSON, manifests, catalogs, traces, and aggregate evidence are derived from
  those sources rather than copied from private authoring artifacts.
- Promotion targets a clean public worktree at the public revision used to
  review the candidate, changes only the expected Mushroom source and derived
  paths, reruns public checks, and stops before pushing to GitHub. A changed
  source or public base invalidates the reviewed candidate.

## Mechanical fidelity

A Mushroom-authored record preserves every rules-relevant fact of its private
counterpart exactly, including numbers, dice, timing, action costs, targeting,
durations, scaling, prerequisites, dependencies, and outcomes.

If an exact mechanic cannot yet be represented or executed, widen the owning
typed capability boundary or leave the record unsupported. Do not simplify,
rebalance, or silently substitute homebrew behavior.

## Names and Rename Distance

- A close Mushroom-authored name replaces at least one distinctive lexical
  element with Mushroom-owned identity. Spelling, inflection, or punctuation
  changes alone do not count.
- Recognizable close transformations are permitted after Mushroom Publication
  Owner clearance for the applicable authorization, trademark, and
  source-confusion context.
- Rename Distance is editorial language, not a legal threshold or safe harbor.
- The private source name and mapping are never published alongside the
  Mushroom-authored name.

## Independent expression

The close-transformation allowance applies to names only. Public prose, flavor,
examples, artwork, ordering, and presentation must be independently
Mushroom-authored from typed mechanics facts.

Standard rules terminology and concise wording forced by a mechanic may
coincide. Line-by-line synonym replacement, recognizable PHB+ phrasing, borrowed
examples, and copied expressive sequencing are not allowed.

## Authored dependencies

- A dependency on an SRD record retains the canonical SRD identity.
- A dependency on a non-SRD PHB+ record uses the corresponding public Mushroom
  identity.
- Public dependency data never retains a private PHB+ source name or exposes the
  Mechanical Correspondence mapping.

## Review boundary

Mechanics review, creative review, and publication approval are distinct
pre-publication decisions, not application subsystems, persistent workflow
states, record metadata, or runtime concepts. Agents and offline checks may
produce exception-oriented review evidence; unresolved findings block the
candidate, and the Mushroom Publication Owner decides whether the evidence is
sufficient. The application consumes only approved records and catalogs.

- **Mechanics review** confirms exact rules-relevant correspondence and rejects
  accidental homebrew.
- **Creative review** confirms Mushroom-owned identity and expression and
  private-source hygiene.
- **Publication approval** is the Mushroom Publication Owner's decision that
  the complete immutable Mushroom Publication Candidate may enter the public
  GitHub repository.

A record is eligible for a Mushroom Publication Candidate only after mechanics
and creative review. Publication approval applies to the complete candidate,
not to records one at a time; changing any included source creates a new
candidate that requires approval.

## Scope horizon and future corpus intersection

The current horizon is one Mushroom foundation release: compose the unchanged
SRD corpus with one separately owned Mushroom Corpus. General multi-theme
ownership, intersection discovery, and cross-corpus reference machinery are not
current implementation or acceptance requirements.

Future Themed Corpora may include the same public authored record. Such a record
is authored once, has one owning Themed Corpus, and is included elsewhere by
membership or reference rather than by a duplicate record. A later occurrence
with different rules-relevant facts is a distinct record with its own Mechanical
Correspondence. Publication review, not name equality or import metadata,
determines whether two occurrences are the same authored record.

This future constraint records that corpora cannot be assumed disjoint; it does
not require the current release to implement intersections.
