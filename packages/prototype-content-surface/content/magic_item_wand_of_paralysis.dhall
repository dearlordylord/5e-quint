-- Wand of Paralysis — SRD 5.2.1 magic item (rare, attunement: spellcaster).
--
-- RAW:
--   "This wand has 7 charges. While holding it, you can take a Magic
--    action to expend 1 charge to cause a thin blue ray to streak from
--    the tip toward a creature you can see within 60 feet of yourself.
--    The target must succeed on a DC 15 Constitution saving throw or
--    have the Paralyzed condition for 1 minute. At the end of each of
--    the target's turns, it repeats the save, ending the effect on
--    itself on a success."
--
-- Fit to existing surface:
--   • ActivationResource.charge_pool (7 charges, fixed cap)
--   • EquipmentPredicate.holding_item (condition gate)
--   • ClassFeatureActivationCost.standard_action "magic"
--   • TimeResetCadence.dawn with regain = 1d6 + 1
--   • Duration.timed 1 minute (effect window for the paralyzed condition)
--   • ActivationPhase.save_gate: Con DC 15
--       onFail  = apply_condition "paralyzed"
--       onSuccess = none
--       repeatSave = { cadence = "end_of_target_turn", onSuccess = "ends_on_target" }
--   • ItemDestructionPolicy.last_charge_roll (d20, destroyOn=1)
--
-- Known surface gap (surface_widening):
--   ActivatedAbilityMechanics has no `range` field. The 60-foot range
--   of the ray is not expressible in the authored surface; it lives only
--   in the description text. All non-spell wand activations share this
--   limitation. A `range?: Range` field on ActivatedAbilityHeader (or
--   ActivatedAbilityMechanics) would close the gap.

let wand =
      { kind = "magic_item"
      , id = "magic_item_wand_of_paralysis"
      , name = "Wand of Paralysis"
      , rarity = "rare"
      , requiresAttunement = True
      , attunementRestriction = { kind = "spellcaster" }
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#WandOfParalysis"
          }
      , description =
          "This wand has 7 charges. While holding it, you can take a Magic action to expend 1 charge to cause a thin blue ray to streak from the tip toward a creature you can see within 60 feet of yourself. The target must succeed on a DC 15 Constitution saving throw or have the Paralyzed condition for 1 minute. At the end of each of the target's turns, it repeats the save, ending the effect on itself on a success. Regaining Charges. The wand regains 1d6 + 1 expended charges daily at dawn. If you expend the wand's last charge, roll 1d20. On a 1, the wand crumbles into ashes and is destroyed."
      , mechanics =
          { family = "activation"
          , condition = { kind = "holding_item" }
          , activationCost = { kind = "standard_action", action = "magic" }
          , resource =
              { kind = "charge_pool"
              , cap = { kind = "fixed", uses = 7 }
              }
          , resetCadence =
              { kind = "dawn"
              , regain =
                  Some
                    { kind = "fixed"
                    , expr = { dice = 1, dieSize = 6, flat = 1 }
                    }
              }
          , duration =
              { kind = "timed"
              , value = { unit = "minute", amount = 1 }
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "magic_item_wand_of_paralysis_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    }
                , ability = "con"
                , dc = { kind = "fixed", dc = 15 }
                , onFail =
                    { kind = "apply_condition", condition = "paralyzed" }
                , onSuccess = { kind = "none" }
                , repeatSave =
                    { cadence = "end_of_target_turn"
                    , onSuccess = "ends_on_target"
                    }
                }
              ]
          }
      , destruction =
          { kind = "last_charge_roll", die = 20, destroyOn = 1 }
      }

in  wand
