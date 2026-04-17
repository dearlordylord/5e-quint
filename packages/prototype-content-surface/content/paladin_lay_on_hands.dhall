-- Lay On Hands — SRD 5.2.1 Paladin level 1.
--
-- RAW (Classes / Paladin / Level 1: Lay On Hands):
--   "Your blessed touch can heal wounds. You have a pool of healing
--    power that replenishes when you finish a Long Rest. With that
--    pool, you can restore a total number of Hit Points equal to five
--    times your Paladin level.
--    As a Bonus Action, you can touch a creature (which could be
--    yourself) and draw power from the pool of healing to restore a
--    number of Hit Points to that creature, up to the maximum amount
--    remaining in the pool."
--
-- Consolidated validation reference for the HP-pool cluster:
--   • ActivationResource.charge_pool (variable per-use cost)
--   • UseCountCap.linear_per_level (5 + 5/level above L1 = 5 × level)
--   • DiceAmount.resource_spent (heal equals the charges spent; player-
--     chosen at activation time, bounded by pool remainder)
--
-- The "spend 5 HP to cure Poisoned" alternative activation is
-- deliberately omitted: it requires a "choice between outcomes at
-- activation time" mechanism that is not yet in the surface. Adding it
-- would be speculative without a second feature of that shape. The
-- curing-conditions variant is a strict extension of this file.

let layOnHands =
      { kind = "class_feature"
      , id = "paladin_lay_on_hands"
      , name = "Lay On Hands"
      , className = "paladin"
      , acquiredAtLevel = 1
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Paladin#Lay On Hands"
          }
      , description =
          "Your blessed touch can heal wounds. You have a pool of healing power that replenishes when you finish a Long Rest. With that pool, you can restore a total number of Hit Points equal to five times your Paladin level. As a Bonus Action, you can touch a creature (which could be yourself) and draw power from the pool of healing to restore a number of Hit Points to that creature, up to the maximum amount remaining in the pool."
      , mechanics =
          { family = "activation"
          , activationCost = { kind = "bonus_action" }
          , resource =
              { kind = "charge_pool"
              , cap =
                  { kind = "linear_per_level"
                  , axis = "class"
                  , base = 5
                  , perLevel = 5
                  , startingAtLevel = 1
                  }
              }
          , resetCadence = { kind = "long_rest" }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "target", selection = { mode = "one" } }
                , effects =
                    [ { kind = "heal_hp"
                      , target = "target_creature"
                      , amount = { kind = "resource_spent" }
                      }
                    ]
                }
              ]
          }
      }

in  layOnHands
