// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3META-07-TWINNED-SPELL-UPCAST-TARGETING sorcerer_metamagic
// UNIT-IDENTITY-REPLAY: L3META-07-TWINNED-SPELL-UPCAST-TARGETING sorcerer_metamagic doResolveTwinnedTargetCount
import { defineSelectedIdentityReplayWitness } from "./selected-identity-witness.ts";

import { sorcererMetamagicTwinnedSelectedIdentityReplay } from "./sorcerer-metamagic-twinned-selected-identity.replay-data.test-support.ts";

defineSelectedIdentityReplayWitness(sorcererMetamagicTwinnedSelectedIdentityReplay);
