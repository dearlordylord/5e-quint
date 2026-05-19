-- Locate Object - SRD 5.2.1 Spell, level 2, Divination.
--
-- RAW (Spells/Descriptions-E-L#Locate Object):
--   "Describe or name an object that is familiar to you."
--   "You sense the direction to the object's location if that object is
--    within 1,000 feet of you. If the object is in motion, you know the
--    direction of its movement."
--   "The spell can locate a specific object known to you if you have seen
--    it up close--within 30 feet--at least once. Alternatively, the spell
--    can locate the nearest object of a particular kind..."
--   "This spell can't locate an object if any thickness of lead blocks a
--    direct path between you and the object."
--
-- Object presence, familiarity, object-kind matching, direct-path lead
-- blocking, and direction calculation are exploration/table information
-- facts. This Spell Definition preserves the SRD source facts without
-- promoting a battle-runtime world-search owner.

let searchRadiusFeet = 1000

let LocateObjectSearchModes : Type =
      { specificKnownObject : { seenUpCloseWithinFeet : Natural }
      , nearestObjectKind : Text
      }

let LocateObjectEffect : Type =
      { kind : Text
      , searchModes : LocateObjectSearchModes
      , maxDistanceFeet : Natural
      , result : Text
      , blockedBy : Text
      }

let locateObjectSubject : LocateObjectEffect =
      { kind = "object_location_sense"
      , searchModes =
          { specificKnownObject = { seenUpCloseWithinFeet = 30 }
          , nearestObjectKind = "particular_kind"
          }
      , maxDistanceFeet = searchRadiusFeet
      , result = "direction_to_location_and_movement"
      , blockedBy = "any_thickness_of_lead_direct_path"
      }

let locateObject =
      { kind = "spell"
      , id = "locate_object"
      , name = "Locate Object"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Locate Object"
          }
      , description =
          "Describe or name an object that is familiar to you. You sense the direction to the object's location if that object is within 1,000 feet of you. If the object is in motion, you know the direction of its movement. The spell can locate a specific object known to you if you have seen it up close--within 30 feet--at least once. Alternatively, the spell can locate the nearest object of a particular kind, such as a certain kind of apparel, jewelry, furniture, tool, or weapon. This spell can't locate an object if any thickness of lead blocks a direct path between you and the object."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "divination"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = Some "a forked twig" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects = [ locateObjectSubject ]
                }
              ]
          }
      }

in  locateObject
