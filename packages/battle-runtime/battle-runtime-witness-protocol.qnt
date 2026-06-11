// -*- mode: Bluespec; -*-

// Typed witness-protocol vocabulary shared by lightweight battle-runtime MBT
// witnesses. This is a LEAF MODULE: types and pure record constructors only,
// with no imports, so simulated drivers do not inherit behavioural closures.
//
// Quint 0.31.0 parameterized-alias REPL check:
//   module ParamAliasCheck {
//     type Box[a] = { value: a }
//     pure val intBox: Box[int] = { value: 1 }
//     pure val strBox: Box[str] = { value: "ok" }
//   }
// After `import ParamAliasCheck.*`, `intBox` and `strBox` evaluated. Outcome:
// accepted; use the polymorphic WitnessProtocol[h] record.
module battleRuntimeWitnessProtocol {
  type WitnessInvalidReason =
    | WStaleSubject
    | WWrongActor
    | WMissingCombatant
    | WInvalidFill
    | WUnsupportedSubject
    | WUnsupportedActOption

  type WitnessResult =
    | WInit
    | WNeedsHoles
    | WResolved
    | WInvalid(WitnessInvalidReason)

  type WitnessProtocol[h] = {
    holes: Set[h],
    result: WitnessResult,
  }

  // Quint 0.31.0 needs a value argument to infer h for empty-hole helpers.
  pure def witnessInit(holeType: h): WitnessProtocol[h] = {
    holes: Set(),
    result: WInit,
  }

  pure def witnessInitWithHoles(holes: Set[h]): WitnessProtocol[h] = {
    holes: holes,
    result: WInit,
  }

  pure def witnessNeedsHoles(holes: Set[h]): WitnessProtocol[h] = {
    holes: holes,
    result: WNeedsHoles,
  }

  pure def witnessResolved(holeType: h): WitnessProtocol[h] = {
    holes: Set(),
    result: WResolved,
  }

  pure def witnessInvalid(
    holeType: h,
    reason: WitnessInvalidReason,
  ): WitnessProtocol[h] = {
    holes: Set(),
    result: WInvalid(reason),
  }

  pure def witnessInvalidWithHoles(
    holes: Set[h],
    reason: WitnessInvalidReason,
  ): WitnessProtocol[h] = {
    holes: holes,
    result: WInvalid(reason),
  }
}
