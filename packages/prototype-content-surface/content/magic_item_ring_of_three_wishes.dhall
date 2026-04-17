-- Ring of Three Wishes — SRD 5.2.1 magic item (legendary).
--
-- RAW (Magic-Items):
--   "While wearing this ring, you can expend 1 of its 3 charges to
--    cast Wish from it. The ring becomes nonmagical when you use the
--    last charge."
--
-- Encoding shape mirrors Wand of Magic Missiles (charge_cast idiom):
--   • ActivationResource.charge_pool (3 charges, fixed)
--   • RestResetCadence.never — ring does not regain charges
--   • grant_spell_access.mode.charge_cast (1 charge, L9 only)
--   • ItemDestructionPolicy.permanent_on_empty — ring becomes nonmagical
--     on last charge (closest available encoding; "becomes nonmagical"
--     ≠ "cracks and is destroyed" but permanent_on_empty is the honest
--     best-fit among available policy kinds)
--
-- Wish's own mechanics (reshape reality, DM adjudication) are out of
-- scope — the ring grants access to the spell; it does not re-model it.

let ring =
      { kind = "magic_item"
      , id = "ring_of_three_wishes"
      , name = "Ring of Three Wishes"
      , rarity = "legendary"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#Ring of Three Wishes"
          }
      , description =
          "While wearing this ring, you can expend 1 of its 3 charges to cast Wish from it. The ring becomes nonmagical when you use the last charge."
      , mechanics =
          { family = "activation"
          , activationCost = { kind = "action" }
          , resource =
              { kind = "charge_pool"
              , cap = { kind = "fixed", uses = 3 }
              }
          , resetCadence = { kind = "never" }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "grant_spell_access"
                      , spellId = "wish"
                      , mode =
                          { kind = "charge_cast"
                          , baseCharges = 1
                          , perLevelCharges = 0
                          , minLevel = 9
                          , maxLevel = 9
                          }
                      }
                    ]
                }
              ]
          }
      , destruction = { kind = "permanent_on_empty" }
      }

in  ring
