-- Life Domain Spells (Cleric L3) — SRD 5.2.1 Cleric subclass feature.
--
-- RAW (Classes / Cleric / Life Domain / Level 3: Life Domain Spells):
--   "Your connection to this divine domain ensures you always have
--    certain spells ready. When you reach a Cleric level specified in the
--    Life Domain Spells table, you thereafter always have the listed
--    spells prepared."
--
-- This record keeps the whole subclass Spell Access table in one
-- class-level-gated prepared Spell Access owner.

let ClassLevelPreparedSpellAccessTier =
      { minimumClassLevel : Natural, spellIds : List Text }

let GrantClassLevelPreparedSpellAccess =
      { kind : Text, tiers : List ClassLevelPreparedSpellAccessTier }

let lifeDomainSpells =
      { kind = "class_feature"
      , id = "cleric_life_domain_spells"
      , name = "Life Domain Spells"
      , className = "cleric"
      , acquiredAtLevel = 3
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Cleric#Life Domain Spells"
          }
      , description =
          "Your connection to this divine domain ensures you always have certain spells ready. When you reach Cleric levels 3, 5, 7, and 9, you thereafter always have the listed Life Domain spells prepared."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_class_level_prepared_spell_access"
                , tiers =
                  [ { minimumClassLevel = 3
                    , spellIds =
                      [ "aid", "bless", "cure_wounds", "lesser_restoration" ]
                    }
                  , { minimumClassLevel = 5
                    , spellIds = [ "mass_healing_word", "revivify" ]
                    }
                  , { minimumClassLevel = 7
                    , spellIds = [ "aura_of_life", "death_ward" ]
                    }
                  , { minimumClassLevel = 9
                    , spellIds = [ "greater_restoration", "mass_cure_wounds" ]
                    }
                  ]
                }
              ] : List GrantClassLevelPreparedSpellAccess
          }
      }

in  lifeDomainSpells
