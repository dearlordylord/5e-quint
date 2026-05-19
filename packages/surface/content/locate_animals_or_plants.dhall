-- Locate Animals or Plants - SRD 5.2.1 Spell, level 2, Divination.
--
-- RAW (Spells/Descriptions-E-L#Locate Animals or Plants):
--   "Describe or name a specific kind of Beast, Plant creature, or
--    nonmagical plant."
--   "You learn the direction and distance to the closest creature or plant
--    of that kind within 5 miles, if any are present."
--
-- Target presence, kind matching, closest-target selection, and direction /
-- distance calculation are exploration/table information facts. This Spell
-- Definition preserves the SRD source facts without promoting a battle-runtime
-- world-search owner.

let searchRadiusFeet = 26400

let LocateKindEffect : Type =
      { kind : Text
      , subjectKinds : List Text
      , maxDistanceFeet : Natural
      , match : Text
      , query : Text
      , result : Text
      }

let locateAnimalsOrPlantsKind : LocateKindEffect =
      { kind = "locate_kind"
      , subjectKinds = [ "beast", "plant_creature", "nonmagical_plant" ]
      , maxDistanceFeet = searchRadiusFeet
      , match = "closest"
      , query = "described_or_named_specific_kind"
      , result = "direction_and_distance"
      }

let locateAnimalsOrPlants =
      { kind = "spell"
      , id = "locate_animals_or_plants"
      , name = "Locate Animals or Plants"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Locate Animals or Plants"
          }
      , description =
          "Describe or name a specific kind of Beast, Plant creature, or nonmagical plant. You learn the direction and distance to the closest creature or plant of that kind within 5 miles, if any are present."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "divination"
          , castingTime = { kind = "action", ritual = True }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = Some "fur from a bloodhound" }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects = [ locateAnimalsOrPlantsKind ]
                }
              ]
          }
      }

in  locateAnimalsOrPlants
