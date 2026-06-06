-- Fiend Spells (Warlock L3) — SRD 5.2.1 Warlock subclass feature.
--
-- RAW (Classes / Warlock / Fiend / Level 3: Fiend Spells):
--   "The magic of your patron ensures you always have certain spells
--    ready; when you reach a Warlock level specified in the Fiend Spells
--    table, you thereafter always have the listed spells prepared.
--
--    Level 3: Burning Hands, Command, Scorching Ray, Suggestion
--    Level 5: Fireball, Stinking Cloud
--    Level 7: Fire Shield, Wall of Fire
--    Level 9: Geas, Insect Plague"
--
-- This record keeps the whole subclass Spell Access table in one
-- class-level-gated prepared Spell Access owner.

let ClassLevelPreparedSpellAccessTier =
      { minimumClassLevel : Natural, spellIds : List Text }

let GrantClassLevelPreparedSpellAccess =
      { kind : Text, tiers : List ClassLevelPreparedSpellAccessTier }

let fiendSpells =
      { kind = "class_feature"
      , id = "warlock_fiend_spells"
      , name = "Fiend Spells"
      , className = "warlock"
      , acquiredAtLevel = 3
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Warlock#Fiend Spells"
          }
      , description =
          "The magic of your patron ensures you always have certain spells ready. When you reach Warlock levels 3, 5, 7, and 9, you thereafter always have the listed Fiend spells prepared."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_class_level_prepared_spell_access"
                , tiers =
                  [ { minimumClassLevel = 3
                    , spellIds =
                      [ "burning_hands"
                      , "command"
                      , "scorching_ray"
                      , "suggestion"
                      ]
                    }
                  , { minimumClassLevel = 5
                    , spellIds = [ "fireball", "stinking_cloud" ]
                    }
                  , { minimumClassLevel = 7
                    , spellIds = [ "fire_shield", "wall_of_fire" ]
                    }
                  , { minimumClassLevel = 9
                    , spellIds = [ "geas", "insect_plague" ]
                    }
                  ]
                }
              ] : List GrantClassLevelPreparedSpellAccess
          }
      }

in  fiendSpells
