-- Brooch of Shielding — SRD 5.2.1 magic item (uncommon, attunement).
--
-- Rules: "While wearing this brooch, you have Resistance to Force
-- damage, and you have Immunity to damage from the Magic Missile spell."
--
-- Both mechanics encode cleanly:
--   • grant_resistance damageType=force
--   • negate_named_effect spellId=magic_missile scope=damage_only
-- The grants list is heterogeneous in TS; in Dhall we use a flattened
-- union record (all fields present, unused ones None) and rely on
-- --omit-empty to strip them in the output JSON.

let Grant =
      { kind : Text
      , damageType : Optional Text
      , spellId : Optional Text
      , scope : Optional Text
      }

let brooch =
      { kind = "magic_item"
      , id = "magic_item_brooch_of_shielding"
      , name = "Brooch of Shielding"
      , rarity = "uncommon"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#Brooch of Shielding"
          }
      , description =
          "While wearing this brooch, you have Resistance to Force damage, and you have Immunity to damage from the Magic Missile spell."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_resistance"
                , damageType = Some "force"
                , spellId = None Text
                , scope = None Text
                } : Grant
              , { kind = "negate_named_effect"
                , damageType = None Text
                , spellId = Some "magic_missile"
                , scope = Some "damage_only"
                } : Grant
              ]
          }
      , destruction = { kind = "none" }
      }

in  brooch
