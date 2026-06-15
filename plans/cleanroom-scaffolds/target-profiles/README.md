# Target Profiles

Target profiles provide every target-language-specific string used by the
cleanroom scaffold renderer.

The renderer is `scripts/render-cleanroom-scaffold.cjs`.

Required fields:

- `schemaVersion`: currently `1`.
- `targetProfileId`: stable target profile id.
- `targetLabel`: display label for the target language/runtime.
- `implementationKind`: short description of the artifact being built.
- `enginePath`: target implementation root inside the cleanroom repo.
- `packageManager`: target package/tooling identity.
- `sourceFileExtensions[]`: target source file extensions.
- `allowedTargetDocs[]`: external non-rules documentation allowed for this
  target.
- `verificationCommands[]`: command rows with `label` and `command`.
- `quintBinding`: target Quint/MBT binding details:
  - `name`;
  - `driverGuidanceMarkdown`;
  - `reproductionMarkdown`.

The synthetic profiles in this directory exist only to prove that templates do
not hard-code one target. They are not implementation recommendations.
