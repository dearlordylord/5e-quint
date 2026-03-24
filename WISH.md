Things I wished I knew when starting on T10c (flat damage modifiers):

1. applyDamageModifiers is a pure function with exactly one call site in pTakeDamage (line ~645 in dnd.qnt). Adding a parameter means updating only that one call site plus all test invocations. Simple threading.

2. The flat modifier sign convention matters. The SRD says "reduces all damage by 5" which means the modifier is subtracted from damage. I chose positive = damage reduction (subtracted), negative = damage increase. This matches the SRD example directly: flatModifier=5 means "reduce by 5." The alternative (positive = increase) would flip the sign at every call site.

3. Integer division in Quint floors toward zero, same as most languages. 23/2=11 matches the SRD example. No need for explicit floor().

4. intMax/intMin helpers already exist at the top of dnd.qnt (line ~83). No need to define your own clamping.

5. Quint test output is extremely terse — just the module name and exit code. No per-test pass/fail lines. Exit code 0 = all passed. A failing test shows the assertion failure. Don't panic at the minimal output.

6. The dnd2014.qnt and dnd2014Test.qnt files are archived copies of the 5.1 spec. Don't update them — they're in a different module. Only dnd.qnt and dndTest.qnt matter for the current 5.2.1 spec.

7. The XState mirror (app/src/machine-helpers.ts) has its own applyDamageModifiers that needs updating separately for Quint parity. This task only touches the Quint spec; the TS side is a follow-up.
