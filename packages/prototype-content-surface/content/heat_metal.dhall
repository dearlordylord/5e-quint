-- Heat Metal — SRD 5.2.1 Spell, Level 2, Transmutation (Bard, Druid).
--
-- RAW (Spells/Descriptions-E-L#Heat Metal):
--   "Choose a manufactured metal object, such as a metal weapon or a suit of
--    Heavy or Medium metal armor, that you can see within range. You cause the
--    object to glow red-hot. Any creature in physical contact with the object
--    takes 2d8 Fire damage when you cast the spell. Until the spell ends, you
--    can take a Bonus Action on each of your later turns to deal this damage
--    again if the object is within range.
--    If a creature is holding or wearing the object and takes the damage from
--    it, the creature must succeed on a Constitution saving throw or drop the
--    object if it can. If it doesn't drop the object, it has Disadvantage on
--    attack rolls and ability checks until the start of your next turn."
--   "Using a Higher-Level Spell Slot. The damage increases by 1d8 for each
--    spell slot level above 2."
--
-- Family: ongoing_effect (Concentration, 1 minute).
-- Attachment: object { material=metal, manufactured=true }.
--
-- ENCODING STRUCTURE:
--   initialPhase: direct → damage only (2d8 fire).
--   operations (two entries, same trigger):
--     1. on_caster_spends_action(bonus_action) → damage 2d8 fire (upcast)
--     2. on_caster_spends_action(bonus_action) → save_gate(con,
--          onFail: composite { force_drop_item, modify_roll_advantage
--                              (disadvantage, attack_roll+ability_check,
--                               expiresOn: caster_turn_start) },
--          onSuccess: none )
--
-- SURFACE WIDENING (surface_widening):
--   The initial cast applies BOTH unconditional damage AND triggers a Con
--   save for dropping/disadvantage. `initialPhase` is a single ActivationPhase
--   — it can express direct damage OR a save_gate, but not both simultaneously
--   without lying about the save gating the damage.
--   This encoding omits the Con save that fires at initial cast time.
--   The save IS encoded for every Bonus Action repeat via two same-trigger
--   operations, which fires both effects when the bonus action is spent.
--   See proposal-heat_metal.md for the widening proposal.
--
-- NOTE: "If a creature is holding or wearing the object" is a runtime
--   predicate, not a surface field — same pattern as the force_drop_item
--   atom's "if it can" note in types.ts.

let heatMetal =
      -- ── Inner effect superset for the composite onFail ──────────────────
      -- force_drop_item: { kind }
      -- modify_roll_advantage: { kind, mode, on, expiresOn }
      let InnerEffect
          : Type
          = { kind : Text
            , mode : Optional Text
            , on : Optional (List Text)
            , expiresOn : Optional { kind : Text }
            }

      let forceDropItem
          : InnerEffect
          = { kind = "force_drop_item"
            , mode = None Text
            , on = None (List Text)
            , expiresOn = None { kind : Text }
            }

      let disadvantageRider
          : InnerEffect
          = { kind = "modify_roll_advantage"
            , mode = Some "disadvantage"
            , on = Some [ "attack_roll", "ability_check" ]
            , expiresOn = Some { kind = "caster_turn_start" }
            }

      -- ── onFail composite ────────────────────────────────────────────────
      let OnFailEffect
          : Type
          = { kind : Text, effects : Optional (List InnerEffect) }

      let compositeOnFail
          : OnFailEffect
          = { kind = "composite"
            , effects = Some [ forceDropItem, disadvantageRider ]
            }

      -- ── DiceAmount (linear_per_level on slot) ───────────────────────────
      let Amount
          : Type
          = { kind : Text
            , axis : Optional Text
            , base : Optional { dice : Natural, dieSize : Natural }
            , perLevel : Optional { dice : Natural }
            , startingAtLevel : Optional Natural
            }

      -- 2d8 base at slot 2, +1d8 per slot above 2 (starting at slot 3)
      let slotScaledDamage
          : Amount
          = { kind = "linear_per_level"
            , axis = Some "slot"
            , base = Some { dice = 2, dieSize = 8 }
            , perLevel = Some { dice = 1 }
            , startingAtLevel = Some 3
            }

      -- ── Effect superset: covers "damage" and "save_gate" ────────────────
      let Effect
          : Type
          = { kind : Text
            , damageType : Optional Text
            , amount : Optional Amount
            , ability : Optional Text
            , dc : Optional { kind : Text }
            , onFail : Optional OnFailEffect
            , onSuccess : Optional { kind : Text }
            }

      let damageEffect
          : Effect
          = { kind = "damage"
            , damageType = Some "fire"
            , amount = Some slotScaledDamage
            , ability = None Text
            , dc = None { kind : Text }
            , onFail = None OnFailEffect
            , onSuccess = None { kind : Text }
            }

      let saveGateEffect
          : Effect
          = { kind = "save_gate"
            , damageType = None Text
            , amount = None Amount
            , ability = Some "con"
            , dc = Some { kind = "caster_spell_save_dc" }
            , onFail = Some compositeOnFail
            , onSuccess = Some { kind = "none" }
            }

      -- ── Shared trigger and attachment ───────────────────────────────────
      let bonusTrigger
          = { kind = "on_caster_spends_action", cost = { kind = "bonus_action" } }

      let metalObjectAttachment
          = { kind = "hole"
            , holeId = "heat_metal_object"
            , label = "target object"
            , value =
                { kind = "object", count = 1
                , filter = { material = "metal", manufactured = True }
                }
            }

      in  { kind = "spell"
          , id = "heat_metal"
          , name = "Heat Metal"
          , provenance =
              { kind = "srd-5.2.1"
              , section = "Spells/Descriptions-E-L#Heat Metal"
              }
          , description =
              "Choose a manufactured metal object, such as a metal weapon or a suit of Heavy or Medium metal armor, that you can see within range. You cause the object to glow red-hot. Any creature in physical contact with the object takes 2d8 Fire damage when you cast the spell. Until the spell ends, you can take a Bonus Action on each of your later turns to deal this damage again if the object is within range. If a creature is holding or wearing the object and takes the damage from it, the creature must succeed on a Constitution saving throw or drop the object if it can. If it doesn't drop the object, it has Disadvantage on attack rolls and ability checks until the start of your next turn. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 2."
          , mechanics =
              { family = "ongoing_effect"
              , level = 2
              , school = "transmutation"
              , castingTime = { kind = "action" }
              , range = { kind = "point", feet = 60 }
              , components =
                  { v = True, s = True, m = Some "a piece of iron and a flame" }
              , duration =
                  { kind = "concentration"
                  , upTo = { unit = "minute", amount = 1 }
                  }
              , attachment = metalObjectAttachment
              -- Initial direct damage at cast time (save omitted — see
              -- SURFACE WIDENING note above).
              , initialPhase =
                  { kind = "direct"
                  , attachment = metalObjectAttachment
                  , effects =
                      [ { kind = "damage"
                        , damageType = "fire"
                        , amount =
                            { kind = "linear_per_level"
                            , axis = "slot"
                            , base = { dice = 2, dieSize = 8 }
                            , perLevel = { dice = 1 }
                            , startingAtLevel = 3
                            }
                        }
                      ]
                  }
              -- Two same-trigger operations: damage fires, then save fires.
              -- Both bind to on_caster_spends_action(bonus_action).
              , operations =
                  [ { trigger = bonusTrigger, effect = damageEffect }
                  , { trigger = bonusTrigger, effect = saveGateEffect }
                  ]
              }
          }

in  heatMetal
