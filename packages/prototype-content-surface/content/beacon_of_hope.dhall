-- Beacon of Hope — SRD 5.2.1 Spell, Level 3, Abjuration.
-- Family: ongoing_effect, multi-op. Validation ref for
-- death_saving_throw RollKind + saveAbilityFilter + maximize_healing.
--
-- Two passive operations:
--   1. modify_roll_advantage on Wis saves (saveAbilityFilter=wis) +
--      death saves (via the new death_saving_throw RollKind).
--   2. maximize_healing_received on HP regain.

let beaconOfHope =
      { kind = "spell"
      , id = "beacon_of_hope"
      , name = "Beacon of Hope"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Beacon of Hope"
          }
      , description =
          "Choose any number of creatures within range. For the duration, each target has Advantage on Wisdom saving throws and Death Saving Throws and regains the maximum number of Hit Points possible from any healing."
      , mechanics =
          { family = "ongoing_effect"
          , level = 3
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 30 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , attachment =
              { kind = "target"
              , selection = { mode = "any_number" }
              }
          , operations =
              [ { trigger = { kind = "passive" }
                , predicate =
                    None
                      { kind : Text
                      , threshold : Natural
                      , comparison : Text
                      }
                , effect =
                    { kind = "modify_roll_advantage"
                    , mode = Some "advantage"
                    , on = Some [ "saving_throw", "death_saving_throw" ]
                    , saveAbilityFilter = Some [ "wis" ]
                    }
                }
              , { trigger = { kind = "passive" }
                , predicate =
                    None
                      { kind : Text
                      , threshold : Natural
                      , comparison : Text
                      }
                , effect =
                    { kind = "maximize_healing_received"
                    , mode = None Text
                    , on = None (List Text)
                    , saveAbilityFilter = None (List Text)
                    }
                }
              ]
          }
      }

in  beaconOfHope
