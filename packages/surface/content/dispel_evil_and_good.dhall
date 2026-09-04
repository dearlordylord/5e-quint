-- Dispel Evil and Good - SRD 5.2.1 Spell, level 5, Abjuration.
let dispelEvilAndGood =
      { kind = "spell"
      , id = "dispel_evil_and_good"
      , name = "Dispel Evil and Good"
      , provenance =
        { kind = "srd-5.2.1"
        , section = "Spells/Descriptions-A-D#Dispel Evil and Good"
        }
      , mechanics =
        { family = "ongoing_effect"
        , level = 5
        , school = "abjuration"
        , castingTime.kind = "action"
        , range.kind = "self"
        , components = { v = True, s = True, m = "powdered silver and iron" }
        , duration =
          { kind = "concentration", upTo = { unit = "minute", amount = 1 } }
        , attachment.kind = "self"
        , operations =
          [ { trigger.kind = "passive"
            , effect =
              { kind = "creature_type_ward"
              , creatureTypes =
                [ "celestial", "elemental", "fey", "fiend", "undead" ]
              , protections =
                [ { kind = "attack_rolls_against_target"
                  , mode = Some "disadvantage"
                  , conditions = None (List Text)
                  , possession = None Text
                  , outcomes =
                      None
                        ( List
                            { kind : Text
                            , result : Optional Text
                            , mode : Optional Text
                            }
                        )
                  }
                ]
              , specialFunctions =
                [ { kind = "end_source_scoped_relevant_effects"
                  , action = "magic"
                  , target = { kind = "touched_creature", feet = None Natural }
                  , conditions = Some [ "charmed", "frightened" ]
                  , possession = Some "included"
                  , save =
                      None
                        { ability : Text
                        , dc : { kind : Text }
                        , onFailure :
                            { kind : Text
                            , creatureTypeDestinationOverrides :
                                List { creatureType : Text, destination : Text }
                            }
                        }
                  }
                , { kind = "dismiss_creature_to_home_plane"
                  , action = "magic"
                  , target =
                    { kind = "visible_creature_within_feet", feet = Some 5 }
                  , conditions = None (List Text)
                  , possession = None Text
                  , save = Some
                    { ability = "cha"
                    , dc.kind = "caster_spell_save_dc"
                    , onFailure =
                      { kind = "send_to_home_plane_if_not_already_there"
                      , creatureTypeDestinationOverrides =
                        [ { creatureType = "undead"
                          , destination = "shadowfell"
                          }
                        , { creatureType = "fey", destination = "feywild" }
                        ]
                      }
                    }
                  }
                ]
              }
            }
          ]
        }
      }

in  dispelEvilAndGood
