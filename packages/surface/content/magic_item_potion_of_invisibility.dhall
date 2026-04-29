-- Potion of Invisibility — SRD 5.2.1 magic item.
-- Single-use potion: drink (bonus action) → apply Invisible condition for
-- 1 hour. Effect ends early if the drinker makes an attack roll, deals
-- damage, or casts a spell.
--
-- Family: activation (single-use, no attunement, permanent_on_empty destruction).
-- Duration lives on the ActivatedAbilityHeader; the phase applies the condition.

let potionOfInvisibility =
      { kind = "magic_item"
      , id = "magic_item_potion_of_invisibility"
      , name = "Potion of Invisibility"
      , rarity = "rare"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#Potion of Invisibility"
          }
      , description =
          "This potion's container looks empty but feels as though it holds liquid. When you drink the potion, you have the Invisible condition for 1 hour. The effect ends early if you make an attack roll, deal damage, or cast a spell."
      , mechanics =
          { family = "activation"
          , activationCost = { kind = "bonus_action" }
          , resource =
              { kind = "use_count"
              , cap = { kind = "fixed", uses = 1 }
              }
          , resetCadence = { kind = "never" }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 1 }
              , earlyEnd =
                  [ { kind = "target_makes_attack_roll" }
                  , { kind = "target_deals_damage" }
                  , { kind = "target_casts_spell" }
                  ]
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "apply_condition"
                      , condition = "invisible"
                      }
                    ]
                }
              ]
          }
      , destruction = { kind = "permanent_on_empty" }
      }

in  potionOfInvisibility
