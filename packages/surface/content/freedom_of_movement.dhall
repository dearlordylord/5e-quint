-- Freedom of Movement — SRD 5.2.1 Spell, level 4, Abjuration.
--
-- RAW (Spells / Descriptions E-L / Freedom of Movement):
--   "You touch a willing creature. For the duration, the target's
--    movement is unaffected by Difficult Terrain, and spells and other
--    magical effects can neither reduce the target's Speed nor cause
--    the target to have the Paralyzed or Restrained conditions. The
--    target also has a Swim Speed equal to its Speed."
--   "In addition, the target can spend 5 feet of movement to
--    automatically escape from nonmagical restraints, such as
--    manacles or a creature imposing the Grappled condition on it."
--   "Using a Higher-Level Spell Slot. You can target one additional
--    creature for each spell slot level above 4."
--
-- PARTIAL. Encoded:
--   • composite { grant_condition_immunity paralyzed,
--                 grant_condition_immunity restrained,
--                 grant_speed swim (walk_speed) }
--     — RAW: "spells and other magical effects can [not] cause the
--     target to have the Paralyzed or Restrained conditions". The
--     source-narrowing ("from spells/magical effects") is not
--     representable on the surface today (no attacker/source filter
--     on grant_condition_immunity; see DEFERRED §A5 for the sibling
--     attacker-type-filter shape). Authored conservatively as
--     blanket immunity for the duration; flag as slight RAW over-
--     application until a source-narrowing shape lands.
--     — "Swim Speed equal to its Speed" rides the §A14 LinkedSpeed
--     widening (second pressure case; spider_climb is the primary
--     validation ref).
--   • TargetSelection.choose_up_to with SlotScaling base=1, +1/slot.
--
-- DEFERRED.
--   • "Movement is unaffected by Difficult Terrain" — movement-
--     conversion / spatial predicate per plans/CONTENT_SURFACE_DEFERRED.md
--     §B (see Jump precedent). Caller-owned.
--   • "Spells and other magical effects can [not] reduce the target's
--     Speed" — no source-narrowed "block_speed_modification" atom;
--     defer pending a second pressure case.
--   • "Spend 5 feet of movement to automatically escape nonmagical
--     restraints" — spatial/movement conversion (caller/DM agenda
--     per ARCHITECTURE.md §1).

let freedomOfMovement =
      { kind = "spell"
      , id = "freedom_of_movement"
      , name = "Freedom of Movement"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Freedom of Movement"
          }
      , description =
          "You touch a willing creature. For the duration, the target's movement is unaffected by Difficult Terrain, and spells and other magical effects can neither reduce the target's Speed nor cause the target to have the Paralyzed or Restrained conditions. The target also has a Swim Speed equal to its Speed. In addition, the target can spend 5 feet of movement to automatically escape from nonmagical restraints, such as manacles or a creature imposing the Grappled condition on it. Using a Higher-Level Spell Slot. You can target one additional creature for each spell slot level above 4."
      , mechanics =
          { family = "activation"
          , level = 4
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = Some "a leather strap"
              }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 1 }
              }
          , phases =
              let LinkedSpeed
                    : Type
                    = { kind : Text }
              let CompEffect
                    : Type
                    = { kind : Text
                      , condition : Optional Text
                      , speedKind : Optional Text
                      , feet : Optional LinkedSpeed
                      }
              let paralyzed
                    : CompEffect
                    = { kind = "grant_condition_immunity"
                      , condition = Some "paralyzed"
                      , speedKind = None Text
                      , feet = None LinkedSpeed
                      }
              let restrained
                    : CompEffect
                    = { kind = "grant_condition_immunity"
                      , condition = Some "restrained"
                      , speedKind = None Text
                      , feet = None LinkedSpeed
                      }
              let swimSpeed
                    : CompEffect
                    = { kind = "grant_speed"
                      , condition = None Text
                      , speedKind = Some "swim"
                      , feet = Some { kind = "walk_speed" }
                      }
              in  [ { kind = "direct"
                    , attachment =
                        { kind = "hole"
                        , holeId = "freedom_of_movement_target"
                        , label = "target"
                        , value =
                            { kind = "target"
                            , selection =
                                { mode = "choose_up_to"
                                , count =
                                    { kind = "linear"
                                    , base = 1
                                    , perSlotAboveBase = 1
                                    , baseLevel = 4
                                    }
                                }
                            }
                        }
                    , effects =
                        [ { kind = "composite"
                          , effects = [ paralyzed, restrained, swimSpeed ]
                          }
                        ]
                    }
                  ]
          }
      }

in  freedomOfMovement
