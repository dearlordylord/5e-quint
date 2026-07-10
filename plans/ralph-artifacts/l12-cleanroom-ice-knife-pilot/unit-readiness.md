# Single-Unit readiness

`unit-readiness-scope.json` declares the experiment as one Unit. The checker
collapses the three class-list denominator aliases into the one Unit record,
then joins the Task 1 calibration to registered obligations, QNT owner roles,
import closure, and generic route/component connectors.

The QNT closure is derived from the selected driver, applicable calibrated
obligation owners, and selected route/component connectors. Every included
owner must have both a canonical obligation join and a registered owner role.
The scope also records an executable disposition for every Task 1 obligation
family. Applicable families are resolved either through a selected route
connector or through registered calibrated QNT owners; non-applicable families
must be explicitly declared.

`unit-readiness-index.json` is navigation only. It contains the Unit identity,
accounting row ids, exact RAW anchor, obligation ids, QNT paths/actions/imports,
connector paths, prerequisite import order, domain/architecture paths, and
content hashes. It does not contain Surface mechanics, TypeScript calibration,
or prose substitutes for semantic QNT.

`unit-readiness-result.json` is the accumulated gate result. A `ready` result
has no issues; a `source-blocked` result must retain every independently found
scope, source, replay, connector, hash, or cleanroom-copy issue.

Run the focused boundary checks with:

```bash
pnpm unit-readiness:check:self-test
pnpm unit-readiness:check
```
