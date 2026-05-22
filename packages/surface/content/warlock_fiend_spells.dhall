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
-- This record covers the level-3 row. Later table rows are separate
-- class-level Spell Access progression work.

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
          "The magic of your patron ensures you always have certain spells ready. When you reach Warlock level 3, you thereafter always have Burning Hands, Command, Scorching Ray, and Suggestion prepared."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_spell_access"
                , spellId = "burning_hands"
                , mode = "prepared"
                }
              , { kind = "grant_spell_access"
                , spellId = "command"
                , mode = "prepared"
                }
              , { kind = "grant_spell_access"
                , spellId = "scorching_ray"
                , mode = "prepared"
                }
              , { kind = "grant_spell_access"
                , spellId = "suggestion"
                , mode = "prepared"
                }
              ]
          }
      }

in  fiendSpells
