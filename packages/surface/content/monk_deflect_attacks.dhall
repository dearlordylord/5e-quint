-- Deflect Attacks — SRD 5.2.1 Monk level 3.
--
-- RAW (Classes / Monk / Level 3: Deflect Attacks):
--   When an attack roll hits you and its damage includes Bludgeoning,
--   Piercing, or Slashing damage, you can take a Reaction to reduce the
--   attack's total damage by 1d10 + Dexterity modifier + Monk level.
--   If the damage is reduced to 0, redirect part of that damage to another
--   creature within 5 feet.

let deflectAttacks =
      { id = "monk_deflect_attacks"
      , kind = "class_feature"
      , name = "Deflect Attacks"
      , className = "monk"
      , acquiredAtLevel = 3
      , description =
          "When an attack roll hits you and its damage includes Bludgeoning, Piercing, or Slashing damage, take a Reaction to reduce the attack's total damage against you."
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Monk#Deflect Attacks" }
      , mechanics =
          { family = "reaction_roll_or_damage_reduction"
          , modifiers =
              [ { kind = "attack_damage_reduction"
                , trigger =
                    { kind = "hit_by_attack_roll"
                    , damageIncludes = [ "bludgeoning", "piercing", "slashing" ]
                    }
                , reduction =
                    { kind = "dice_plus_ability_modifier_plus_class_level"
                    , dice = { dice = 1, dieSize = 10 }
                    , ability = "dex"
                    }
                , zeroDamageRedirect = True
                }
              ]
          }
      }

in  deflectAttacks
