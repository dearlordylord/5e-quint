-- Paladin's Smite — SRD 5.2.1 Paladin level 2.
--
-- RAW (Classes / Paladin / Level 2: Paladin's Smite):
--   "You always have the Divine Smite spell prepared. In addition, you
--    can cast it without expending a spell slot, but you must finish a
--    Long Rest before you can cast it in this way again."
--
-- This fits the passive class-feature surface as retained Spell Access plus
-- a separate free-cast resource grant for the same spell:
--   • prepared — the spell is always prepared
--   • grant_spell_free_casts — one free cast per Long Rest

let PaladinsSmiteGrant : Type =
      { kind : Text
      , spellId : Text
      , mode : Optional Text
      , count : Optional Natural
      , resetCadence : Optional Text
      , scaling :
          Optional
            { axis : Text
            , tiers : List { atLevel : Natural, count : Natural }
            }
      }

let paladinsSmite =
      { kind = "class_feature"
      , id = "paladin_paladins_smite"
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
                , mode = Some "prepared"
                , count = None Natural
                , resetCadence = None Text
                , scaling =
                    None
                      { axis : Text
                      , tiers : List { atLevel : Natural, count : Natural }
                      }
                }
              , { kind = "grant_spell_free_casts"
                , spellId = "divine_smite"
                , mode = None Text
                , count = Some 1
                , resetCadence = Some "long_rest"
                , scaling =
                    None
                      { axis : Text
                      , tiers : List { atLevel : Natural, count : Natural }
                      }
                }
              ] : List PaladinsSmiteGrant
          }
      }

in  paladinsSmite
