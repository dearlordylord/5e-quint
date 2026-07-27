-- Planar Binding - SRD 5.2.1 Spell, level 5, Abjuration.

let planarBinding =
      { kind = "spell"
      , id = "planar_binding"
      , name = "Planar Binding"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Planar Binding"
          }
      , description =
          "You attempt to bind a Celestial, Elemental, Fey, or Fiend to your service. The creature must remain within range for the entire casting. At the completion of the casting, the target must succeed on a Charisma saving throw or be bound to serve you for the duration. If it was summoned or created by another spell, that spell's duration extends to match this spell. A bound creature follows your commands to the best of its ability. If the creature is Hostile, it strives to twist your commands. If the creature carries out your commands completely before the spell ends, it reports to you if on the same plane. If you are on another plane, it returns to the binding place. Higher-level slots increase duration to 10 days, 30 days, 180 days, and 366 days."
      , mechanics =
          { family = "activation"
          , level = 5
          , school = "abjuration"
          , castingTime = { kind = "hours", amount = 1, ritual = False }
          , range = { kind = "point", feet = 60 }
          , components =
              { v = True
              , s = True
              , m = "a jewel worth 1,000+ GP, which the spell consumes"
              , materialCostGp = 1000
              , materialConsumed = True
              }
          , duration =
              { kind = "slot_tiered"
              , base = { kind = "timed", value = { unit = "hour", amount = 24 } }
              , tiers =
                  [ { atSlot = 6
                    , duration =
                        { kind = "timed", value = { unit = "day", amount = 10 } }
                    }
                  , { atSlot = 7
                    , duration =
                        { kind = "timed", value = { unit = "day", amount = 30 } }
                    }
                  , { atSlot = 8
                    , duration =
                        { kind = "timed", value = { unit = "day", amount = 180 } }
                    }
                  , { atSlot = 9
                    , duration =
                        { kind = "timed", value = { unit = "day", amount = 366 } }
                    }
                  ]
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "planar_binding_target"
                    , label = "Celestial, Elemental, Fey, or Fiend target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "one"
                            , targetKinds = [ "creature" ]
                            , typeFilter =
                                [ "celestial", "elemental", "fey", "fiend" ]
                            }
                        }
                    }
                , ability = "cha"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail = { kind = "none" }
                , onSuccess = { kind = "none" }
                }
              ]
          }
      }

in  planarBinding
