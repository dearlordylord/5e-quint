-- Javelin of Lightning — SRD 5.2.1 magic item (uncommon).
--
-- Honest subset fit to the current magic-item activation surface:
--   • activationCost = replace_attack
--   • fixed 1/use resource with next-dawn reset
--   • line-shaped save_gate with fixed DC 13 and 4d6 lightning damage
--
-- Known omissions recorded in proposal/result:
--   • passive weapon rider: on a hit, you can have this weapon deal
--     Lightning damage instead of Piercing damage.
--   • return rider: after the Lightning Bolt property resolves, the
--     weapon reappears in your hand.

let javelin =
      { kind = "magic_item"
      , id = "magic_item_javelin_of_lightning"
      , name = "Javelin of Lightning"
      , rarity = "uncommon"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Magic-Items/Items-I-P.md#Javelin of Lightning"
          }

      , mechanics =
          { family = "activation"
          , condition = { kind = "holding_item" }
          , activationCost = { kind = "replace_attack" }
          , resource =
              { kind = "use_count"
              , cap = { kind = "fixed", uses = 1 }
              }
          , resetCadence = { kind = "dawn" }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "area"
                    , shape =
                        { kind = "line"
                        , lengthFeet = 120
                        , widthFeet = 5
                        }
                    , origin = { kind = "self" }
                    }
                , ability = "dex"
                , dc = { kind = "fixed", dc = 13 }
                , onFail =
                    { kind = "damage"
                    , damageType = "lightning"
                    , amount =
                        { kind = "fixed"
                        , expr = { dice = 4, dieSize = 6 }
                        }
                    }
                , onSuccess = { kind = "half_damage" }
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  javelin
