// UNIT-IDENTITY-QNT-REPLAY: B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH alter_self doDiscoverAlterSelfTransformationMode
// UNIT-IDENTITY-QNT-REPLAY: B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH fly doDiscoverFlySpeedGrant
// UNIT-IDENTITY-QNT-REPLAY: B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH misty_step doDiscoverMistyStepSelfTeleport
// UNIT-IDENTITY-QNT-REPLAY: B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH spider_climb doDiscoverSpiderClimbSpeedGrant
import { defineSelectedIdentityQntReplay } from "./selected-identity-witness.ts";

import { level2MobilitySpellSelectedIdentityQntReplay } from "./level2-mobility-spell-selected-identity.qnt-replay.test-support.ts";

defineSelectedIdentityQntReplay(level2MobilitySpellSelectedIdentityQntReplay);
