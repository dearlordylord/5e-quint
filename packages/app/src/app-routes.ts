const _APP_ROUTE_TARGETS = [
  "battle",
  "character",
  "home",
  "machineViz",
  "machineVizEmbed",
  "machines",
  "tracePlaceholder",
  "simulator"
] as const

export type AppRouteTarget = (typeof _APP_ROUTE_TARGETS)[number]

const ROUTE_TARGET_BY_PATH: Readonly<Record<string, AppRouteTarget>> = {
  "/character": "character",
  "/simulator": "simulator",
  "/machines": "machines",
  "/machine-viz": "machineViz",
  "/embed/machine-viz": "machineVizEmbed",
  "/battle": "battle",
  "/battle/machine": "battle",
  "/battle/interrupts": "battle",
  "/embed/battle": "battle",
  "/trace": "tracePlaceholder",
  "/embed/trace": "tracePlaceholder"
}

export function appRouteTarget(path: string): AppRouteTarget {
  return ROUTE_TARGET_BY_PATH[path] ?? "home"
}
