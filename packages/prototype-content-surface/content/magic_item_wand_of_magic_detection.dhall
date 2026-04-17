-- Wand of Magic Detection — SRD 5.2.1 magic item (uncommon).
--
-- RAW (Magic Items):
--   "This wand has 3 charges. While holding it, you can expend 1
--    charge to cast Detect Magic from it. The wand regains 1d3
--    expended charges daily at dawn."
--
-- Clean fit to the existing magic-item activation surface:
--   • ActivationResource.charge_pool with a fixed 3-charge cap
--   • grant_spell_access.mode.charge_cast at Detect Magic's base level
--   • RestResetCadence.dawn with partial regain = 1d3
--
-- The held-item activation is modeled as `activationCost = action`,
-- matching the package's established wand/staff precedent.

let wand =
      { kind = "magic_item"
      , id = "magic_item_wand_of_magic_detection"
      , name = "Wand of Magic Detection"
      , rarity = "uncommon"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#WandOfMagicDetection"
          }
      , description =
          "This wand has 3 charges. While holding it, you can expend 1 charge to cast Detect Magic from it. The wand regains 1d3 expended charges daily at dawn."
      , mechanics =
          { family = "activation"
          , activationCost = { kind = "action" }
          , resource =
              { kind = "charge_pool"
              , cap = { kind = "fixed", uses = 3 }
              }
          , resetCadence =
              { kind = "dawn"
              , regain =
                  Some
                    { kind = "fixed"
                    , expr = { dice = 1, dieSize = 3 }
                    }
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "grant_spell_access"
                      , spellId = "detect_magic"
                      , mode =
                          { kind = "charge_cast"
                          , baseCharges = 1
                          , perLevelCharges = 0
                          , minLevel = 1
                          , maxLevel = 1
                          }
                      }
                    ]
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  wand
