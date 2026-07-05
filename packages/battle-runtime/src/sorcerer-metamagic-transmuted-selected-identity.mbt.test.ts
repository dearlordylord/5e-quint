// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.metamagic-damage-type-substitution
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.METAMAGIC_TRANSMUTED_DAMAGE_TYPE_SUBSTITUTION
// UNIT-IDENTITY-QNT-REPLAY: L3META-06-TRANSMUTED-SPELL-DAMAGE-TYPE sorcerer_metamagic doResolveTransmutedSaveGatedDamage doResolveTransmutedSpellAttack
import { defineSelectedIdentityQntReplay } from "./selected-identity-witness.ts";

import { sorcererMetamagicTransmutedSelectedIdentityQntReplay } from "./sorcerer-metamagic-transmuted-selected-identity.qnt-replay.test-support.ts";

defineSelectedIdentityQntReplay(sorcererMetamagicTransmutedSelectedIdentityQntReplay);
