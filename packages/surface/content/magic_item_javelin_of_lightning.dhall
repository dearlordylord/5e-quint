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
          , section = "MagicItems#JavelinOfLightning"
          }
      , description =
          "Each time you make an attack roll with this magic weapon and hit, you can have it deal Lightning damage instead of Piercing damage. Lightning Bolt. When you throw this weapon at a target no farther than 120 feet from you, you can forgo making a ranged attack roll and instead turn the weapon into a bolt of lightning. This bolt forms a 5-foot-wide Line between you and the target. The target and each other creature in the Line (excluding you) makes a DC 13 Dexterity saving throw, taking 4d6 Lightning damage on a failed save or half as much damage on a successful one. Immediately after dealing this damage, the weapon reappears in your hand. This authored subset encodes only the Lightning Bolt activation; the passive damage-type swap and return-to-hand rider are omitted and called out in proposal-magic_item_javelin_of_lightning.md."
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
