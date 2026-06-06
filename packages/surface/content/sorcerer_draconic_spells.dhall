-- Draconic Spells (Sorcerer L3) — SRD 5.2.1 Sorcerer subclass feature.
--
-- RAW (Classes / Sorcerer / Draconic Sorcery / Level 3: Draconic Spells):
--   "When you reach a Sorcerer level specified in the Draconic Spells
--    table, you thereafter always have the listed spells prepared."
--
-- This record keeps the whole subclass Spell Access table in one
-- class-level-gated prepared Spell Access owner.

let ClassLevelPreparedSpellAccessTier =
      { minimumClassLevel : Natural, spellIds : List Text }

let GrantClassLevelPreparedSpellAccess =
      { kind : Text, tiers : List ClassLevelPreparedSpellAccessTier }

let draconicSpells =
      { kind = "class_feature"
      , id = "sorcerer_draconic_spells"
      , name = "Draconic Spells"
      , className = "sorcerer"
      , acquiredAtLevel = 3
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Sorcerer#Draconic Spells"
          }
      , description =
          "When you reach Sorcerer levels 3, 5, 7, and 9, you thereafter always have the listed Draconic spells prepared."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_class_level_prepared_spell_access"
                , tiers =
                  [ { minimumClassLevel = 3
                    , spellIds =
                      [ "alter_self"
                      , "chromatic_orb"
                      , "command"
                      , "dragons_breath"
                      ]
                    }
                  , { minimumClassLevel = 5
                    , spellIds = [ "fear", "fly" ]
                    }
                  , { minimumClassLevel = 7
                    , spellIds = [ "arcane_eye", "charm_monster" ]
                    }
                  , { minimumClassLevel = 9
                    , spellIds = [ "legend_lore", "summon_dragon" ]
                    }
                  ]
                }
              ] : List GrantClassLevelPreparedSpellAccess
          }
      }

in  draconicSpells
