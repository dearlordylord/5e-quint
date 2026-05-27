# Cleanroom Rust Rule Engine Experiment

This is an isolated experiment for generating a Rust D&D rules engine from
repo-approved source material only:

- SRD 5.2.1 RAW markdown.
- QNT semantic-core, proof, and MBT-slice files in the level 1-2 scope.
- Ubiquitous language, assumptions, and generator-readiness metadata.

The experiment target is **level 1-2 character creation plus battle**. It is not
a generator implementation in the main project and it must not read or port the
production TypeScript runtime.

## Workflow

1. Build the cleanroom input snapshot:

   ```bash
   node tools/prepare-inputs.cjs
   ```

2. Give implementation agents this directory as their workspace.

3. Agents may read:

   - `README.md`
   - `AGENTS.md`
   - `tasks/*.md`
   - `input/**`
   - `engine/**`

4. Agents must not read production TypeScript files outside this experiment.

5. Rust work lives in `engine/`.

## Success Definition

The experiment is successful when it produces one of these outcomes:

- A compiling Rust engine with meaningful level 1-2 character-creation and
  battle behavior derived from QNT/RAW.
- Or a researched failure report that identifies exactly which QNT/RAW facts are
  insufficient for cleanroom generation and what extra machine-readable contract
  would be needed.

Both outcomes are useful. Silent partial implementation is not.
