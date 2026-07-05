// UNIT-IDENTITY-EVIDENCE: selected-identity-replay B25-SHINING-SMITE-IDENTITY-WITNESS shining_smite
// UNIT-IDENTITY-REPLAY: B25-SHINING-SMITE-IDENTITY-WITNESS shining_smite doDiscoverShiningSmiteAfterHitDamageIllumination
import { defineSelectedIdentityReplayWitness } from "./selected-identity-witness.ts";

import { shiningSmiteSelectedIdentityReplay } from "./shining-smite-selected-identity.replay-data.test-support.ts";

defineSelectedIdentityReplayWitness(shiningSmiteSelectedIdentityReplay);
