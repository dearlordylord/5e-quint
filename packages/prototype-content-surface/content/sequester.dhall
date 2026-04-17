-- Sequester — SRD 5.2.1 Spell, Level 7, Transmutation.
-- §A10 validation ref — first `permanent` / "Until Dispelled" Duration.
--
-- PARTIAL.
--   • Invisible condition on the target is the mechanical core,
--     authored below.
--   • Unconscious condition (for creature targets) applies alongside
--     Invisible. Object targets don't get Unconscious. Authored the
--     creature-path conditions as a paired [invisible, unconscious]
--     array via the NonEmptyArray apply_condition form. Object-target
--     variant would need attachment-kind-polymorphism (object vs
--     creature), DEFERRED with §C4g (True Polymorph object mode).
--   • "can't be targeted by Divination spells, detected by magic, or
--     viewed remotely" — narrative / caller-owned sensing per
--     ARCHITECTURE.md §1.
--   • "doesn't age, doesn't need food, water, or air" — narrative
--     time/subsistence tracking, DM agenda.
--   • Caster-defined early-end condition ("anything you choose … 1
--     mile") is narrative — not encodable as a closed DurationEndTrigger.
--     Authored without it; caller resolves the ending predicate.

let sequester =
      { kind = "spell"
      , id = "sequester"
      , name = "Sequester"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Sequester"
          }
      , description =
          "With a touch, you magically sequester an object or a willing creature. For the duration, the target has the Invisible condition and (if a creature) the Unconscious condition. You may set a caster-defined early-end trigger; the spell also ends if the target takes any damage."
      , mechanics =
          { family = "activation"
          , level = 7
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = Some "gem dust worth 5,000+ GP, which the spell consumes"
              , materialCostGp = Some 5000
              , materialConsumed = Some True
              }
          , duration =
              { kind = "permanent"
              , endsOn = [ "dispel", "damage" ]
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "target"
                    , selection = { mode = "one" }
                    }
                , effects =
                    [ { kind = "apply_condition"
                      , condition = [ "invisible", "unconscious" ]
                      }
                    ]
                }
              ]
          }
      }

in  sequester
