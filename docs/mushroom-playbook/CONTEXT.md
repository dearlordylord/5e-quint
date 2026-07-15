# Mushroom Playbook

Language for the public Mushroom rules corpus and its private authoring
relationship to PHB+ structured input.

## Language

**Themed Corpus**:
A provenance-homogeneous public collection of independently authored records
that share one publication theme while preserving mechanics from private
structured input.
_Avoid_: disguised source corpus, mixed-provenance catalog

**Mushroom Corpus**:
The Themed Corpus whose records use Mushroom-authored identity and the Mushroom
Playbook as their canonical public rules source.
_Avoid_: mushroomized SRD, altered-record subtype

**Mushroom Playbook**:
The canonical public rules source for Mushroom-authored records.
_Avoid_: PHB provenance, disguised PHB source

**Mushroom-authored record**:
An ordinary Unit Record or Stat Block Record whose canonical public rules source
is the Mushroom Playbook; this is an authorship/provenance description, not a new
record family.
_Avoid_: Mushroom Record type, altered record subtype

**Mechanical Correspondence**:
The private authoring relationship stating that a Mushroom-authored record
preserves the rules-relevant facts of one PHB+ structured input record. It is not
public provenance, authorship, runtime state, or a public crosswalk.
_Avoid_: PHB provenance, source alias, hidden provenance

**Private Authoring Repository**:
The independent private repository that owns PHB+ structured input, Mechanical
Correspondence, and non-public review evidence. It is not a dependency,
submodule, provenance source, or runtime input of the public repository.
_Avoid_: public reference directory, hidden runtime dependency

**Corpus Intersection**:
The inclusion of the same public authored record in more than one Themed Corpus.
Shared mechanics alone do not establish an intersection.
_Avoid_: mechanics overlap, duplicate themed copy

**Rename Distance**:
An editorial description of how closely a Mushroom-authored name resembles its
private counterpart. It is not a numeric measure or legal safe harbor.
_Avoid_: safe edit distance, infringement threshold

**Mushroom Publication Owner**:
The project owner acting as the sole authority that clears Mushroom-authored
material for a specific publication and distribution context. Agents and
scripts may supply review evidence without becoming approval authorities.
_Avoid_: review agent as approver, runtime owner

**Repository Publication**:
Admission of approved Mushroom source files and their deterministic derived
artifacts into the public GitHub repository. It does not imply a separate
package release, deployment, or product launch.
_Avoid_: release deployment, marketing launch

**Mushroom Publication Candidate**:
An immutable bundle containing the exact public Mushroom collection source,
record revisions, and derived manifest submitted together for Repository
Publication approval. Each included record has already passed mechanics and
creative review; changing any included source creates a different candidate.
_Avoid_: rolling approval, partially approved bundle
