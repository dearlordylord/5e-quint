-- Web — SRD 5.2.1 Spell, Level 2, Conjuration.
--
-- RAW trace:
--   .references/srd-5.2.1/Spells/Descriptions-S-Z.md:1266-1269
--     Action casting, 60-foot range, V/S/M spiderweb component, and
--     Concentration up to 1 hour.
--   .references/srd-5.2.1/Spells/Descriptions-S-Z.md:1271
--     point-origin 20-foot Cube, Difficult Terrain, Lightly Obscured.
--   .references/srd-5.2.1/Spells/Descriptions-S-Z.md:1273
--     two-solid-mass anchoring or floor/wall/ceiling layering, collapse
--     at the start of the caster's next turn when unmet, and 5-foot
--     depth over a flat surface.
--   .references/srd-5.2.1/Spells/Descriptions-S-Z.md:1275-1277
--     first-entry-on-a-turn and turn-start Dexterity Saving Throws,
--     failed-save Restrained lifecycle, and action Strength (Athletics)
--     escape against the caster Spell Save DC.
--   .references/srd-5.2.1/Spells/Descriptions-S-Z.md:1279
--     fire-exposed 5-foot Cube burn-away after 1 round and 2d4 Fire
--     damage to creatures that start turns in the fire.

let DcSource : Type = { kind : Text }

let casterSpellSaveDc : DcSource = { kind = "caster_spell_save_dc" }

let DiceAmount : Type =
      { kind : Text, expr : Optional { dice : Natural, dieSize : Natural } }

let fixedDice =
      \(dice : Natural) ->
      \(dieSize : Natural) ->
        { kind = "fixed", expr = Some { dice, dieSize } }

let Duration : Type = { unit : Text, amount : Natural }

let AreaSection : Type = { kind : Text, sideFeet : Natural }

let AnchorRequirement : Type = { kind : Text, count : Natural }

let LayeringRequirement : Type =
      { kind : Text, surfaces : List Text, flatSurfaceDepthFeet : Natural }

let UnmetAnchorOutcome : Type = { kind : Text, timing : Text }

let FireStartTurnDamage : Type =
      { damageType : Text, amount : DiceAmount }

let EffectAtom : Type =
      { kind : Text
      , condition : Optional Text
      , anchor : Optional AnchorRequirement
      , layering : Optional LayeringRequirement
      , unmetOutcome : Optional UnmetAnchorOutcome
      , section : Optional AreaSection
      , exposure : Optional Text
      , burnsAwayAfter : Optional Duration
      , creatureStartsTurnInFireDamage : Optional FireStartTurnDamage
      }

let noneAtom : EffectAtom =
      { kind = "none"
      , condition = None Text
      , anchor = None AnchorRequirement
      , layering = None LayeringRequirement
      , unmetOutcome = None UnmetAnchorOutcome
      , section = None AreaSection
      , exposure = None Text
      , burnsAwayAfter = None Duration
      , creatureStartsTurnInFireDamage = None FireStartTurnDamage
      }

let areaIsDifficultTerrain : EffectAtom =
      noneAtom // { kind = "area_is_difficult_terrain" }

let areaIsLightlyObscured : EffectAtom =
      noneAtom // { kind = "area_is_lightly_obscured" }

let anchorOrLayeringRequirement : EffectAtom =
      noneAtom
        //  { kind = "area_anchor_or_layering_requirement"
            , anchor = Some { kind = "between_solid_masses", count = 2 }
            , layering =
                Some
                  { kind = "across_surface"
                  , surfaces = [ "floor", "wall", "ceiling" ]
                  , flatSurfaceDepthFeet = 5
                  }
            , unmetOutcome =
                Some
                  { kind = "collapse_and_end_effect"
                  , timing = "start_of_caster_next_turn"
                  }
            }

let burnAwayWhenExposedToFire : EffectAtom =
      noneAtom
        //  { kind = "area_section_burns_away"
            , section = Some { kind = "cube", sideFeet = 5 }
            , exposure = Some "fire"
            , burnsAwayAfter = Some { unit = "round", amount = 1 }
            , creatureStartsTurnInFireDamage =
                Some { damageType = "fire", amount = fixedDice 2 4 }
            }

let restrainedWhileInAreaOrUntilEscape : EffectAtom =
      noneAtom
        //  { kind = "apply_condition_while_in_area_or_until_escape"
            , condition = Some "restrained"
            }

let removeRestrained : EffectAtom =
      noneAtom // { kind = "remove_condition", condition = Some "restrained" }

