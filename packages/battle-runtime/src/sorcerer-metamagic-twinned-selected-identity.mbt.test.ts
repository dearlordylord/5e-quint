// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.metamagic-effective-level-extra-target
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.METAMAGIC_TWINNED_EFFECTIVE_LEVEL_EXTRA_TARGET
// UNIT-IDENTITY-QNT-REPLAY: L3META-07-TWINNED-SPELL-UPCAST-TARGETING sorcerer_metamagic doResolveTwinnedTargetCount
import { defineSelectedIdentityQntReplay } from "./selected-identity-witness.ts";

import { sorcererMetamagicTwinnedSelectedIdentityQntReplay } from "./sorcerer-metamagic-twinned-selected-identity.qnt-replay.test-support.ts";

defineSelectedIdentityQntReplay(sorcererMetamagicTwinnedSelectedIdentityQntReplay);
