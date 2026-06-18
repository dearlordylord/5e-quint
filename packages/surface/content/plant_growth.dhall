-- Plant Growth - SRD 5.2.1 Spell, level 3, Transmutation.
--
-- RAW (Spells/Descriptions-M-P#Plant Growth):
--   "The casting time you use determines whether the spell has the Overgrowth
--    or the Enrichment effect below."
--   Overgrowth: "All normal plants in a 100-foot-radius Sphere centered on
--    that point become thick and overgrown. A creature moving through that area
--    must spend 4 feet of movement for every 1 foot it moves. You can exclude
--    one or more areas of any size within the spell's area from being affected."
--   Enrichment: "All plants in a half-mile radius centered on a point within
--    range become enriched for 365 days. The plants yield twice the normal
--    amount of food when harvested. They can benefit from only one Plant Growth
--    per year."
--
-- Overgrowth's affected-area membership and excluded areas are table/spatial
-- facts. Enrichment's 365-day agriculture benefit and yearly limit are
-- table/economy facts. This Spell Definition records those SRD source facts
-- without adding a promoted battle-runtime owner for pathfinding, plant-world
-- state, harvest timing, or settlement economy.

let CastingTime : Type =
      { kind : Text, amount : Optional Natural, ritual : Optional Bool }

let action : CastingTime =
      { kind = "action", amount = None Natural, ritual = None Bool }

let eightHours : CastingTime =
      { kind = "hours", amount = Some 8, ritual = Some False }

let AreaShape : Type = { kind : Text, radiusFeet : Optional Natural }

let AreaExclusion : Type = { chooser : Text, count : Text, size : Text }

let Attachment : Type =
      { kind : Text
      , shape : Optional AreaShape
      , origin : Optional { kind : Text }
      , description : Optional Text
      , excludedAreas : Optional AreaExclusion
      }

let overgrowthArea : Attachment =
      { kind = "area"
      , shape = Some { kind = "sphere", radiusFeet = Some 100 }
      , origin = Some { kind = "point_within_range" }
      , description = None Text
      , excludedAreas =
          Some { chooser = "caster", count = "one_or_more", size = "any" }
      }

let enrichmentArea : Attachment =
      { kind = "area"
      , shape = Some { kind = "sphere", radiusFeet = Some 2640 }
      , origin = Some { kind = "point_within_range" }
      , description = None Text
      , excludedAreas = None AreaExclusion
      }

let Duration : Type = { unit : Text, amount : Natural }

let BenefitLimit : Type = { kind : Text }

let Effect : Type =
      { kind : Text
      , multiplier : Optional Natural
      , appliesTo : Optional Text
      , duration : Optional Duration
      , harvestYieldMultiplier : Optional Natural
      , benefitLimit : Optional BenefitLimit
      }

let overgrowthMovementCost : Effect =
      { kind = "area_movement_cost_multiplier"
      , multiplier = Some 4
      , appliesTo = Some "any_movement"
      , duration = None Duration
      , harvestYieldMultiplier = None Natural
      , benefitLimit = None BenefitLimit
      }

let enrichment : Effect =
      { kind = "plant_enrichment"
      , multiplier = None Natural
      , appliesTo = None Text
      , duration = Some { unit = "day", amount = 365 }
      , harvestYieldMultiplier = Some 2
      , benefitLimit = Some { kind = "one_application_per_year" }
      }

let ModeOption : Type =
      { id : Text
      , displayName : Text
      , castingTime : CastingTime
      , attachment : Attachment
      , effects : List Effect
      }

let plantGrowth =
      { kind = "spell"
      , id = "plant_growth"
      , name = "Plant Growth"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Plant Growth"
          }
      , description =
          "This spell channels vitality into plants. The casting time you use determines whether the spell has the Overgrowth or the Enrichment effect. Overgrowth: choose a point within range; all normal plants in a 100-foot-radius Sphere centered on that point become thick and overgrown. A creature moving through that area must spend 4 feet of movement for every 1 foot it moves. You can exclude one or more areas of any size within the spell's area from being affected. Enrichment: all plants in a half-mile radius centered on a point within range become enriched for 365 days. The plants yield twice the normal amount of food when harvested. They can benefit from only one Plant Growth per year."
      , mechanics =
          { family = "modal_activation"
          , level = 3
          , school = "transmutation"
          , range = { kind = "point", feet = 150 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , mode =
              { label = "Plant Growth casting mode"
              , options =
                  [ { id = "overgrowth"
                    , displayName = "Overgrowth"
                    , castingTime = action
                    , attachment = overgrowthArea
                    , effects = [ overgrowthMovementCost ]
                    }
                  , { id = "enrichment"
                    , displayName = "Enrichment"
                    , castingTime = eightHours
                    , attachment = enrichmentArea
                    , effects = [ enrichment ]
                    }
                  ] : List ModeOption
              }
          }
      }

in  plantGrowth
