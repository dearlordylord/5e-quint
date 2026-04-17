-- Potion of Healing — SRD 5.2.1 magic item (Common tier, representative).
--
-- SRD 5.2.1 Equipment text:
--   "As a Bonus Action, you can drink it or administer it to another
--   creature within 5 feet of yourself. The creature that drinks the
--   magical red fluid in this vial regains 2d4 + 2 Hit Points."
--
-- The Potions of Healing family has four tiers (Common/Uncommon/Rare/
-- Very Rare); each tier is mechanically identical except for the dice
-- expression. This file encodes the base Common tier only.
-- The other three (greater/superior/supreme) would each be a separate
-- MagicItemRecord with the same family shape, differing only in rarity
-- and DiceExpr.

let potionOfHealing =
      { kind = "magic_item"
      , id = "potion_of_healing"
      , name = "Potion of Healing"
      , rarity = "common"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Equipment#Potion of Healing"
          }
      , description =
          "As a Bonus Action, you can drink it or administer it to another creature within 5 feet of yourself. The creature that drinks the magical red fluid in this vial regains 2d4 + 2 Hit Points."
      , mechanics =
          { family = "activation"
          , activationCost = { kind = "bonus_action" }
          , resource =
              { kind = "use_count"
              , cap = { kind = "fixed", uses = 1 }
              }
          , resetCadence = { kind = "never" }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "target"
                    , selection = { mode = "one" }
                    }
                , effects =
                    [ { kind = "heal_hp"
                      , amount =
                          { kind = "fixed"
                          , expr = { dice = 2, dieSize = 4, flat = 2 }
                          }
                      , target = "target_creature"
                      }
                    ]
                }
              ]
          }
      , destruction = { kind = "permanent_on_empty" }
      }

in  potionOfHealing
