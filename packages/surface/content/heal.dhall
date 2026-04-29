-- Heal — SRD 5.2.1 Spell, level 6, Abjuration.
--
-- RAW (Spells / Descriptions E-L / Heal):
--   "Choose a creature that you can see within range. Positive energy
--    washes through the target, restoring 70 Hit Points. This spell
--    also ends the Blinded, Deafened, and Poisoned conditions on the
--    target."
--   "Using a Higher-Level Spell Slot. The healing increases by 10 for
--    each spell slot level above 6."
--
-- Consolidated validation reference for:
--   • EffectAtom.remove_condition.condition with ARRAY payload —
--     "ends Blinded, Deafened, AND Poisoned" (all at once, not a
--     caster choice). Distinct from apply_condition.condition as
--     array, which means "caster picks one." Different semantics,
--     same shape.
--   • heal_hp with linear_per_level on a pure-flat base (70 HP
--     flat, +10/slot above 6 — no dice).

let heal =
      { kind = "spell"
      , id = "heal"
      , name = "Heal"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Heal"
          }
      , description =
          "Choose a creature that you can see within range. Positive energy washes through the target, restoring 70 Hit Points. This spell also ends the Blinded, Deafened, and Poisoned conditions on the target. Using a Higher-Level Spell Slot. The healing increases by 10 for each spell slot level above 6."
      , mechanics =
          { family = "activation"
          , level = 6
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              let HealRider
                    : Type
                    = { kind : Text
                      , amount :
                          Optional
                            { kind : Text
                            , axis : Text
                            , base : { dice : Natural, dieSize : Natural, flat : Natural }
                            , perLevel : { flat : Natural }
                            , startingAtLevel : Natural
                            }
                      , target : Optional Text
                      , condition : Optional (List Text)
                      }
              let healRider
                    : HealRider
                    = { kind = "heal_hp"
                      , amount =
                          Some
                            { kind = "linear_per_level"
                            , axis = "slot"
                            , base = { dice = 0, dieSize = 1, flat = 70 }
                            , perLevel = { flat = 10 }
                            , startingAtLevel = 6
                            }
                      , target = Some "target_creature"
                      , condition = None (List Text)
                      }
              let cleanseRider
                    : HealRider
                    = { kind = "remove_condition"
                      , amount =
                          None
                            { kind : Text
                            , axis : Text
                            , base : { dice : Natural, dieSize : Natural, flat : Natural }
                            , perLevel : { flat : Natural }
                            , startingAtLevel : Natural
                            }
                      , target = None Text
                      , condition = Some [ "blinded", "deafened", "poisoned" ]
                      }
              in  [ { kind = "direct"
                    , attachment =
                        { kind = "hole"
                        , holeId = "heal_target"
                        , label = "target"
                        , value =
                            { kind = "target"
                            , selection = { mode = "one" }
                            }
                        }
                    , effects = [ healRider, cleanseRider ]
                    }
                  ]
          }
      }

in  heal
