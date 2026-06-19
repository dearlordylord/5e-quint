-- Blink - SRD 5.2.1 Spell, level 3, Transmutation.
--
-- RAW (Spells/Descriptions-A-D#Blink):
--   "Roll 1d6 at the end of each of your turns for the duration."
--   "On a roll of 4-6, you vanish from your current plane of existence and
--    appear in the Ethereal Plane (the spell ends instantly if you are already
--    on that plane)."
--   "You return to the other plane at the start of your next turn and when
--    the spell ends if you are on the Ethereal Plane."
--   "You return to an unoccupied space of your choice that you can see within
--    10 feet of the space you left. If no unoccupied space is available within
--    that range, you appear in the nearest unoccupied space."
--
-- Plane occupancy, origin-space identity, visible unoccupied-space choice, and
-- nearest-unoccupied fallback are table/spatial witnesses. The Surface atom
-- preserves those source facts before any battle-runtime projection consumes
-- this spell.

let Roll : Type = { die : Natural }

let EndCurrentEffect : Type = { kind : Text }

let Perception : Type =
      { originPlaneAppearance : Text
      , maxOriginPlaneSightFeet : Natural
      , originPlaneCreaturesPerceiveSubject : Text
      }

let ReturnPlacement : Type =
      { kind : Text
      , chooser : Text
      , maxFeet : Natural
      , unavailableFallback : Text
      }

let ReturnPlan : Type =
      { timings : List Text
      , placement : ReturnPlacement
      }

let EtherealPhase : Type =
      { kind : Text
      , destination : Text
      , alreadyAtDestination : EndCurrentEffect
      , originSpace : Text
      , perception : Perception
      , interaction : Text
      , returnPlan : ReturnPlan
      }

let Outcome : Type =
      { min : Natural
      , max : Natural
      , label : Text
      , effects : Optional (List EtherealPhase)
      }

let RandomTableEffect : Type =
      { kind : Text
      , roll : Roll
      , outcomes : List Outcome
      }

let etherealPhase : EtherealPhase =
      { kind = "ethereal_phase"
      , destination = "ethereal_plane"
      , alreadyAtDestination = { kind = "end_current_effect" }
      , originSpace = "space_left"
      , perception =
          { originPlaneAppearance = "shades_of_gray"
          , maxOriginPlaneSightFeet = 60
          , originPlaneCreaturesPerceiveSubject =
              "only_with_special_ethereal_perception"
          }
      , interaction = "ethereal_plane_creatures_only"
      , returnPlan =
          { timings =
              [ "start_of_next_caster_turn"
              , "effect_end_if_on_destination"
              ]
          , placement =
              { kind =
                  "visible_unoccupied_space_within_feet_of_origin_space"
              , chooser = "caster"
              , maxFeet = 10
              , unavailableFallback = "nearest_unoccupied_space"
              }
          }
      }

let blink =
      { kind = "spell"
      , id = "blink"
      , name = "Blink"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Blink"
          }
      , description =
          "Roll 1d6 at the end of each of your turns for the duration. On a roll of 4-6, you vanish from your current plane of existence and appear in the Ethereal Plane; the spell ends instantly if you are already on that plane. While on the Ethereal Plane, you can perceive the plane you left in shades of gray out to 60 feet, can affect and be affected only by other creatures on the Ethereal Plane, and creatures on the other plane can't perceive you unless they have a special Ethereal Plane perception ability. You return to the other plane at the start of your next turn and when the spell ends if you are on the Ethereal Plane. You return to an unoccupied space of your choice that you can see within 10 feet of the space you left, or to the nearest unoccupied space if none is available within that range."
      , mechanics =
          { family = "ongoing_effect"
          , level = 3
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "timed", value = { unit = "minute", amount = 1 } }
          , attachment = { kind = "self" }
          , operations =
              [ { trigger = { kind = "on_caster_turn_end" }
                , effect =
                    { kind = "random_table"
                    , roll = { die = 6 }
                    , outcomes =
                        [ { min = 1
                          , max = 3
                          , label = "remain on origin plane"
                          , effects = None (List EtherealPhase)
                          }
                        , { min = 4
                          , max = 6
                          , label =
                              "vanish to the Ethereal Plane or end if already there"
                          , effects = Some [ etherealPhase ]
                          }
                        ]
                    } : RandomTableEffect
                }
              ]
          }
      }

in  blink
