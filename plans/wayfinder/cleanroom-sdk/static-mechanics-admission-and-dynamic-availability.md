# Static Mechanics Admission and Dynamic Availability

Wayfinder decision for [Define Static Mechanics Admission and dynamic
availability](https://github.com/dearlordylord/5e-quint/issues/17), resolved
against source commit `12dbf5dab2cb6b4012a08919a6f4e53e4d9fc133`.

## Decision

The Target-facing Surface aggregate contains complete authored-record mechanics
graphs that the production TypeScript source can execute. It is a generated
projection of the complete canonical SRD catalog, not that complete catalog
itself. A record is never published with only the parts its reducer happens to
support: every represented mechanic in an included record and its execution
dependencies must be executable, or the complete record graph is excluded from
the Cleanroom package until the source is repaired.

A Target SDK then performs one atomic catalog installation with two observably
distinct checks:

1. the Portable Surface Contract decodes the supplied aggregate and establishes
   structural, provenance, identity, and reference integrity; and
2. Static Mechanics Admission establishes that every represented mechanic can
   reach the Target's production Functional Reducer without dispatching on
   authored identity.

Admission succeeds for the complete supplied aggregate or installation fails
with a non-empty, unordered collection of typed mechanics issues. Per-record,
per-dependency, or per-mechanics-path observations are diagnostic and
conformance evidence; they are not partial installation transactions, stored
support receipts, or permission to admit half a rule.

After installation, authored selection and build binding compose admitted
records for a character or creature. Dynamic availability is later still: it
uses that actor's current resources, conditions, action economy, targets,
session, and battle state to discover what can happen now. An empty discovery
result may mean that no admitted option is currently available; it can no
longer mean that the supplied content was unsupported, because unsupported
content could not survive installation.

This is an observable source and Target SDK contract. It does not require a
Target to reproduce TypeScript modules, support-profile names, intermediate
types, caches, or parser organization.

## The four boundaries

| Boundary                   | Input                                                                                            | Successful observable fact                                                                                                                | Failure or absence meaning                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source package projection  | Complete canonical authored catalog plus production TypeScript execution                         | The generated Cleanroom aggregate contains only complete record-rooted mechanics graphs whose represented mechanics are source-executable | A root with any non-executable represented mechanic is absent from the package or the source is repaired; nested mechanics are not silently deleted |
| Portable Surface load      | Supplied generated Cleanroom aggregate JSON                                                      | One decoded, provenance-correct catalog preserving authored identity and references                                                       | Typed structural/catalog issues; no decoded catalog is installed                                                                                    |
| Static Mechanics Admission | The decoded Cleanroom catalog, without an actor or live state                                    | Every represented mechanic has a production-reducer interpretation and the whole executable catalog is installed atomically               | Typed mechanics issues attributed to record-rooted mechanics paths; no executable catalog is installed                                              |
| Dynamic availability       | Installed mechanics plus authored selection/build binding and current actor/session/battle state | The public SDK exposes the actions, choices, invocations, or holes available now                                                          | Empty means no currently available option; it is not mechanics-support evidence                                                                     |

Decoded content is therefore not admitted content, and admitted content is not
an available action. The source audit found all three states conflated today:
catalog builders stop at collection integrity, Unit support is projected during
character-to-battle composition, and spell and Stat Block readers mix shape
recognition with current-state discovery
([Surface Decoding and Admission Boundary Audit](./surface-decoding-admission-audit.md),
findings 3 through 7).

## Source-derived Cleanroom package

The full canonical SRD catalog remains the source authority and publication
input. Source publication strictly regenerates and decodes that corpus before
deriving the Target-facing aggregate. Package membership then follows this
domain filter:

```text
complete canonical authored-record mechanics graphs
  -> mechanics whose consequences are reducer-owned rather than table-decided
  -> graphs whose every represented mechanic executes through production TypeScript
  -> progression-governed roots acquired or composed within the Source Execution Horizon
  -> generated Cleanroom Mechanics Slice
```

A rule may require an explicit table-supplied witness, such as a target, roll,
or spatial fact, and still be reducer-eligible when the reducer owns the
mechanical consequence after receiving that witness. A genuinely open table
decision is not converted into a new mechanic merely to make it executable.

The filter operates over complete Authored Mechanics Graphs. It does not cut a
record down to individually recognized leaves. Ranger Roving is the concrete
counterexample: its Surface record contains the Heavy-armor-conditional Speed
increase and the linked Climb and Swim Speeds as one composite mechanic
(`packages/surface/content/ranger_roving.dhall:26-63`). Production TypeScript
recognizes the two parts together and returns no profile if either part fails
(`packages/battle-runtime/src/unit-feature-support.ts:5400-5423`). A source
that implemented only the Speed increase would have a broken Roving Unit, not
a partially admissible Roving Unit.

An Authored Mechanics Graph follows only domain-typed Authored Dependencies
whose mechanics must be consulted to interpret or execute the root. A field
containing another record's identity does not automatically join the graph:
selection identity, presentation references, and rules-defined identity
predicates remain references unless the referenced record's mechanics are
required. If a true execution dependency is absent from the generated slice,
the root graph is incomplete and cannot be published or admitted.

The generated aggregate must separately remain closed under every Authored
Reference required by the Portable Surface Contract. Reference closure does not
turn those edges into mechanics dependencies. If retaining a complete referring
record requires another record whose complete mechanics graph cannot enter the
package, the referring record also cannot enter; publication must not leave a
dangling reference, erase the reference, or include the referenced record with
partial mechanics.

Package membership is derived from the same source-owned mechanics recognition
and production execution evidence used by the runtime. It is not a handwritten
record allowlist, authored-id support manifest, or `supported` flag stored in
Surface content. Execution receipts may prove the derivation in conformance;
they do not become a second durable support ledger.

## The two horizons

The horizons are character-progression horizons. They are not Spell Level or
Cast Level boundaries.

- **Source Execution Horizon: character progression levels 1 through 10.** It
  constrains package eligibility when a root is acquired or composed through
  character advancement. This includes mechanics acquired after character
  level 2, including applicable 2nd- and 3rd-level Spell Definitions. It does
  not assign a fictitious character level to Stat Blocks or other
  non-progression roots.
- **Cleanroom Workflow Horizon: character progression levels 1 and 2.** It
  selects the initially required composed public Character Creation-to-Battle
  SDK Scenarios. It does not narrow package membership or reducer semantics.

An included mechanic retains every extension fact that production TypeScript
already executes, even when the extension is outside either horizon. For
example, a Spell Definition available in a level-1 or level-2 workflow retains
its production-supported Cast Level scaling; a cantrip or class feature retains
its production-supported character- or class-level scaling. The contract does
not invent one universal maximum such as level 20. It follows the typed domain
and reducer behavior the source actually owns for each included mechanic.

Consequently, widening the Cleanroom Workflow Horizon should add composition
and public scenarios over already executable mechanics. It must not require
redesigning the Target mechanics model or filling in rule logic that package
admission had silently ignored.

## Static Mechanics Admission

Static Mechanics Admission is evaluated without character, actor, session,
resource, target, turn, or battle facts. Authored Input Specifications remain
parametric at this boundary; no live Runtime Hole is opened and no concrete
invocation is attempted during installation.

Successful admission means all of the following are true:

- every included Authored Record is structurally decoded and retains its
  authored identity, provenance, selection facts, and complete mechanics;
- every nested mechanic and Authored Dependency required by that record has an
  unambiguous typed interpretation owned by a production Functional Reducer;
- every represented extension branch is within that reducer's executable
  domain, including retained out-of-horizon scaling facts;
- the same mechanics shape under visibly synthetic renamed identity produces
  the same reducer behavior apart from legitimate identity/provenance output;
  and
- the aggregate is installed only after every independent admission issue has
  been collected.

“Backed by production execution” does not mean installation simulates a battle.
It means source publication and Target conformance must drive each admitted
mechanics graph through the real reducer workflows that claim to execute it.
Recognizing a JSON shape, constructing a helper value, importing a module, or
calling a detached validator does not prove admission.

The contract mandates no uniform reducer-consumable intermediate entity. The
current TypeScript source has several unrelated projections—including
`BattleUnitRef`, Unit support profiles, spell invocations, Stat Block action
options, and `AvailableBattleAct`—and no common value that all mechanics become.
A Target may use different native types or no stored projection at all. The
observable invariant is that the decoded mechanics, rather than authored
identity or duplicated constants, determine production reducer behavior.

### Mechanics issues

Admission rejection returns a typed non-empty collection. The portable issue
algebra fixes recovery facts rather than target-language class names or prose.
Every issue identifies:

- the Unit or Stat Block root;
- the record-rooted mechanics path that could not be admitted; and
- one semantic reason: unsupported represented mechanics, a missing required
  Authored Dependency, or multiple incompatible execution interpretations.

Independent roots and paths are accumulated. A dependent check may stop when
its prerequisite did not admit. Issue ordering and rendered messages are not
normative.

An issue path is diagnostic only. It must not allow a caller to install the
remaining paths of a broken record, keep a partially admitted catalog, or
persist a status object that can drift from authored content and reducer code.

## Dynamic availability

Dynamic availability starts only after successful installation and the later
selection/build-binding step. It may depend on actor ownership, prepared or
granted access, filled durable choices, resources, action economy, conditions,
equipment, targets, geometry witnesses, session state, and battle state.

The contract preserves existing domain-specific public discovery results. It
does not invent one global mechanics-discovery registry, require every
unavailable mechanic to produce a reason, or require Units, Spell Definitions,
and Stat Blocks to share an action type. Existing discovery operations may
legitimately return no actions or no holes for the current state. Their inputs
and outputs are availability facts because installation has already rejected
unsupported mechanics.

Discovery consumes admitted mechanics; it does not reparse decoded records to
decide support again. A shape mismatch discovered during dynamic discovery is
a broken admission invariant, not “currently unavailable.”

## Authored identity

Authored identity remains valid at Surface, provenance, catalog lookup,
selection, presentation, replay, and true authored-reference boundaries. It is
not a runtime rules model.

Production mechanics recognition and reducer behavior must use Surface shape,
typed procedure facts, Authored Dependencies, explicit selected facts, and
runtime state. They must not branch on Unit or spell id, name, slug,
provenance section, description, or other authored identity. A rule that truly
names another authored record may carry that reference; such a reference does
not permit unrelated identity dispatch.

Conformance proves the boundary in both directions:

- rename an SRD mechanics fixture to visibly synthetic identity while retaining
  its parsed mechanics, and reducer behavior remains the same apart from
  legitimate identity/provenance projection; and
- change one mechanics fact under the same synthetic identity, and reducer
  behavior changes according to the relevant QNT/RAW semantics.

Real SRD selection scenarios separately prove that catalog identity flows
through public SDK workflows. No real PHB+ identity or recognizable
closed-licensed example enters the package or fixtures.

## Portable conformance behavior

Source-owned conformance cases establish at least:

1. the exact generated Cleanroom aggregate passes strict Portable Surface load,
   Static Mechanics Admission, and atomic installation;
2. every supplied record-rooted mechanics graph reaches its production
   Functional Reducer through executable evidence;
3. independent unsupported mechanics, missing dependencies, and ambiguous
   interpretations produce the required unordered typed issue facts and leave
   no installed executable catalog;
4. a multi-part authored mechanic such as synthetic Roving cannot be admitted
   with only one represented part executable;
5. an admitted mechanic can have an empty dynamic discovery result in a state
   where its ownership, resources, or other availability facts do not permit an
   action;
6. Source Execution Horizon records beyond character level 2 remain in the
   package, while only level-1 and level-2 composed public workflows are
   initially mandatory;
7. included lower-level mechanics retain their full production-executable
   scaling domains beyond the public workflow horizon; and
8. synthetic-identity metamorphic cases prove that mechanics shape, not
   authored identity, selects behavior.

Expected record sets are derived from the generated catalog. Expected mechanics
sets are derived from Static Mechanics Admission and reducer execution
evidence. Neither a Target adapter nor a manually maintained support inventory
declares what must pass.

## Source repair consequences

The source implementation must make these existing conflations explicit before
publishing the Cleanroom Core:

- derive the Cleanroom aggregate from the complete, strictly decoded canonical
  catalog and production TypeScript execution, excluding incomplete record
  graphs without editing their nested mechanics;
- establish a context-independent admission pass before character and battle
  discovery while preserving the current production reducers as the execution
  denominator;
- separate spell shape/procedure recognition from the actor, turn, resource,
  and antimagic checks currently mixed into spell profile `admit` operations;
- make Stat Block admission consistent across every consumer path instead of
  treating a particular consumer such as Wild Shape as a domain exception;
- make Unit support recognition fail with typed mechanics issues rather than
  `null`, `false`, or `[]` when represented mechanics are unsupported or
  ambiguously recognized;
- make later discovery consume the established admitted facts instead of
  reparsing the weaker decoded record; and
- remove authored-id support gates and runtime dispatch, retaining identity
  only at the allowed catalog, selection, reference, provenance, presentation,
  and replay boundaries.

Spell profile admission, Stat Block consumers, and Unit support recognition are
named here because they are the current TypeScript locations of the conflation,
not because spells, Stat Blocks, or any consumer such as Wild Shape are special
mechanics families in this contract.

These are source architecture repairs, not requirements to preserve today's
TypeScript module split. The later implementation plan may refactor any layer
needed to encode the boundary without adapters, parallel registries, or
redundant state.

## Revision to the Portable Surface decision

[Portable Surface Content Contract](./portable-surface-content-contract.md)
previously said that the Target receives the complete canonical SRD catalog.
This decision supersedes that membership statement:

- the complete canonical SRD catalog remains the strictly regenerated, decoded,
  and integrity-checked source publication input;
- source publication derives the complete Cleanroom Mechanics Slice from it;
- the generated aggregate supplied to Targets contains only complete
  source-executable record-rooted mechanics graphs; and
- the aggregate remains one atomic, SRD-provenance Surface document with
  distinct Unit and Stat Block collections.

The Portable Surface schema, strict decoding, typed content issues, provenance,
identity, reference integrity, and atomic load decisions remain unchanged. The
Surface document still carries no `supported` field or mechanics status ledger;
its membership is generated from source executable behavior.

## Rejected alternatives

- **Complete canonical catalog in every Target package:** would ask Targets to
  decode mechanics the source does not execute and reintroduce an undefined
  unsupported-content state.
- **Partial records:** would publish rules such as Roving with only some
  consequences and make a broken Unit look admitted.
- **Per-record or per-path installation:** would allow a rejected package to
  survive as a partial executable catalog and turn diagnostics into state.
- **Uniform admission projection type:** does not exist in production
  TypeScript and would prescribe Target internals without observable value.
- **Discovery-time support recognition:** continues conflating unsupported
  content with an admitted mechanic that is unavailable in the current state.
- **Authored-id support manifest:** duplicates executable support, drifts from
  reducer code, and teaches identity dispatch.
- **Universal action browser or mandatory unavailability reasons:** invents a
  cross-family API and behavior that production TypeScript does not currently
  provide.

## Map impact

This resolves the Static Mechanics Admission and dynamic availability boundary
for the Cleanroom SDK map and revises the supplied-catalog membership decided by
Portable Surface Content Contract. Cleanroom Core composition may now treat the
generated Cleanroom Mechanics Slice as its sole Surface input. Target build
ordering may require complete mechanics admission before public level-1 and
level-2 SDK Scenarios, without treating later source-horizon records as initial
workflow requirements.
