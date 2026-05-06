const _APP_ROUTE_TARGETS = ["battle", "character", "home", "tracePlaceholder"] as const

export type AppRouteTarget = (typeof _APP_ROUTE_TARGETS)[number]

const ROUTE_TARGET_BY_PATH: Readonly<Record<string, AppRouteTarget>> = {
  "/battle": "battle",
  "/battle/machine": "battle",
  "/battle/interrupts": "battle",
  "/character": "character",
  "/embed/battle": "battle",
  "/embed/trace": "tracePlaceholder",
  "/trace": "tracePlaceholder"
}

export function appRouteTarget(path: string): AppRouteTarget {
  return ROUTE_TARGET_BY_PATH[path] ?? "home"
}
