# npm distribution and releases

This document owns npm packaging and release instructions for humans and coding
agents. Run all commands from the repository root using pnpm.

## Deliverables

| Package                  | Contract                                                                                                                                | Manifest                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `@dearlordylord/dnd-sdk` | ESM runtime APIs and TypeScript declarations for character creation, sheets, character/battle composition, battles, and the SRD catalog | [SDK manifest](../../distribution/sdk/package.json) |
| `@dearlordylord/dnd-mcp` | Bundled stdio executable, `dnd-mcp`                                                                                                     | [MCP manifest](../../distribution/mcp/package.json) |

Both packages are built from this repository. Internal `@dnd/*` workspace
packages remain private. The SDK exports point at compiled versions of the
canonical runtime sources; the build rewrites internal module references to
package-relative paths. External SDK dependency versions derive from those
sources' owning manifests. The MCP bundles its existing stdio entrypoint and dependencies, except Redis,
which is installed from npm at the owning manifest's version. Bundled dependency
license texts are included in `dist/THIRD-PARTY-NOTICES.txt`. This adds no alternate rules implementation.

The distribution manifests are private publication inputs, outside the pnpm
development workspace. The build removes the private flag only in generated
package manifests. Publish only the generated and tested tarballs in `dist/npm/`.
Never publish an internal workspace package or the manifest-input directories.
Only reachable production code, declarations, bundled SRD data, package metadata,
and license notices belong in these artifacts. Do not add private Mushroom
material, PHB+ identity, tests, proofs, local references, credentials, or source
maps. The [authoring policy](../../docs/mushroom-playbook/AUTHORING.md) applies.

The SDK is the repository's rules API, with the support limits documented in
its owning runtime READMEs. It is separate from the
[opaque Oracle](../../packages/opaque-oracle/README.md) and independent Cleanroom
Target SDKs. npm MCP delivery is also separate from
[hosted HTTP deployment](../../operations/public-mcp/README.md) and
[plugin publication](../../plugins/dnd-srd-oracle/publication/README.md).

## Development and review

1. Change the canonical runtime source, then update public export declarations
   or package usage documentation if the consumer contract changes.
2. Bump both distribution manifests to the same SemVer version for a release.
   Use `alpha.N`, `beta.N`, or `rc.N` suffixes for prereleases. Document the
   consumer-visible change in [release notes](../../distribution/CHANGELOG.md).
3. Run `pnpm check:distribution`. This builds both packages, packs them, checks
   the file allowlist and notices, installs the tarballs outside the workspace,
   compiles a TypeScript consumer, imports the SDK at runtime, and initializes
   the packaged MCP through stdio and creates a Play Session.
4. Review affected RAW/provenance, domain language, architecture/connascence,
   and code quality according to the [review rules](../../.claude/review-rules.md).
   Fix findings and recheck affected behavior until no reasonable findings
   remain. Packaging changes do not authorize changes to rules semantics.
5. Run `pnpm quality:milestone` on the stable integration revision. Existing
   acceptance gates remain required. Public distribution commands acquire the
   shared broad verification lock; do not wrap them in another lock.

`pnpm build:distribution` builds without packing or running consumer checks.
Output is disposable and ignored by Git. Build and smoke prerequisites are the
root manifest's Node/pnpm versions, an installed frozen lockfile, and `tar`.
The isolated consumer check needs registry access for external dependencies.
The full CI quality lane also runs `pnpm check:distribution` after the milestone.

## Host release

After the agent prepares the version/changelog changes and pushes the reviewed
release to `master`, the operator runs this in their clean, up-to-date host
checkout:

```sh
pnpm local-release
```

This command publishes both packages from macOS or Linux. The host needs the
repository's Node/pnpm versions, Git, and an authenticated GitHub CLI (`gh`)
with permission to dispatch and read this repository's Actions runs. Its npm
credentials must have publish access to `@dearlordylord`.

The command checks that the checkout is clean and `master` equals
`origin/master`, dispatches the Quality workflow, and waits using
`gh run watch`. Workflow dispatch always selects the full quality lane. On a
Linux runner, CI installs the frozen lockfile, runs `pnpm quality:milestone`,
and builds and tests the actual packed consumers with `pnpm check:distribution`.
The host downloads that successful run's artifacts, checks their source commit
and hashes, then publishes those exact tarballs and verifies registry integrity.
A failed run, absent artifact, or mismatched evidence stops publication.

Stable versions use `latest`; prereleases use their named channel. The command
does not bump versions, commit, push, or create Git tags. Prepare and push version
and changelog changes first. Each invocation dispatches a fresh qualification
run, so allow time for the complete CI suite.

No workspace dependency installation or Linux verification tooling is needed
on the Mac. Authentication belongs to the host. Agents must not treat missing
npm credentials in a container as a handoff blocker or ask the operator to log
into the container.

For the same remote qualification followed by publication dry runs, use:

```sh
pnpm local-release --dry-run
```

This also requires a clean, pushed `master` and GitHub authentication, but does
not require npm publish authentication. For uncommitted packaging changes, use
`pnpm check:distribution` in the Linux development environment. The release
entrypoint uses only Node built-ins and committed manifests; it does not depend
on the host's `node_modules`.

### Shared host/container checkouts

When a checkout or `node_modules` is shared across platforms, agents must not
reinstall dependencies in that shared tree. Use an isolated checkout with its
own platform-local dependencies for verification; do not symlink the host's
`node_modules`. A container reinstall can remove dependencies or replace native
binaries while the host is building or releasing. The operator runs the release
command from their own host checkout; it leaves workspace dependencies alone.

If publication stops after one package, rerun from the same revision: matching
registry integrity is accepted, different bytes for an existing version are
rejected, and only absent packages are published. Network/authentication errors
must not be treated as an unpublished version. npm publication is not atomic
across the two packages; report any partial publication accurately.

Do not claim a package is published because a build or dry run passed. Verify
with `pnpm view @dearlordylord/dnd-sdk version` and
`pnpm view @dearlordylord/dnd-mcp version` against the public registry. Installation
examples in the package READMEs apply after the selected version is published.
