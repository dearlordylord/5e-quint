# Mushroom Playbook Architecture

This document owns the Mushroom-specific composition of the repository's rules
foundation, authored corpora, catalogs, and client-facing projections. Root
package ownership and runtime structure remain in
[`ARCHITECTURE.md`](../../ARCHITECTURE.md); Mushroom language and authoring
policy remain in [`CONTEXT.md`](CONTEXT.md) and [`AUTHORING.md`](AUTHORING.md).

## Foundation and authored corpora

The Mushroom-enabled product keeps three roles distinct:

| Role | Supplies | Relationship |
| --- | --- | --- |
| SRD rules foundation | Reusable rules semantics, typed capabilities, runtime procedures, and formal owners | Required by both SRD and Mushroom-authored records |
| SRD authored corpus | Provenance-homogeneous SRD Unit and Stat Block collections | Composed unchanged into the product |
| Mushroom Corpus | Separately owned, provenance-homogeneous Mushroom Unit and Stat Block collections | Composed alongside the SRD authored corpus |

Product composition assumes the SRD rules foundation and the unchanged SRD
authored corpus. This co-installation does not make every Mushroom record depend
on an SRD authored record. Mushroom records are independent of SRD records
unless their authored mechanics contain an explicit Authored Reference or
Authored Dependency to one. Those sparse edges resolve through the composed
family catalog without merging collection ownership or provenance.

Unit and Stat Block remain separate authored-record families. Each family has
one composed catalog used directly by clients and runtimes; SRD and Mushroom do
not acquire parallel runtime registries.

Every authored record id is globally unique across the complete installation,
including across Unit and Stat Block families and across SRD and Mushroom
collections. Family-specific id types constrain valid operations; they do not
create independent identity namespaces. Any duplicate id rejects installation
with all owning collections identified. Catalog order, provenance, and record
family never grant shadowing, replacement, or lookup precedence.

Canonical authored names may repeat across records. The installation boundary
derives one globally unique client-facing label for every installed Unit and
Stat Block from its canonical name plus existing domain facts such as record
kind, owning class or species, and acquisition level. A unique authored name is
its own label; qualification is added only to a colliding name and uses the
minimum domain context needed to distinguish every occurrence. The label is a
projection: it is not stored on the record, does not become authored identity,
and does not use provenance to select runtime behavior. If the available domain
facts cannot produce unique labels across the complete installation,
installation fails so the authored model or label derivation can be corrected
explicitly.

## Client-facing projections

Three client operations must remain distinct:

- **Installed Catalog Listing** lists installed authored records without a
  character, session, or battle context. It supports browsing, inspection,
  attribution, and diagnostics; it does not determine what a reducer currently
  permits. It presents the derived globally unique client-facing label rather
  than requiring callers to disambiguate repeated authored names.
- **Option discovery** returns choices, acts, or holes that are legal in the
  current character, session, or battle state. This is the authoritative input
  to reducer interaction.
- **Record inspection** presents authored facts for a selected record without
  asserting that the record is currently selectable or executable.

Option discovery is provenance-neutral: clients receive the authored identity,
display facts, and reducer-owned choice facts needed to play, regardless of the
owning corpus. Provenance and collection ownership may remain available in
the Installed Catalog Listing or record inspection for attribution and
debugging, but they must not filter legal options, select runtime semantics, or
be copied into reducer state.
