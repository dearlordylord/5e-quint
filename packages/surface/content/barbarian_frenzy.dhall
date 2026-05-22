-- Frenzy — SRD 5.2.1 Barbarian Path of the Berserker subclass (level 3).
--
-- RAW (Classes / Barbarian / Path of the Berserker / Frenzy):
--   If Reckless Attack is used while Rage is active, the first target hit on
--   the Barbarian's turn by a Strength-based weapon or Unarmed Strike attack
--   takes extra d6 damage equal to the Barbarian's Rage Damage bonus. The
--   damage type is the same as the triggering weapon or Unarmed Strike.
--
-- The dice source intentionally references Rage Damage bonus semantics instead
-- of restating the Barbarian level table in this subclass feature record.

let frenzy =
      { id = "barbarian_frenzy"
      , kind = "class_feature"
      , name = "Frenzy"
      , className = "barbarian"
      , acquiredAtLevel = 3
      , description =
          "While Raging after using Reckless Attack, deal extra damage to the first target you hit on your turn with a Strength-based weapon or Unarmed Strike."
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Barbarian#Frenzy" }
      , mechanics =
          { family = "on_hit_trigger"
          , trigger =
              { kind = "hit_with_attack_roll"
              , attackFilter = "strength_weapon_or_unarmed_strike"
              , prerequisite =
                  "rage_active_and_reckless_attack_used_this_turn"
              , hitLimit = "first_target_hit_this_turn"
              }
          , optional = False
          , usageLimit = { kind = "once_per_turn" }
          , effect =
              { kind = "add_attack_damage_dice"
              , damageType = "same_as_attack"
              , dice = { kind = "rage_damage_bonus", dieSize = 6 }
              }
          }
      }

in  frenzy
