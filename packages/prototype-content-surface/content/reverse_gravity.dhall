-- Reverse Gravity — SRD 5.2.1 Spell, level 7, Transmutation.
--
-- RAW (Spells/Descriptions-Q-R#Reverse Gravity):
--   "This spell reverses gravity in a 50-foot-radius, 100-foot high
--    Cylinder centered on a point within range."
--   "All creatures and objects in that area that aren't anchored to the
--    ground fall upward and reach the top of the Cylinder."
--   "A creature can make a Dexterity saving throw to grab a fixed object
--    it can reach, thus avoiding the fall upward."
--   "If a ceiling or an anchored object is encountered in this upward
--    fall, creatures and objects strike it just as they would during a
--    downward fall."
--   "If an affected creature or object reaches the Cylinder's top without
--    striking anything, it hovers there for the duration."
--   "When the spell ends, affected objects and creatures fall downward."
--
-- PARTIAL: object-only falling and the "anchored to the ground" object
-- exclusion are not represented separately from creature resolution here.
-- The creature-facing save/fall/suspend/end-fall surface is represented.

let Effect : Type =
      { kind : Text
      , direction : Optional Text
      , maxDistanceFeet : Optional Natural
      , impactAsNormalFall : Optional Bool
      , location : Optional Text
      , until : Optional Text
      , unlessCanStopFall : Optional Bool
      , effects :
          Optional
            ( List
                { kind : Text
                , direction : Optional Text
                , maxDistanceFeet : Optional Natural
                , impactAsNormalFall : Optional Bool
                , location : Optional Text
                , until : Optional Text
                , unlessCanStopFall : Optional Bool
                }
            )
      }

let noChildren =
      None
        ( List
            { kind : Text
            , direction : Optional Text
            , maxDistanceFeet : Optional Natural
            , impactAsNormalFall : Optional Bool
            , location : Optional Text
            , until : Optional Text
            , unlessCanStopFall : Optional Bool
            }
        )

let forceFallUp : Effect =
      { kind = "force_fall"
      , direction = Some "upward"
      , maxDistanceFeet = Some 100
      , impactAsNormalFall = Some True
      , location = None Text
      , until = None Text
      , unlessCanStopFall = None Bool
      , effects = noChildren
      }

let suspendAtTop : Effect =
      { kind = "suspend_in_area"
      , direction = None Text
      , maxDistanceFeet = None Natural
      , impactAsNormalFall = None Bool
      , location = Some "top"
      , until = Some "effect_ends"
      , unlessCanStopFall = None Bool
      , effects = noChildren
      }

let fallOnEnd : Effect =
      { kind = "fall_when_effect_ends"
      , direction = Some "downward"
      , maxDistanceFeet = None Natural
      , impactAsNormalFall = None Bool
      , location = None Text
      , until = None Text
      , unlessCanStopFall = Some True
      , effects = noChildren
      }

let failBundle : Effect =
      { kind = "composite"
      , direction = None Text
      , maxDistanceFeet = None Natural
      , impactAsNormalFall = None Bool
      , location = None Text
      , until = None Text
      , unlessCanStopFall = None Bool
      , effects =
          Some
            [ forceFallUp.{ kind, direction, maxDistanceFeet, impactAsNormalFall, location, until, unlessCanStopFall }
            , suspendAtTop.{ kind, direction, maxDistanceFeet, impactAsNormalFall, location, until, unlessCanStopFall }
            ]
      }

let grabFixedObject : Effect =
      { kind = "grab_fixed_object"
      , direction = None Text
      , maxDistanceFeet = None Natural
      , impactAsNormalFall = None Bool
      , location = None Text
      , until = None Text
      , unlessCanStopFall = None Bool
      , effects = noChildren
      }

let gravityArea =
      { kind = "hole"
      , holeId = "reverse_gravity_cylinder"
      , label = "reversed gravity cylinder"
      , value =
          { kind = "area"
          , shape = { kind = "cylinder", radiusFeet = 50, heightFeet = 100 }
          , origin = { kind = "point_within_range" }
          }
      }

let reverseGravity =
      { kind = "spell"
      , id = "reverse_gravity"
      , name = "Reverse Gravity"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-Q-R#Reverse Gravity"
          }
      , description =
          "This spell reverses gravity in a 50-foot-radius, 100-foot-high Cylinder centered on a point within range. Creatures and objects in the area that aren't anchored to the ground fall upward to the top of the Cylinder. A creature can make a Dexterity saving throw to grab a fixed object it can reach, avoiding the fall upward. If a ceiling or anchored object is encountered, creatures and objects strike it as during a downward fall. Affected creatures and objects that reach the top hover there for the duration. When the spell ends, affected objects and creatures fall downward."
      , mechanics =
          { family = "ongoing_effect"
          , level = 7
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 100 }
          , components =
              { v = True
              , s = True
              , m = Some "a lodestone and iron filings"
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , attachment = gravityArea
          , initialPhase =
              { kind = "save_gate"
              , attachment = gravityArea
              , ability = "dex"
              , dc = { kind = "caster_spell_save_dc" }
              , onFail = failBundle
              , onSuccess = grabFixedObject
              }
          , operations =
              [ { trigger = { kind = "passive" }, effect = fallOnEnd } ]
          }
      }

in  reverseGravity
