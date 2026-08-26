export const CONSUMER_DISTRIBUTION_BUILD_ENTRYPOINTS: Readonly<{
  readonly supervisor: string;
  readonly playerClient: string;
  readonly scenarioCharacterClient: string;
}>;
export const CONSUMER_DISTRIBUTION_RUNTIME_ENTRYPOINTS: Readonly<{
  readonly cli: string;
  readonly builder: string;
}>;
export const SUPPORTED_VITEST_SOURCE_FILE_EXTENSIONS: readonly string[];
export const SUPPORTED_VITEST_TEST_FILE_SUFFIXES: readonly string[];
export function isSupportedVitestTestFilename(path: string): boolean;
export const QUALITY_OWNED_DETERMINISTIC_RAW_SWARM_TESTS: readonly string[];
export const RAW_SWARM_TESTS_OUTSIDE_QUALITY: Readonly<Record<string, string>>;
export const MODEL_BACKED_OPERATIONS: Readonly<
  Record<
    string,
    {
      readonly command: string;
      readonly additionalEntrypoints?: readonly string[];
      readonly fixedArguments: readonly string[];
      readonly writesCatalogue: boolean;
    }
  >
>;
export const MODEL_BACKED_ENTRYPOINTS: readonly string[];
export const MODEL_BACKED_SOURCE_FILES: readonly string[];
export const DETERMINISTIC_TRANSITIVE_SCAN_BOUNDARIES: readonly string[];
export const MODEL_BACKED_PROFILE_BUDGET_SECONDS: Readonly<{
  readonly campaign: number;
  readonly trial: number;
}>;
export const CODING_AGENT_EXECUTABLES: readonly string[];
export const DETERMINISTIC_NETWORK_MODULES: readonly string[];
export const DETERMINISTIC_NETWORK_GLOBALS: readonly string[];
export const NETWORK_CLI_EXECUTABLES: readonly string[];
export const DETERMINISTIC_BLOCKED_EXECUTABLES: readonly string[];
