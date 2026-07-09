// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19E-01-L5-AREA-SAVE-DAMAGE cone_of_cold flame_strike
// UNIT-IDENTITY-REPLAY: L19E-01-L5-AREA-SAVE-DAMAGE cone_of_cold doDiscoverConeOfColdSaveGatedDamage
// UNIT-IDENTITY-REPLAY: L19E-01-L5-AREA-SAVE-DAMAGE flame_strike doDiscoverFlameStrikeSaveGatedDamage
import { defineSelectedIdentityReplayWitness } from "./selected-identity-witness.ts";

import { coneOfColdSelectedIdentityReplay } from "./cone-of-cold-selected-identity.replay-data.test-support.ts";

defineSelectedIdentityReplayWitness(coneOfColdSelectedIdentityReplay);
