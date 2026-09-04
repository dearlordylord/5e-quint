-- Protection from Evil and Good — SRD 5.2.1 Spell, level 1, Abjuration.
--
-- RAW (Spells / Descriptions M-P / Protection from Evil and Good):
--   "Until the spell ends, one willing creature you touch is protected
--    against creatures that are Aberrations, Celestials, Elementals,
--    Fey, Fiends, or Undead. The protection grants several benefits.
--    Creatures of those types have Disadvantage on attack rolls
--    against the target. The target also can't be possessed by or
--    gain the Charmed or Frightened conditions from them. If the
--    target is already possessed, Charmed, or Frightened by such a
--    creature, the target has Advantage on any new saving throw
--    against the relevant effect."
--
-- Consolidated validation reference for:
--   • EffectAtom.creature_type_protection, whose three discriminated
--     capabilities preserve attack Disadvantage, prevention of new
--     relevant effects, and Advantage on new saves against relevant
--     effects that already exist.
--   • Components.materialCostGp = 25 + materialConsumed = True (the
--     25-GP Holy Water "which the spell consumes" material-cost
--     metadata. No behavioral wiring; present on the spell card.)
--   • family = activation with a single direct phase under
--     concentration duration (same pattern as Fly's grant_speed — the
--     effect persists for the concentration window).
-- Runtime note: the save-Advantage capability is explicitly scoped to
-- new saves against an existing relevant effect. It is not a modifier
-- on fresh spell-invocation saves.

let protectionFromEvilAndGood =
      { kind = "spell"
      , id = "protection_from_evil_and_good"
      , name = "Protection from Evil and Good"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Protection from Evil and Good"
          }

      , mechanics =
          { family = "activation"
          , level = 1
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = Some "a flask of Holy Water"
              , materialCostGp = 25
              , materialConsumed = True
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "protection_from_evil_and_good_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "one"
                            , disposition = "willing"
                            , targetKinds = [ "creature" ]
                            }
                        }
                    }
                , effects =
                    [ { kind = "creature_type_protection"
                      , sourceCreatureTypes =
                          [ "aberration"
                          , "celestial"
                          , "elemental"
                          , "fey"
                          , "fiend"
                          , "undead"
                          ]
                      , protections =
                          [ { kind = "attack_rolls_against_target"
                            , mode = Some "disadvantage"
                            , conditions = None (List Text)
                            , possession = None Text
                            , result = None Text
                            }
                          , { kind = "new_relevant_effect_applications"
                            , mode = None Text
                            , conditions = Some [ "charmed", "frightened" ]
                            , possession = Some "included"
                            , result = Some "prevented"
                            }
                          , { kind =
                                "new_saves_against_existing_relevant_effects"
                            , conditions = Some [ "charmed", "frightened" ]
                            , possession = Some "included"
                            , mode = Some "advantage"
                            , result = None Text
                            }
                          ]
                      }
                    ]
                }
              ]
          }
      }

in  protectionFromEvilAndGood
