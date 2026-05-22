-- Draconic Spells (Sorcerer L3) — SRD 5.2.1 Sorcerer subclass feature.
--
-- RAW (Classes / Sorcerer / Draconic Sorcery / Level 3: Draconic Spells):
--   "When you reach a Sorcerer level specified in the Draconic Spells
--    table, you thereafter always have the listed spells prepared."
--
-- This record covers the level-3 row. Later table rows are separate
-- class-level Spell Access progression work.

let GrantSpellAccess =
      { kind : Text, spellId : Text, mode : Text }

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
          "When you reach Sorcerer level 3, you thereafter always have Alter Self, Chromatic Orb, Command, and Dragon's Breath prepared."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_spell_access"
                , spellId = "alter_self"
                , mode = "prepared"
                }
              , { kind = "grant_spell_access"
                , spellId = "chromatic_orb"
                , mode = "prepared"
                }
              , { kind = "grant_spell_access"
                , spellId = "command"
                , mode = "prepared"
                }
              , { kind = "grant_spell_access"
                , spellId = "dragons_breath"
                , mode = "prepared"
                }
              ] : List GrantSpellAccess
          }
      }

in  draconicSpells
