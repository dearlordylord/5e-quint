-- See Invisibility — SRD 5.2.1 Spell, level 2, Divination.
--
-- RAW (Spells / Descriptions S-Z / See Invisibility):
--   "For the duration, you see creatures and objects that have the
--    Invisible condition as if they were visible, and you can see
--    into the Ethereal Plane. Creatures and objects there appear
--    ghostly."
--
-- ZERO-WIDENING VALIDATION REFERENCE. The Ethereal Plane visibility
-- clause is DM agenda (planes are session / campaign). The primary
-- mechanical effect — perceiving Invisible creatures — is a
-- perception override that we currently model via the existing
-- grant_sense atom (with truesight as the closest match in the
-- SenseKind enum, which includes "see invisible" semantics in RAW).
--
-- DEFERRED (noted). SenseKind does NOT currently have a
-- "see_invisible" variant distinct from truesight. For this spell
-- the semantics overlap with truesight's "see through illusions and
-- Invisible" clause in the Rules Glossary. If a unit surfaces that
-- demands a strictly-narrower sense kind, widen SenseKind then.

let seeInvisibility =
      { kind = "spell"
      , id = "see_invisibility"
      , name = "See Invisibility"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#See Invisibility"
          }
      , description =
          "For the duration, you see creatures and objects that have the Invisible condition as if they were visible, and you can see into the Ethereal Plane. Creatures and objects there appear ghostly."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "divination"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components =
              { v = True
              , s = True
              , m = Some "a pinch of talc"
              }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 1 }
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "grant_sense"
                      , sense = "truesight"
                      , rangeFeet = 0
                      }
                    ]
                }
              ]
          }
      }

in  seeInvisibility
