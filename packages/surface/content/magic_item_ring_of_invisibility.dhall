-- Ring of Invisibility — SRD 5.2.1 magic item (legendary, requires attunement).
--
-- RAW: "While wearing this ring, you can take a Magic action to give yourself
-- the Invisible condition. You remain Invisible until the ring is removed or
-- until you take a Bonus Action to become visible again."
--
-- Honest fit: activation family, unlimited-use, apply_condition invisible on self.
--
-- Known gap NOT encoded: the duration end conditions.
-- "until the ring is removed" and "until you take a Bonus Action to become
-- visible again" have no representation in DurationEndTrigger. The `duration`
-- field is intentionally omitted rather than falsified. See
-- proposal-magic_item_ring_of_invisibility.md for the surface_widening proposal.

let ring =
      { kind = "magic_item"
      , id = "magic_item_ring_of_invisibility"
      , name = "Ring of Invisibility"
      , rarity = "legendary"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#RingOfInvisibility"
          }
      , description =
          "While wearing this ring, you can take a Magic action to give yourself the Invisible condition. You remain Invisible until the ring is removed or until you take a Bonus Action to become visible again."
      , mechanics =
          { family = "activation"
          , condition = { kind = "wearing_item" }
          , activationCost = { kind = "standard_action", action = "magic" }
          , resource =
              { kind = "use_count"
              , cap = { kind = "unlimited" }
              }
          , resetCadence = { kind = "never" }
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
      , destruction = { kind = "none" }
      }

in  ring