let Effect : Type =
      { kind : Text
      , ability : Optional Text
      , skill : Optional Text
      , dc : Optional DcSource
      , onFail : Optional EffectAtom
      , onSuccess : Optional EffectAtom
      , onPass : Optional EffectAtom
      , condition : Optional Text
      , anchor : Optional AnchorRequirement
      , layering : Optional LayeringRequirement
      , unmetOutcome : Optional UnmetAnchorOutcome
      , section : Optional AreaSection
      , exposure : Optional Text
      , burnsAwayAfter : Optional Duration
      , creatureStartsTurnInFireDamage : Optional FireStartTurnDamage
      }

let atomEffect =
      \(atom : EffectAtom) ->
        { kind = atom.kind
        , ability = None Text
        , skill = None Text
        , dc = None DcSource
        , onFail = None EffectAtom
        , onSuccess = None EffectAtom
        , onPass = None EffectAtom
        , condition = atom.condition
        , anchor = atom.anchor
        , layering = atom.layering
        , unmetOutcome = atom.unmetOutcome
        , section = atom.section
        , exposure = atom.exposure
        , burnsAwayAfter = atom.burnsAwayAfter
        , creatureStartsTurnInFireDamage =
            atom.creatureStartsTurnInFireDamage
        }

let webDexteritySave : Effect =
      atomEffect noneAtom
        //  { kind = "save_gate"
            , ability = Some "dex"
            , dc = Some casterSpellSaveDc
            , onFail = Some restrainedWhileInAreaOrUntilEscape
            , onSuccess = Some noneAtom
            }

let webEscapeCheck : Effect =
      atomEffect noneAtom
        //  { kind = "ability_check_gate"
            , ability = Some "str"
            , skill = Some "athletics"
            , dc = Some casterSpellSaveDc
            , onPass = Some removeRestrained
            }

let webArea =
      { kind = "hole"
      , holeId = "web_point"
      , label = "spell origin point"
      , value =
          { kind = "area"
          , shape = { kind = "cube", sideFeet = 20 }
          , origin = { kind = "point_within_range" }
          }
      }

let ActionCost : Type = { kind : Text }

let Trigger : Type = { kind : Text, cost : Optional ActionCost }

let passive : Trigger = { kind = "passive", cost = None ActionCost }

let Predicate : Type = { kind : Text, condition : Optional Text }

let hasRestrainedCondition : Predicate =
      { kind = "has_condition", condition = Some "restrained" }

let UsageLimit : Type = { kind : Text }

let Operation : Type =
      { trigger : Trigger
      , predicate : Optional Predicate
      , effect : Effect
      , usageLimit : Optional UsageLimit
      }

let passiveOperation =
      \(effect : Effect) ->
        { trigger = passive
        , predicate = None Predicate
        , effect
        , usageLimit = None UsageLimit
        }

let web =
      { kind = "spell"
      , id = "web"
      , name = "Web"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Web"
          }
      , description =
          "You conjure a mass of sticky webbing at a point within range. The webs fill a 20-foot Cube there for the duration. The webs are Difficult Terrain, and the area within them is Lightly Obscured. If the webs aren't anchored between two solid masses or layered across a floor, wall, or ceiling, the web collapses on itself, and the spell ends at the start of your next turn. Webs layered over a flat surface have a depth of 5 feet. The first time a creature enters the webs on a turn or starts its turn there, it must succeed on a Dexterity saving throw or have the Restrained condition while in the webs or until it breaks free. A creature Restrained by the webs can take an action to make a Strength (Athletics) check against your spell save DC; on success it is no longer Restrained. The webs are flammable. Any 5-foot Cube of webs exposed to fire burns away in 1 round, dealing 2d4 Fire damage to any creature that starts its turn in the fire."
      , mechanics =
          { family = "ongoing_effect"
          , level = 2
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = True, m = Some "a bit of spiderweb" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "hour", amount = 1 }
              }
          , attachment = webArea
          , operations =
              [ passiveOperation (atomEffect areaIsDifficultTerrain)
              , passiveOperation (atomEffect areaIsLightlyObscured)
              , passiveOperation (atomEffect anchorOrLayeringRequirement)
              , passiveOperation (atomEffect burnAwayWhenExposedToFire)
              , { trigger =
                    { kind = "on_creature_enters_area"
                    , cost = None ActionCost
                    }
                , predicate = None Predicate
                , effect = webDexteritySave
                , usageLimit = Some { kind = "once_per_turn" }
                }
              , { trigger =
                    { kind = "on_creature_starts_turn_in_area"
                    , cost = None ActionCost
                    }
                , predicate = None Predicate
                , effect = webDexteritySave
                , usageLimit = None UsageLimit
                }
              , { trigger =
                    { kind = "on_affected_creature_spends_action"
                    , cost = Some { kind = "action" }
                    }
                , predicate = Some hasRestrainedCondition
                , effect = webEscapeCheck
                , usageLimit = None UsageLimit
                }
              ] : List Operation
          }
      }

in  web
