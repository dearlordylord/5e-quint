// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3MMETA-07-QUICKENED-NEXT-PROCEDURE-SLICE sorcerer_metamagic
// UNIT-IDENTITY-REPLAY: L3MMETA-07-QUICKENED-NEXT-PROCEDURE-SLICE sorcerer_metamagic doResolveQuickenedSpellAttackSequence
import { defineSelectedIdentityReplayWitness } from "./selected-identity-witness.ts";

import { sorcererMetamagicSpellAttackSequenceSelectedIdentityReplay } from "./sorcerer-metamagic-spell-attack-sequence-selected-identity.replay-data.test-support.ts";

defineSelectedIdentityReplayWitness(sorcererMetamagicSpellAttackSequenceSelectedIdentityReplay);
