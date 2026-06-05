-- Oath of Devotion Spells (Paladin L3) — SRD 5.2.1 Paladin subclass feature.
--
-- RAW (Classes / Paladin / Oath of Devotion / Level 3: Oath of Devotion Spells):
--   "The magic of your oath ensures you always have certain spells ready;
--    when you reach a Paladin level specified in the Oath of Devotion
--    Spells table, you thereafter always have the listed spells prepared."
--
-- This record keeps the whole subclass Spell Access table in one
-- class-level-gated prepared Spell Access owner.

let ClassLevelPreparedSpellAccessTier =
      { minimumClassLevel : Natural, spellIds : List Text }

let GrantClassLevelPreparedSpellAccess =
      { kind : Text, tiers : List ClassLevelPreparedSpellAccessTier }

let oathOfDevotionSpells =
      { kind = "class_feature"
      , id = "paladin_oath_of_devotion_spells"
      , name = "Oath of Devotion Spells"
      , className = "paladin"
      , acquiredAtLevel = 3
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Paladin#Oath of Devotion Spells"
          }
      , description =
          "The magic of your oath ensures you always have certain spells ready. When you reach Paladin levels 3, 5, 9, 13, and 17, you thereafter always have the listed Oath of Devotion spells prepared."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_class_level_prepared_spell_access"
                , tiers =
                  [ { minimumClassLevel = 3
                    , spellIds =
                      [ "protection_from_evil_and_good", "shield_of_faith" ]
                    }
                  , { minimumClassLevel = 5
                    , spellIds = [ "aid", "zone_of_truth" ]
                    }
                  , { minimumClassLevel = 9
                    , spellIds = [ "beacon_of_hope", "dispel_magic" ]
                    }
                  , { minimumClassLevel = 13
                    , spellIds =
                      [ "freedom_of_movement", "guardian_of_faith" ]
                    }
                  , { minimumClassLevel = 17
                    , spellIds = [ "commune", "flame_strike" ]
                    }
                  ]
                }
              ] : List GrantClassLevelPreparedSpellAccess
          }
      }

in  oathOfDevotionSpells
