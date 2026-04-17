-- Potion of Flying — SRD 5.2.1 magic item (wondrous, very rare).
--
-- RAW (Magic-Items / Potions):
--   "When you drink this potion, you gain a Fly Speed equal to your
--    Speed for 1 hour and can hover. If you're in the air when the
--    potion wears off, you fall unless you have some other means of
--    staying aloft."
--
-- Consolidated validation reference for:
--   • EffectAtom.grant_speed { speedKind = fly, feet = { kind = walk_speed }, hover = True }
--     — "Fly Speed equal to your Speed" maps to LinkedSpeed.walk_speed
--     — first magic-item exercise of the LinkedSpeed shape (§A14)
--   • RestResetCadence.never (single-use consumable)
--   • ItemDestructionPolicy.permanent_on_empty (potion is consumed on use)
--   • ActivatedAbilityMechanics.duration = timed 1 hour (no concentration)
--
-- The "fall if in the air when the potion wears off" clause is DM agenda
-- (physics / geometry resolved at the table — see ARCHITECTURE.md §1). Omitted.

let potionOfFlying =
      { kind = "magic_item"
      , id = "magic_item_potion_of_flying"
      , name = "Potion of Flying"
      , rarity = "very_rare"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#Potion of Flying"
          }
      , description =
          "When you drink this potion, you gain a Fly Speed equal to your Speed for 1 hour and can hover. If you're in the air when the potion wears off, you fall unless you have some other means of staying aloft."
      , mechanics =
          { family = "activation"
          , activationCost = { kind = "action" }
          , resource =
              { kind = "use_count"
              , cap = { kind = "fixed", uses = 1 }
              }
          , resetCadence = { kind = "never" }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 1 }
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "grant_speed"
                      , speedKind = "fly"
                      , feet = { kind = "walk_speed" }
                      , hover = True
                      }
                    ]
                }
              ]
          }
      , destruction = { kind = "permanent_on_empty" }
      }

in  potionOfFlying
