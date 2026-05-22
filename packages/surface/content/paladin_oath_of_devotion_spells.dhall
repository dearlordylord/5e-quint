-- Oath of Devotion Spells (Paladin L3) — SRD 5.2.1 Paladin subclass feature.
--
-- RAW (Classes / Paladin / Oath of Devotion / Level 3: Oath of Devotion Spells):
--   "The magic of your oath ensures you always have certain spells ready;
--    when you reach a Paladin level specified in the Oath of Devotion
--    Spells table, you thereafter always have the listed spells prepared."
--
-- This record covers the level-3 row. Later table rows are separate
-- class-level Spell Access progression work.

let GrantSpellAccess =
      { kind : Text, spellId : Text, mode : Text }

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
          "The magic of your oath ensures you always have certain spells ready. When you reach Paladin level 3, you thereafter always have Protection from Evil and Good and Shield of Faith prepared."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_spell_access"
                , spellId = "protection_from_evil_and_good"
                , mode = "prepared"
                }
              , { kind = "grant_spell_access"
                , spellId = "shield_of_faith"
                , mode = "prepared"
                }
              ] : List GrantSpellAccess
          }
      }

in  oathOfDevotionSpells
