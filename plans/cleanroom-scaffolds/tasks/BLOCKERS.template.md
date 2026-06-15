# Blockers

None recorded.

Record a blocker only when an allowed input is insufficient for a behavior a
task requires or when the target implementation cannot yet satisfy a replayable
source branch.

Each entry states:

- task id;
- manifest source commit SHA;
- source branch inventory SHA;
- blocker class: `source-qnt-corpus`, `source-scope`, or
  `target-implementation`;
- affected driver and branch action when applicable;
- missing fact or failing target capability;
- corpus files consulted;
- exact question the corpus cannot answer, or exact target gap that remains.
