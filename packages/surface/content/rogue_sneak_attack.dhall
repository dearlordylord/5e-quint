-- Sneak Attack — SRD 5.2.1 Rogue level 1.
--
-- RAW (Classes / Rogue / Level 1: Sneak Attack):
--   "Once per turn, you can deal an extra 1d6 damage to one creature you hit
--   with an attack roll if you have Advantage on the roll and the attack uses
--   a Finesse or a Ranged weapon."
--
-- The ally-adjacent alternative is part of the same attack-roll-hit rider
-- trigger. The runtime projects the same-as-weapon damage type at attack
-- resolution time.
let sneakAttack =
      { id = "rogue_sneak_attack"
      , kind = "class_feature"
      , name = "Sneak Attack"
      , className = "rogue"
      , acquiredAtLevel = 1
      , description =
          "Once per turn, deal extra damage to one creature you hit with an eligible attack roll."
      , provenance =
        { kind = "srd-5.2.1", section = "Classes/Rogue#Sneak Attack" }
      , mechanics =
        { family = "on_hit_trigger"
        , trigger =
          { kind = "attack_roll_hit"
          , weaponFilter = "finesse_or_ranged"
          , rollRequirement =
              "advantage_or_ally_adjacent_without_disadvantage"
          }
        , optional = True
        , usageLimit = { kind = "once_per_turn" }
        , effect =
          { kind = "add_attack_damage_dice"
          , damageType = "same_as_attack"
          , dice =
            { kind = "class_level_table"
            , className = "rogue"
            , dieSize = 6
            , dice =
              [ { atLevel = 1, count = 1 }
              , { atLevel = 3, count = 2 }
              , { atLevel = 5, count = 3 }
              , { atLevel = 7, count = 4 }
              , { atLevel = 9, count = 5 }
              , { atLevel = 11, count = 6 }
              , { atLevel = 13, count = 7 }
              , { atLevel = 15, count = 8 }
              , { atLevel = 17, count = 9 }
              , { atLevel = 19, count = 10 }
              ]
            }
          }
        }
      }

in  sneakAttack
