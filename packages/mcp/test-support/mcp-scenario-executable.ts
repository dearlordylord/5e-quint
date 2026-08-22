const scenarioCasePattern = (scenarioId: string) =>
  new RegExp(
    `\\b(?:test|it)\\(\\s*["']${scenarioId.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}['"]`,
  );

export function sourceDefinesVitestScenario(
  source: string,
  scenarioId: string,
): boolean {
  return scenarioCasePattern(scenarioId).test(source);
}
