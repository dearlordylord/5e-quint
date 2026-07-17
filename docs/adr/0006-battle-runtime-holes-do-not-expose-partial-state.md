# Battle Runtime Holes Do Not Expose Partial State

Battle Acts commit their mechanical state changes atomically when they resolve. A Runtime Hole frontier exposes only the inputs needed to continue the selected Act; every snapshot returned before resolution remains the last committed battle snapshot, while partially applied procedure state and interrupt frames remain internal. Available-Act and Runtime-Hole frontiers are therefore separate from the mechanical snapshot, and rejection or an open frontier cannot publish partial progress as battle state.

Continuation is deterministic replay from the last committed Battle state, the selected typed execution reference, and the complete ordered prefix of accepted ordinary fills and interrupt choices. The caller retains that prefix; the runtime does not publish partially applied state or an opaque continuation token. Replaying the same inputs must reproduce the same next frontier or resolution.

A rejected Act selection or fill is not added to the accepted prefix and leaves both the committed snapshot and the preceding replay result unchanged, so the caller may retry with another input. An Oracle Case may stop recording after its chosen input is rejected, but that ends only that Case trace; it does not make the Battle terminal.
