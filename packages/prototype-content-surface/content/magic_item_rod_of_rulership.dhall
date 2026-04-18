-- Rod of Rulership — SRD 5.2.1 magic item (rare, attunement).
--
-- Core mechanic:
--   • Magic action (holding item) → save_gate → apply_condition charmed
--   • DC 15 Wisdom save vs any_number targets in sight
--   • Charmed lasts 8 hours; ends early if target harmed by caster/allies
--   • Once per dawn use
--
-- Encoded as ActivatedAbilityMechanics with a save_gate phase.
--
-- Known widenings (see proposal-magic_item_rod_of_rulership.md):
--   1. ActivatedAbilityMechanics lacks a range field.
--      The 120-foot range is unrepresentable (surface_widening).
--   2. "Commanded to something contrary to its nature" early-end
--      has no DurationEndTrigger variant — DM agenda, legitimately omitted.

let rod =
      { kind = "magic_item"
      , id = "magic_item_rod_of_rulership"
      , name = "Rod of Rulership"
      , rarity = "rare"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#RodOfRulership"
          }
      , description =
          "You can take a Magic action to present the rod and command obedience from each creature of your choice that you can see within 120 feet of yourself. Each target must succeed on a DC 15 Wisdom saving throw or have the Charmed condition for 8 hours. While Charmed in this way, the creature regards you as its trusted leader. If harmed by you or your allies or commanded to do something contrary to its nature, a target ceases to be Charmed in this way. Once used, this property can't be used again until the next dawn."
      , mechanics =
          { family = "activation"
          , condition = { kind = "holding_item" }
          , activationCost = { kind = "standard_action", action = "magic" }
          , resource =
              { kind = "use_count"
              , cap = { kind = "fixed", uses = 1 }
              }
          , resetCadence = { kind = "dawn" }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 8 }
              , earlyEnd =
                  [ { kind = "target_damaged_by_caster_or_ally" } ]
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "target"
                    , selection = { mode = "any_number" }
                    }
                , ability = "wis"
                , dc = { kind = "fixed", dc = 15 }
                , onFail =
                    { kind = "apply_condition", condition = "charmed" }
                , onSuccess = { kind = "none" }
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  rod
