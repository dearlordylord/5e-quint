-- Forcecage — SRD 5.2.1 Spell, level 7, Evocation.
--
-- RAW (Spells/Descriptions-E-L#Forcecage):
--   "An immobile, Invisible, Cube-shaped prison composed of magical
--    force springs into existence around an area you choose within range."
--   "The prison can be a cage or a solid box, as you choose."
--   "A creature inside the cage can't leave it by nonmagical means."
--   "If the creature tries to use teleportation or interplanar travel to
--    leave, it must first make a Charisma saving throw..."
--   "The cage also extends into the Ethereal Plane, blocking ethereal
--    travel."
--   "This spell can't be dispelled by Dispel Magic."

let ShapeOption : Type =
      { kind : Text
      , sideFeet : Optional Natural
      }

let cageShape : ShapeOption =
      { kind = "cube", sideFeet = Some 20 }

let boxShape : ShapeOption =
      { kind = "cube", sideFeet = Some 10 }

let Shape : Type =
      { kind : Text
      , options : Optional (List ShapeOption)
      , sideFeet : Optional Natural
      }

let prisonShape : Shape =
      { kind = "choice"
      , options = Some [ cageShape, boxShape ]
      , sideFeet = None Natural
      }

let Leaf : Type =
      { kind : Text
      , movementKind : Optional Text
      , distanceFeet : Optional Natural
      , maxSize : Optional Text
      , shape : Optional Shape
      , scope : Optional Text
      , spellId : Optional Text
      }

let noneLeaf =
      { movementKind = None Text
      , distanceFeet = None Natural
      , maxSize = None Text
      , shape = None Shape
      , scope = None Text
      , spellId = None Text
      }

let createPrison : Leaf =
      noneLeaf
        //  { kind = "create_object"
            , maxSize = Some "huge"
            , shape = Some prisonShape
            }

let pushPartialCreatures : Leaf =
      noneLeaf
        //  { kind = "force_move"
            , movementKind = Some "push"
            , distanceFeet = Some 5
            }

let Effect : Type =
      { kind : Text
      , movementKind : Optional Text
      , distanceFeet : Optional Natural
      , maxSize : Optional Text
      , shape : Optional Shape
      , scope : Optional Text
      , spellId : Optional Text
      , effects : Optional (List Leaf)
      , ability : Optional Text
      , dc : Optional { kind : Text }
      , onFail : Optional { kind : Text, effects : List Leaf }
      , onSuccess : Optional { kind : Text }
      }

let noneEffect =
      noneLeaf
      //  { effects = None (List Leaf)
          , ability = None Text
          , dc = None { kind : Text }
          , onFail = None { kind : Text, effects : List Leaf }
          , onSuccess = None { kind : Text }
          }

let createAndPush : Effect =
      noneEffect
        //  { kind = "composite"
            , effects = Some [ createPrison, pushPartialCreatures ]
            }

let blockNonmagicalExit : Effect =
      noneEffect
        //  { kind = "block_travel"
            , scope = Some "nonmagical_exit_from_cage"
            }

let blockSolidBoxMatter : Effect =
      noneEffect
        //  { kind = "block_travel"
            , scope = Some "matter_through_solid_box"
            }

let blockSolidBoxSpells : Effect =
      noneEffect // { kind = "block_magical_targeting_and_aoe" }

let blockEtherealTravel : Effect =
      noneEffect // { kind = "block_ethereal_travel" }

let notDispelled : Effect =
      noneEffect
        //  { kind = "cannot_be_dispelled_by_spell"
            , spellId = Some "dispel_magic"
            }

let blockMagicalEscape : Leaf =
      noneLeaf
        //  { kind = "block_travel"
            , scope = Some "magical_escape_from_cage"
            }

let wasteEscapeEffect : Leaf =
      noneLeaf // { kind = "waste_triggering_spell_or_effect" }

let escapeFail =
      { kind = "composite", effects = [ blockMagicalEscape, wasteEscapeEffect ] }

let magicalEscapeSave : Effect =
      noneEffect
        //  { kind = "save_gate"
            , ability = Some "cha"
            , dc = Some { kind = "caster_spell_save_dc" }
            , onFail = Some escapeFail
            , onSuccess = Some { kind = "none" }
            }

let prisonAttachment =
      { kind = "hole"
      , holeId = "forcecage_area"
      , label = "force prison"
      , value =
          { kind = "area"
          , shape = prisonShape
          , origin = { kind = "point_within_range" }
          }
      }

let Trigger : Type =
      { kind : Text, methods : Optional (List Text) }

let passive : Trigger =
      { kind = "passive", methods = None (List Text) }

let magicalEscapeAttempt : Trigger =
      { kind = "on_creature_attempts_magical_escape"
      , methods = Some [ "teleportation", "interplanar_travel" ]
      }

let Operation : Type = { trigger : Trigger, effect : Effect }

let forcecage =
      { kind = "spell"
      , id = "forcecage"
      , name = "Forcecage"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Forcecage"
          }
      , description =
          "An immobile, Invisible, Cube-shaped prison composed of magical force springs into existence around an area within range. The prison can be a cage or a solid box. Creatures completely inside are trapped; partial creatures or those too large are pushed away. A creature inside can't leave by nonmagical means. Teleportation or interplanar travel requires a Charisma saving throw first; on a failed save, the creature doesn't exit and wastes the spell or effect. The cage extends into the Ethereal Plane and can't be dispelled by Dispel Magic."
      , mechanics =
          { family = "ongoing_effect"
          , level = 7
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 100 }
          , components =
              { v = True
              , s = True
              , m = Some "ruby dust"
              , materialCostGp = 1500
              , materialConsumed = True
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "hour", amount = 1 }
              }
          , attachment = prisonAttachment
          , initialPhase =
              { kind = "direct"
              , attachment = prisonAttachment
              , effects = [ createAndPush ]
              }
          , operations =
              [ { trigger = passive, effect = blockNonmagicalExit }
              , { trigger = passive, effect = blockSolidBoxMatter }
              , { trigger = passive, effect = blockSolidBoxSpells }
              , { trigger = passive, effect = blockEtherealTravel }
              , { trigger = passive, effect = notDispelled }
              , { trigger = magicalEscapeAttempt, effect = magicalEscapeSave }
              ] : List Operation
          }
      }

in  forcecage
