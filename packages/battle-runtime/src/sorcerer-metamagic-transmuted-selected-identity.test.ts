// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3META-06-TRANSMUTED-SPELL-DAMAGE-TYPE sorcerer_metamagic
// UNIT-IDENTITY-REPLAY: L3META-06-TRANSMUTED-SPELL-DAMAGE-TYPE sorcerer_metamagic doResolveTransmutedSaveGatedDamage doResolveTransmutedSpellAttack
import { defineSelectedIdentityReplayWitness } from "./selected-identity-witness.ts";

import { sorcererMetamagicTransmutedSelectedIdentityReplay } from "./sorcerer-metamagic-transmuted-selected-identity.replay-data.test-support.ts";

defineSelectedIdentityReplayWitness(sorcererMetamagicTransmutedSelectedIdentityReplay);
