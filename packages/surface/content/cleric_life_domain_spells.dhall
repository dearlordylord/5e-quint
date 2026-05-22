-- Life Domain Spells (Cleric L3) — SRD 5.2.1 Cleric subclass feature.
--
-- RAW (Classes / Cleric / Life Domain / Level 3: Life Domain Spells):
--   "Your connection to this divine domain ensures you always have
--    certain spells ready. When you reach a Cleric level specified in the
--    Life Domain Spells table, you thereafter always have the listed
--    spells prepared."
--
-- This record covers the level-3 row. Later table rows are separate
-- class-level Spell Access progression work.

let GrantSpellAccess =
      { kind : Text, spellId : Text, mode : Text }

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
          "Your connection to this divine domain ensures you always have certain spells ready. When you reach Cleric level 3, you thereafter always have Aid, Bless, Cure Wounds, and Lesser Restoration prepared."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_spell_access"
                , spellId = "aid"
                , mode = "prepared"
                }
              , { kind = "grant_spell_access"
                , spellId = "bless"
                , mode = "prepared"
                }
              , { kind = "grant_spell_access"
                , spellId = "cure_wounds"
                , mode = "prepared"
                }
              , { kind = "grant_spell_access"
                , spellId = "lesser_restoration"
                , mode = "prepared"
                }
              ] : List GrantSpellAccess
          }
      }

in  lifeDomainSpells
