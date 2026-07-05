// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR
// UNIT-IDENTITY-QNT-REPLAY: L3MMETA-07-QUICKENED-NEXT-PROCEDURE-SLICE sorcerer_metamagic doResolveQuickenedSpellAttackSequence
import { defineSelectedIdentityQntReplay } from "./selected-identity-witness.ts";

import { sorcererMetamagicSpellAttackSequenceSelectedIdentityQntReplay } from "./sorcerer-metamagic-spell-attack-sequence-selected-identity.qnt-replay.test-support.ts";

defineSelectedIdentityQntReplay(sorcererMetamagicSpellAttackSequenceSelectedIdentityQntReplay);
