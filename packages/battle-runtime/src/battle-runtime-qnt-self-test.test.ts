import { test } from "vitest";

import {
  canonicalBattleRuntimeQntSelfTestTimeoutMs,
  runCanonicalBattleRuntimeQntSelfTests,
} from "./battle-runtime-test-support.ts";

test(
  "canonical battle runtime QNT self-tests pass",
  () => {
    runCanonicalBattleRuntimeQntSelfTests();
  },
  canonicalBattleRuntimeQntSelfTestTimeoutMs,
);
