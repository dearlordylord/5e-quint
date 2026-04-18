-- Necklace of Fireballs — SRD 5.2.1 magic item (rare).
--
-- RAW (MagicItems#NecklaceOfFireballs):
--   "This necklace has 1d6 + 3 beads hanging from it. You can take a
--    Magic action to detach a bead and throw it up to 60 feet away.
--    When it reaches the end of its trajectory, the bead detonates as
--    a level 3 Fireball (save DC 15)."
--   "You can hurl multiple beads, or even the whole necklace, at one
--    time. When you do so, increase the damage of the Fireball by 1d6
--    for each bead after the first (maximum 12d6)."
--
-- Honest fit to the existing magic-item activation surface:
--   • ActivationResource.charge_pool with rolled initialCount (1d6 + 3 beads)
--   • RestResetCadence.never (spent beads do not return)
--   • activationCost = standard_action magic (explicit Magic action)
--   • save_gate over a point-anchored 20-foot-radius Sphere at 60 feet
--   • DiceAmount.resource_spent_linear for 8d6 + 1d6 per extra bead,
--     capped at 12d6 total
--   • no destruction policy — the text does not say the necklace is
--     destroyed or becomes nonmagical when emptied; the exhausted bead
--     pool alone makes it inert
--
-- The flammable-objects rider from Fireball remains omitted as DM-agenda,
-- matching the standalone fireball.dhall policy.

let necklace =
      { kind = "magic_item"
      , id = "magic_item_necklace_of_fireballs"
      , name = "Necklace of Fireballs"
      , rarity = "rare"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#NecklaceOfFireballs"
          }
      , description =
          "This necklace has 1d6 + 3 beads hanging from it. You can take a Magic action to detach a bead and throw it up to 60 feet away. When it reaches the end of its trajectory, the bead detonates as a level 3 Fireball (save DC 15). You can hurl multiple beads, or even the whole necklace, at one time. When you do so, increase the damage of the Fireball by 1d6 for each bead after the first (maximum 12d6)."
      , mechanics =
          { family = "activation"
          , activationCost = { kind = "standard_action", action = "magic" }
          , resource =
              { kind = "charge_pool"
              , cap = { kind = "fixed", uses = 9 }
              , initialCount =
                  Some
                    { kind = "fixed"
                    , expr = { dice = 1, dieSize = 6, flat = 3 }
                    }
              }
          , resetCadence = { kind = "never" }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "area"
                    , shape = { kind = "sphere", radiusFeet = 20 }
                    , origin = { kind = "point_within_range" }
                    }
                , ability = "dex"
                , dc = { kind = "fixed", dc = 15 }
                , onFail =
                    { kind = "damage"
                    , damageType = "fire"
                    , amount =
                        { kind = "resource_spent_linear"
                        , base = { dice = 7, dieSize = 6 }
                        , perResource = { dice = 1 }
                        , maximum = { dice = 12, dieSize = 6 }
                        }
                    }
                , onSuccess = { kind = "half_damage" }
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  necklace
