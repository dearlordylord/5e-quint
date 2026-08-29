import { Match } from "effect"

export type MirrorStreamStatus =
  | { readonly tag: "configurationInvalid" }
  | { readonly tag: "connecting" }
  | { readonly tag: "invalidEvent" }
  | { readonly tag: "streaming" }
  | { readonly tag: "transportFailure" }

export function mirrorStreamStatusPresentation(status: MirrorStreamStatus) {
  return Match.value(status).pipe(
    Match.when({ tag: "configurationInvalid" }, () => ({
      className: "text-rose-300",
      label: "configuration invalid"
    })),
    Match.when({ tag: "connecting" }, () => ({ className: "text-amber-300", label: "connecting" })),
    Match.when({ tag: "invalidEvent" }, () => ({ className: "text-rose-300", label: "invalid event" })),
    Match.when({ tag: "streaming" }, () => ({ className: "text-emerald-300", label: "streaming" })),
    Match.when({ tag: "transportFailure" }, () => ({ className: "text-rose-300", label: "offline" })),
    Match.exhaustive
  )
}
