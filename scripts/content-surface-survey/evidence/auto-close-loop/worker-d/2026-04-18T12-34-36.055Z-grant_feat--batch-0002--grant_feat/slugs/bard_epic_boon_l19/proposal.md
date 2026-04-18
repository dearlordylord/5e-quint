`Epic Boon (bard L19)` fits the existing `class_feature` + `PassiveMechanics` family, but it does not fit the current `grant_feat` atom payload honestly.

Problem:

- The current surface only allows `grant_feat.category` to be one of `general | fighting_style | epic_boon | origin`.
- The SRD text grants **either**:
  - an `epic_boon` feat, or
  - another feat of the player's choice for which they qualify.

Why this is a surface widening, not a structural widening:

- The top-level shape is still a passive class feature that grants feat access.
- No new family is needed.
- The missing piece is a richer variant inside the existing `grant_feat` effect atom.

Honest widening options:

1. Add a `grant_feat` variant that can express a closed choice among feat categories, e.g.:
   - `category: { kind: "choice", options: ["epic_boon", "general", "origin", "fighting_style"] }`
2. Preferably, add a `grant_feat` variant that can express:
   - one required category branch (`epic_boon`), or
   - a broader `any_qualifying_feat` / `any` branch,
   so the surface does not falsely imply that "another feat" is limited to the current category enum.

Why the current surface is insufficient:

- Encoding this as `{ kind: "grant_feat", category: "epic_boon" }` loses the "or another feat of your choice" branch.
- Encoding it as `general` is also false, because Epic Boons are explicitly allowed and recommended.
- Emitting multiple `grant_feat` atoms would misrepresent the rule as granting multiple feats instead of one choice.

Evidence:

> "You gain an Epic Boon feat (see "Feats") or another feat of your choice for which you qualify."

Non-mechanical note:

- "Boon of Spell Recall is recommended." is advisory text, not a deterministic mechanical grant, so it does not force a core atom.
