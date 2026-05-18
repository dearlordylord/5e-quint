-- See Invisibility — SRD 5.2.1 Spell, level 2, Divination.
--
-- RAW (Spells / Descriptions S-Z / See Invisibility):
--   "For the duration, you see creatures and objects that have the
--    Invisible condition as if they were visible, and you can see
--    into the Ethereal Plane. Creatures and objects there appear
--    ghostly."
--
-- See Invisibility is not Truesight. It sees Invisible creatures and
-- objects as visible and sees into the Ethereal Plane, but it does
-- not grant Truesight's Darkness, visual-illusion, or transformation
-- clauses. Keep this as a distinct sight override so runtime support
-- cannot accidentally claim full Truesight behavior.

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
                    [ { kind = "see_invisible_and_ethereal" } ]
                }
              ]
          }
      }

in  seeInvisibility
