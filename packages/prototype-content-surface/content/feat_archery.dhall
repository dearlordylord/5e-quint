-- Archery — SRD 5.2.1 Fighting Style Feat.
--
-- RAW (Feats / Fighting Styles / Archery):
--   "You gain a +2 bonus to attack rolls you make with Ranged weapons."
--
-- Consolidated validation reference for:
--   • ModifyRollNumeric.weaponFilter (weapon_category: ranged)
--
-- Design note: the filter is per-attack-roll (the weapon used in the
-- specific attack), not per-wielding (what the character currently
-- holds). A ranger dual-wielding a longbow + shortsword receives +2 on
-- bow attacks but not on shortsword attacks; modeling this as an
-- EquipmentPredicate gate (wielding_weapon: ranged) would incorrectly
-- also grant +2 to the shortsword attack while the bow is in hand.
-- weaponFilter scopes the modifier to the roll's weapon directly.

let archery =
      { kind = "feat"
      , id = "feat_archery"
      , name = "Archery"
      , category = "fighting_style"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Feats/FightingStyle#Archery"
          }
      , description =
          "You gain a +2 bonus to attack rolls you make with Ranged weapons."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "modify_roll_numeric"
                , on = [ "attack_roll" ]
                , delta =
                    { kind = "fixed_dice"
                    , dice = 2
                    , dieSize = 1
                    , sign = "+"
                    }
                , weaponFilter =
                    { kind = "weapon_category", category = "ranged" }
                }
              ]
          }
      }

in  archery
