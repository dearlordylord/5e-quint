-- Helm of Teleportation — SRD 5.2.1 magic item (rare, attunement).
--
-- RAW:
--   "This helm has 3 charges. While wearing it, you can expend 1
--    charge to cast Teleport from it. The helm regains 1d3 expended
--    charges daily at dawn."
--
-- Honest fit to the existing charge-cast magic-item surface:
--   • MagicItemRecord with attunement
--   • activation family gated by wearing_item
--   • charge_pool resource (3 charges)
--   • dawn partial recharge (1d3)
--   • direct self grant_spell_access using charge_cast at Teleport's
--     base level

let helm =
      { kind = "magic_item"
      , id = "magic_item_helm_of_teleportation"
      , name = "Helm of Teleportation"
      , rarity = "rare"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#HelmOfTeleportation"
          }
      , description =
          "This helm has 3 charges. While wearing it, you can expend 1 charge to cast Teleport from it. The helm regains 1d3 expended charges daily at dawn."
      , mechanics =
          { family = "activation"
          , condition = { kind = "wearing_item" }
          , activationCost =
              { kind = "standard_action"
              , action = "magic"
              }
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
                      , spellId = "teleport"
                      , mode =
                          { kind = "charge_cast"
                          , baseCharges = 1
                          , perLevelCharges = 0
                          , minLevel = 7
                          , maxLevel = 7
                          }
                      }
                    ]
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  helm
