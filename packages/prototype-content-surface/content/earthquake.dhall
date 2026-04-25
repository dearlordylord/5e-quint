-- Earthquake — SRD 5.2.1 Spell, level 8, Transmutation.
--
-- RAW (Spells/Descriptions-E-L#Earthquake):
--   "For the duration, an intense tremor rips through the ground in a
--    100-foot-radius circle centered on that point. The ground there
--    is Difficult Terrain."
--   "When you cast this spell and at the end of each of your turns for
--    the duration, each creature on the ground in the area makes a
--    Dexterity saving throw. On a failed save, a creature has the Prone
--    condition, and its Concentration is broken."
--   "The tremor deals 50 Bludgeoning damage to any structure in contact
--    with the ground in the area when you cast the spell and at the end
--    of each of your turns until the spell ends. If a structure drops
--    to 0 Hit Points, it collapses."
--   "A creature within a distance from a collapsing structure equal to
--    half the structure's height makes a Dexterity saving throw. On a
--    failed save, the creature takes 12d6 Bludgeoning damage, has the
--    Prone condition, and is buried in the rubble, requiring a DC 20
--    Strength (Athletics) check as an action to escape."
--
-- PARTIAL: fissure placement/depth and edge movement are deferred.
-- They need a richer spatial line-hazard/fissure surface. Structure
-- damage on initial cast is represented by the passive structure bundle;
-- recurring end-turn structure damage is explicit.

let DiceAmount : Type =
      { kind : Text, expr : { dice : Natural, dieSize : Natural, flat : Natural } }

let Escape : Type =
      { kind : Text, ability : Text, skill : Text, dc : Natural, action : Text }

let Leaf : Type =
      { kind : Text
      , condition : Optional Text
      , amount : Optional DiceAmount
      , damageType : Optional Text
      , structureContact : Optional Text
      , trigger : Optional Text
      , escape : Optional Escape
      }

let Outcome : Type =
      { kind : Text
      , condition : Optional Text
      , amount : Optional DiceAmount
      , damageType : Optional Text
      , structureContact : Optional Text
      , trigger : Optional Text
      , escape : Optional Escape
      , effects : Optional (List Leaf)
      }

let Effect : Type =
      { kind : Text
      , condition : Optional Text
      , amount : Optional DiceAmount
      , damageType : Optional Text
      , structureContact : Optional Text
      , trigger : Optional Text
      , escape : Optional Escape
      , effects : Optional (List Leaf)
      , ability : Optional Text
      , dc : Optional { kind : Text }
      , onFail : Optional Outcome
      , onSuccess : Optional Outcome
      }

let noneLeaf =
      { condition = None Text
      , amount = None DiceAmount
      , damageType = None Text
      , structureContact = None Text
      , trigger = None Text
      , escape = None Escape
      }

let proneLeaf : Leaf =
      noneLeaf // { kind = "apply_condition", condition = Some "prone" }

let breakConcentrationLeaf : Leaf =
      noneLeaf // { kind = "break_concentration" }

let structureDamageLeaf : Leaf =
      noneLeaf
        //  { kind = "damage_structure"
            , amount =
                Some
                  { kind = "fixed"
                  , expr = { dice = 0, dieSize = 1, flat = 50 }
                  }
            , damageType = Some "bludgeoning"
            , structureContact = Some "ground_in_area"
            }

let collapseStructureLeaf : Leaf =
      noneLeaf
        //  { kind = "collapse_structure"
            , trigger = Some "structure_drops_to_0_hp"
            }

let collapseDamageLeaf : Leaf =
      noneLeaf
        //  { kind = "damage"
            , amount =
                Some
                  { kind = "fixed"
                  , expr = { dice = 12, dieSize = 6, flat = 0 }
                  }
            , damageType = Some "bludgeoning"
            }

let buryLeaf : Leaf =
      noneLeaf
        //  { kind = "bury_in_rubble"
            , escape =
                Some
                  { kind = "ability_check"
                  , ability = "str"
                  , skill = "athletics"
                  , dc = 20
                  , action = "action"
                  }
            }

