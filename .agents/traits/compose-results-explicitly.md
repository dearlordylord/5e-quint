---
name: compose-results-explicitly
subject: Combining multiple results of the same type into one.
requirement: Use a named, typed operation on whole results instead of assembling
  their fields at the call site. When the operation is associative and has a
  neutral element, express it as a monoid.
purpose: Define combination once and allow its results to be combined again.
---
Effect 4 provides Struct.makeReducer for fieldwise composition and Boolean.ReducerOr for logical OR. For example: Struct.makeReducer<D20TestRollModeSources>({ advantage: Boolean.ReducerOr, disadvantage: Boolean.ReducerOr }). The resulting reducer provides combine, combineAll, and initialValue.

Reference: [Effect Struct.makeReducer](https://github.com/Effect-TS/effect/blob/main/packages/effect/src/Struct.ts#L1560).