# Cleanroom Guidance Pack

This is the current source-side guidance root copied into future cleanroom
repositories as `cleanroom-input/guidance/**`.

Use this pack with the copied RAW, QNT, source branch inventory, reducer-route
inventory, domain language, and assumptions. Those files are the cleanroom
authority; production TypeScript code and previous cleanroom attempts are not
inputs.

Core rules:

- Treat copied `.qnt` files as formal rule statements and `.mbt.qnt` files as
  conformance specifications.
- Use `cleanroom-input/branch-coverage/reducer-route-inventory.json` when the
  selected assignment is a reducer-spine diagnostic assignment.
- Keep QNT/MBT replay adapters quarantined from production modules.
- Do not dispatch production runtime behavior on authored ids, names, slugs,
  provenance headings, page references, or official catalog labels.
- Do not store derivable facts beside their owners unless the duplicate is an
  explicit executable boundary projection.
- Record missing architecture guidance as a `source-qnt-corpus` blocker instead
  of guessing.

Guidance files:

- `reducer-spine.md` defines the cleanroom reducer surface, subject/fill
  lifecycle, durable state ownership rules, adapter quarantine rules, and
  reducer-spine diagnostic constraints.
