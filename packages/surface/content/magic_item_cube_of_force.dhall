-- Cube of Force — SRD 5.2.1 magic item (rare, attunement).
--
-- RAW:
--   "You can press one of those faces, expend the number of charges
--    required for it, and thereby cast the spell associated with it
--    (save DC 17), as shown in the Cube of Force Faces table."
--   "The cube starts with 10 charges, and it regains 1d6 expended
--    charges daily at dawn."
--
-- Honest fit to the current magic-item activation surface:
--   • activation while holding the item
--   • charge_pool resource (10 charges)
--   • dawn recharge (1d6)
--   • multiple fixed-cost grant_spell_access effects
--   • fixed DC 17 for all granted spells

let cube =
      { kind = "magic_item"
      , id = "magic_item_cube_of_force"
      , name = "Cube of Force"
      , rarity = "rare"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#CubeOfForce"
          }
      , description =
          "This cube is about an inch across. Each face has a distinct marking on it. You can press one of those faces, expend the number of charges required for it, and thereby cast the spell associated with it (save DC 17), as shown in the Cube of Force Faces table. The cube starts with 10 charges, and it regains 1d6 expended charges daily at dawn. Faces: Mage Armor (1 charge), Shield (1 charge), Tiny Hut (3 charges), Private Sanctum (4 charges), Resilient Sphere (4 charges), Wall of Force (5 charges)."
      , mechanics =
          { family = "activation"
          , condition = { kind = "holding_item" }
          , activationCost = { kind = "standard_action", action = "magic" }
          , resource =
              { kind = "charge_pool"
              , cap = { kind = "fixed", uses = 10 }
              }
          , resetCadence =
              { kind = "dawn"
              , regain =
                  Some
                    { kind = "fixed"
                    , expr = { dice = 1, dieSize = 6 }
                    }
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "grant_spell_access"
                      , spellId = "mage_armor"
                      , mode =
                          { kind = "charge_cast"
                          , baseCharges = 1
                          , perLevelCharges = 0
                          , minLevel = 1
                          , maxLevel = 1
                          }
                      , dcOverride = { kind = "fixed", dc = 17 }
                      }
                    , { kind = "grant_spell_access"
                      , spellId = "shield"
                      , mode =
                          { kind = "charge_cast"
                          , baseCharges = 1
                          , perLevelCharges = 0
                          , minLevel = 1
                          , maxLevel = 1
                          }
                      , dcOverride = { kind = "fixed", dc = 17 }
                      }
                    , { kind = "grant_spell_access"
                      , spellId = "tiny_hut"
                      , mode =
                          { kind = "charge_cast"
                          , baseCharges = 3
                          , perLevelCharges = 0
                          , minLevel = 3
                          , maxLevel = 3
                          }
                      , dcOverride = { kind = "fixed", dc = 17 }
                      }
                    , { kind = "grant_spell_access"
                      , spellId = "private_sanctum"
                      , mode =
                          { kind = "charge_cast"
                          , baseCharges = 4
                          , perLevelCharges = 0
                          , minLevel = 4
                          , maxLevel = 4
                          }
                      , dcOverride = { kind = "fixed", dc = 17 }
                      }
                    , { kind = "grant_spell_access"
                      , spellId = "resilient_sphere"
                      , mode =
                          { kind = "charge_cast"
                          , baseCharges = 4
                          , perLevelCharges = 0
                          , minLevel = 4
                          , maxLevel = 4
                          }
                      , dcOverride = { kind = "fixed", dc = 17 }
                      }
                    , { kind = "grant_spell_access"
                      , spellId = "wall_of_force"
                      , mode =
                          { kind = "charge_cast"
                          , baseCharges = 5
                          , perLevelCharges = 0
                          , minLevel = 5
                          , maxLevel = 5
                          }
                      , dcOverride = { kind = "fixed", dc = 17 }
                      }
                    ]
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  cube