let tremorFail : Outcome =
      { kind = "composite"
      , condition = None Text
      , amount = None DiceAmount
      , damageType = None Text
      , structureContact = None Text
      , trigger = None Text
      , escape = None Escape
      , effects = Some [ proneLeaf, breakConcentrationLeaf ]
      }

let noneOutcome : Outcome =
      { kind = "none"
      , condition = None Text
      , amount = None DiceAmount
      , damageType = None Text
      , structureContact = None Text
      , trigger = None Text
      , escape = None Escape
      , effects = None (List Leaf)
      }

let halfDamageOutcome : Outcome = noneOutcome // { kind = "half_damage" }

let collapseFail : Outcome =
      { kind = "composite"
      , condition = None Text
      , amount = None DiceAmount
      , damageType = None Text
      , structureContact = None Text
      , trigger = None Text
      , escape = None Escape
      , effects = Some [ collapseDamageLeaf, proneLeaf, buryLeaf ]
      }

let difficultTerrain : Effect =
      noneOutcome
        //  { kind = "area_is_difficult_terrain"
            , ability = None Text
            , dc = None { kind : Text }
            , onFail = None Outcome
            , onSuccess = None Outcome
            }

let structureBundle : Effect =
      noneOutcome
        //  { kind = "composite"
            , effects = Some [ structureDamageLeaf, collapseStructureLeaf ]
            , ability = None Text
            , dc = None { kind : Text }
            , onFail = None Outcome
            , onSuccess = None Outcome
            }

let tremorSave : Effect =
      noneOutcome
        //  { kind = "save_gate"
            , ability = Some "dex"
            , dc = Some { kind = "caster_spell_save_dc" }
            , onFail = Some tremorFail
            , onSuccess = Some noneOutcome
            }

let collapseSave : Effect =
      noneOutcome
        //  { kind = "save_gate"
            , ability = Some "dex"
            , dc = Some { kind = "caster_spell_save_dc" }
            , onFail = Some collapseFail
            , onSuccess = Some halfDamageOutcome
            }

let quakeArea =
      { kind = "hole"
      , holeId = "earthquake_ground_area"
      , label = "ground tremor area"
      , value =
          { kind = "area"
          , shape = { kind = "circle", radiusFeet = 100 }
          , origin = { kind = "point_within_range" }
          }
      }

let Trigger : Type = { kind : Text, affectedWithin : Optional Text }

let passive : Trigger =
      { kind = "passive", affectedWithin = None Text }

let casterTurnEnd : Trigger =
      { kind = "on_caster_turn_end", affectedWithin = None Text }

let structureCollapses : Trigger =
      { kind = "on_structure_collapses"
      , affectedWithin = Some "half_structure_height"
      }

let Operation : Type = { trigger : Trigger, effect : Effect }

let earthquake =
      { kind = "spell"
      , id = "earthquake"
      , name = "Earthquake"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Earthquake"
          }
      , description =
          "Choose a point on the ground within range. For the duration, an intense tremor rips through the ground in a 100-foot-radius circle centered on that point, and the ground there is Difficult Terrain. When you cast the spell and at the end of each of your turns, each creature on the ground in the area makes a Dexterity saving throw. On a failed save, it has the Prone condition and its Concentration is broken. The tremor damages structures in contact with the ground in the area; structures that drop to 0 Hit Points collapse. Creatures near a collapsing structure make a Dexterity saving throw or take 12d6 Bludgeoning damage, fall Prone, and are buried in rubble."
      , mechanics =
          { family = "ongoing_effect"
          , level = 8
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 500 }
          , components = { v = True, s = True, m = Some "a fractured rock" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , attachment = quakeArea
          , initialPhase =
              { kind = "save_gate"
              , attachment = quakeArea
              , ability = "dex"
              , dc = { kind = "caster_spell_save_dc" }
              , onFail = tremorFail
              , onSuccess = { kind = "none" }
              }
          , operations =
              [ { trigger = passive, effect = difficultTerrain }
              , { trigger = passive, effect = structureBundle }
              , { trigger = casterTurnEnd, effect = tremorSave }
              , { trigger = casterTurnEnd, effect = structureBundle }
              , { trigger = structureCollapses, effect = collapseSave }
              ] : List Operation
          }
      }

in  earthquake
