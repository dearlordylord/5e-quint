-- Magic Weapon — SRD 5.2.1, level 2 Transmutation spell.
--
-- RAW: "You touch a nonmagical weapon. Until the spell ends, that weapon
-- becomes a magic weapon with a +1 bonus to attack rolls and damage rolls.
-- The spell ends early if you cast it again."

let DeltaTier = { atLevel : Natural, value : Natural }

let Delta =
      { kind : Text
      , axis : Text
      , base : Natural
      , tiers : List DeltaTier
      , sign : Text
      }

let magicWeaponBonus : Delta =
      { kind = "threshold_tiers"
      , axis = "slot"
      , base = 1
      , tiers = [ { atLevel = 3, value = 2 }, { atLevel = 6, value = 3 } ]
      , sign = "+"
      }

let magicWeaponEnhancement =
      { kind = "grant_magic_weapon_enhancement", bonus = magicWeaponBonus }

let magicWeapon =
      { kind = "spell"
      , id = "magic_weapon"
      , name = "Magic Weapon"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Magic Weapon"
          }
      , description =
          "You touch a nonmagical weapon. Until the spell ends, that weapon becomes a magic weapon with a +1 bonus to attack rolls and damage rolls. The spell ends early if you cast it again. Using a Higher-Level Spell Slot: The bonus increases to +2 with a level 3-5 spell slot. The bonus increases to +3 with a level 6+ spell slot."
      , mechanics =
          { family = "ongoing_effect"
          , level = 2
          , school = "transmutation"
          , castingTime = { kind = "bonus_action" }
          , range = { kind = "touch" }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 1 }
              , earlyEnd = [ { kind = "caster_recasts_spell" } ]
              }
          , attachment = { kind = "hole"
                         , holeId = "magic_weapon_object"
                         , label = "nonmagical weapon"
                         , value =
                             { kind = "object"
                             , count = 1
                             , filter =
                                 { objectKind = "weapon"
                                 , magicality = "nonmagical"
                                 }
                             }
                         }
          , operations =
              [ { trigger = { kind = "passive" }
                , effect = magicWeaponEnhancement
                }
              ]
          }
      }

in  magicWeapon
