-- Flaming Sphere — SRD 5.2.1 Spell, level 2, Conjuration.
--
-- RAW (Spells/Descriptions-E-L#Flaming Sphere):
--   "A 5-foot-diameter sphere of fire appears in an unoccupied space
--    on the ground within range and lasts for the duration."
--   "Any creature that ends its turn within 5 feet of the sphere makes
--    a Dexterity saving throw, taking 2d6 Fire damage on a failed save
--    or half as much damage on a successful one."
--   "As a Bonus Action, you can move the sphere up to 30 feet along
--    the ground. If you move the sphere into a creature's space, that
--    creature makes the save against the sphere, and the sphere stops
--    moving for the turn."
--   "When you move the sphere, you can direct it over barriers up to
--    5 feet tall and jump it across pits up to 10 feet wide."
--   "Flammable objects that aren't being worn or carried start burning
--    if touched by the sphere, and it sheds Bright Light in a 20-foot
--    radius and Dim Light for an additional 20 feet."
--   "Using a Higher-Level Spell Slot. The damage increases by 1d6 for
--    each spell slot level above 2."
--
-- Runtime profile boundary:
--   * the spell creates a Concentration-owned sphere hazard keyed by
--     caller-supplied area identity;
--   * end-turn-within-5-feet and Bonus Action ram saves consume
--     table-supplied creature/area witnesses;
--   * damage dice scale by slot level and are Fire damage with half
--     damage on a successful save;
--   * automatic space occupancy, pathfinding, barrier/pit movement,
--     object ignition, and light projection remain table/presentation
--     derivations for this support slice.

let SphereArea : Type =
      { kind : Text
      , shape : { kind : Text, radiusFeet : Double }
      , origin : { kind : Text }
      }

let AreaHole : Type =
      { kind : Text, holeId : Text, label : Text, value : SphereArea }

let DiceExpr : Type =
      { dice : Natural, dieSize : Natural, flat : Optional Natural }

let DamageAmount : Type =
      { kind : Text
      , axis : Text
      , base : DiceExpr
      , perLevel : { dice : Natural, dieSize : Natural }
      , startingAtLevel : Natural
      }

let DamageEffect : Type =
      { kind : Text, damageType : Text, amount : DamageAmount }

let ObjectFilter : Type =
      { material : Optional Text
      , heldOrWorn : Optional Text
      , manufactured : Optional Bool
      , maxSize : Optional Text
      }

let Effect : Type =
      { kind : Text
      , attachment : Optional AreaHole
      , ability : Optional Text
      , dc : Optional { kind : Text }
      , onFail : Optional DamageEffect
      , onSuccess : Optional { kind : Text }
      , maxMoveFeet : Optional Natural
      , filter : Optional ObjectFilter
      , brightRadiusFeet : Optional Natural
      , dimAdditionalFeet : Optional Natural
      }

let Trigger : Type =
      { kind : Text
      , cost : Optional { kind : Text }
      , distanceFeet : Optional Natural
      }

let fireDamage =
      { kind = "damage"
      , damageType = "fire"
      , amount =
          { kind = "linear_per_level"
          , axis = "slot"
          , base =
              { dice = 2, dieSize = 6, flat = None Natural }
          , perLevel = { dice = 1, dieSize = 6 }
          , startingAtLevel = 2
          }
      } : DamageEffect

let saveEffect =
      { kind = "save_gate"
      , attachment =
          Some
            { kind = "hole"
            , holeId = "flaming_sphere_area"
            , label = "sphere area"
            , value =
                { kind = "area"
                , shape = { kind = "sphere", radiusFeet = 2.5 }
                , origin = { kind = "point_within_range" }
                }
            }
      , ability = Some "dex"
      , dc = Some { kind = "caster_spell_save_dc" }
      , onFail = Some fireDamage
      , onSuccess = Some { kind = "half_damage" }
      , maxMoveFeet = None Natural
      , filter = None ObjectFilter
      , brightRadiusFeet = None Natural
      , dimAdditionalFeet = None Natural
      } : Effect

let repositionEffect =
      { kind = "reposition_attachment"
      , attachment = None AreaHole
      , ability = None Text
      , dc = None { kind : Text }
      , onFail = None DamageEffect
      , onSuccess = None { kind : Text }
      , maxMoveFeet = Some 30
      , filter = None ObjectFilter
      , brightRadiusFeet = None Natural
      , dimAdditionalFeet = None Natural
      } : Effect

let igniteEffect =
      { kind = "ignite_objects"
      , attachment = None AreaHole
      , ability = None Text
      , dc = None { kind : Text }
      , onFail = None DamageEffect
      , onSuccess = None { kind : Text }
      , maxMoveFeet = None Natural
      , filter =
          Some
            { material = Some "flammable"
            , heldOrWorn = Some "forbidden"
            , manufactured = None Bool
            , maxSize = None Text
            }
      , brightRadiusFeet = None Natural
      , dimAdditionalFeet = None Natural
      } : Effect

let lightEffect =
      { kind = "emit_light"
      , attachment = None AreaHole
      , ability = None Text
      , dc = None { kind : Text }
      , onFail = None DamageEffect
      , onSuccess = None { kind : Text }
      , maxMoveFeet = None Natural
      , filter = None ObjectFilter
      , brightRadiusFeet = Some 20
      , dimAdditionalFeet = Some 20
      } : Effect

let passiveTrigger =
      { kind = "passive"
      , cost = None { kind : Text }
      , distanceFeet = None Natural
      } : Trigger

let endTurnTrigger =
      { kind = "on_creature_ends_turn_within_distance_of_area"
      , cost = None { kind : Text }
      , distanceFeet = Some 5
      } : Trigger

let ramTrigger =
      { kind = "on_area_moves_into_creature_space"
      , cost = None { kind : Text }
      , distanceFeet = None Natural
      } : Trigger

let bonusActionTrigger =
      { kind = "on_caster_spends_action"
      , cost = Some { kind = "bonus_action" }
      , distanceFeet = None Natural
      } : Trigger

let flamingSphere =
      { kind = "spell"
      , id = "flaming_sphere"
      , name = "Flaming Sphere"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Flaming Sphere"
          }
      , description =
          "A 5-foot-diameter sphere of fire appears in an unoccupied space on the ground within range and lasts for the duration. A creature that ends its turn within 5 feet of the sphere makes a Dexterity saving throw, taking Fire damage on a failed save or half as much damage on a successful one. As a Bonus Action, you can move the sphere up to 30 feet along the ground; if you move it into a creature's space, that creature makes the save and the sphere stops moving for the turn. Flammable unattended objects touched by the sphere start burning, and it sheds Bright Light and Dim Light. Using a Higher-Level Spell Slot increases the damage by 1d6 for each slot level above 2."
      , mechanics =
          { family = "ongoing_effect"
          , level = 2
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components =
              { v = True
              , s = True
              , m = Some "a ball of wax"
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , attachment =
              { kind = "hole"
              , holeId = "flaming_sphere_area"
              , label = "sphere area"
              , value =
                  { kind = "area"
                  , shape = { kind = "sphere", radiusFeet = 2.5 }
                  , origin = { kind = "point_within_range" }
                  }
              }
          , operations =
              [ { trigger = endTurnTrigger
                , effect = saveEffect
                }
              , { trigger = bonusActionTrigger
                , effect = repositionEffect
                }
              , { trigger = ramTrigger
                , effect = saveEffect
                }
              , { trigger = passiveTrigger
                , effect = igniteEffect
                }
              , { trigger = passiveTrigger
                , effect = lightEffect
                }
              ]
          }
      }

in  flamingSphere
