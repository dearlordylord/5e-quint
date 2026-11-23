---
name: preserve-failure-meaning
subject: Functions that depend on entity lookups or validated prerequisites.
requirement: Preserve totality over the function's meaningful domain. Accept
  resolved entities or validated prerequisites as inputs, or preserve missing
  entities and failed prerequisites in an explicit typed result. Return an
  ordinary negative, zero, empty, unchanged, or no-modifier result only when it
  is the defined domain outcome; keep missing evidence distinct from verified
  absence.
purpose: Make broken caller invariants visible and keep successful results trustworthy.
---

A missing attack target must not produce the same no-modifier result as an existing target without relevant conditions. An existing target with no relevant conditions is a valid negative result. An intentionally optional configuration with an explicit domain default is also valid.
