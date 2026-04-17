-- Mage Armor — SRD 5.2.1 Spell, level 1, Abjuration.
--
-- RAW (Spells / Descriptions M-P / Mage Armor):
--   "You touch a willing creature who isn't wearing armor. Until the
--    spell ends, the target's base AC becomes 13 plus its Dexterity
--    modifier. The spell ends early if the target dons armor."
--
-- Consolidated validation reference for:
--   • OngoingOperation.modify_ac_set_base (replaces base AC with a
--     const + ability modifier formula while the effect is active)
--
-- The "spell ends early if the target dons armor" clause is modeled
-- via Duration.timed.earlyEnd = [ { kind = "target_dons_armor" } ].

let mageArmor =
      { kind = "spell"
      , id = "mage_armor"
      , name = "Mage Armor"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Mage Armor"
          }
      , description =
          "You touch a willing creature who isn't wearing armor. Until the spell ends, the target's base AC becomes 13 plus its Dexterity modifier. The spell ends early if the target dons armor."
      , mechanics =
          { family = "ongoing_effect"
          , level = 1
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = Some "a piece of cured leather"
              }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 8 }
              , earlyEnd = [ { kind = "target_dons_armor" } ]
              }
          , attachment =
              { kind = "target"
              , selection = { mode = "one" }
              }
          , operation =
              { kind = "modify_ac_set_base"
              , const = 13
              , abilityMod = "dex"
              }
          }
      }

in  mageArmor
