-- Paladin's Smite — SRD 5.2.1 Paladin level 2.
--
-- RAW (Classes / Paladin / Level 2: Paladin's Smite):
--   "You always have the Divine Smite spell prepared. In addition, you
--    can cast it without expending a spell slot, but you must finish a
--    Long Rest before you can cast it in this way again."
--
-- This fits the existing passive class-feature surface as two parallel
-- spell-access grants for the same spell:
--   • prepared — the spell is always prepared
--   • once_per_long_rest — one free cast per Long Rest

let paladinsSmite =
      { kind = "class_feature"
      , id = "paladin_paladins_smite_l2"
      , name = "Paladin's Smite"
      , className = "paladin"
      , acquiredAtLevel = 2
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Paladin#Paladin's Smite"
          }
      , description =
          "You always have the Divine Smite spell prepared. In addition, you can cast it without expending a spell slot, but you must finish a Long Rest before you can cast it in this way again."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_spell_access"
                , spellId = "divine_smite"
                , mode = "prepared"
                }
              , { kind = "grant_spell_access"
                , spellId = "divine_smite"
                , mode = "once_per_long_rest"
                }
              ]
          }
      }

in  paladinsSmite
