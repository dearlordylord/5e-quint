// UNIT-IDENTITY-EVIDENCE: selected-identity-replay B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH alter_self fly misty_step spider_climb
// UNIT-IDENTITY-REPLAY: B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH alter_self doDiscoverAlterSelfTransformationMode
// UNIT-IDENTITY-REPLAY: B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH fly doDiscoverFlySpeedGrant
// UNIT-IDENTITY-REPLAY: B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH misty_step doDiscoverMistyStepSelfTeleport
// UNIT-IDENTITY-REPLAY: B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH spider_climb doDiscoverSpiderClimbSpeedGrant
import { defineSelectedIdentityReplayWitness } from "./selected-identity-witness.ts";

import { level2MobilitySpellSelectedIdentityReplay } from "./level2-mobility-spell-selected-identity.replay-data.test-support.ts";

defineSelectedIdentityReplayWitness(level2MobilitySpellSelectedIdentityReplay);
