-- Telekinesis — SRD 5.2.1 Spell, level 5, Transmutation.

let Leaf : Type =
      { kind : Text
      , condition : Optional Text
      , movementKind : Optional Text
      , direction : Optional Text
      , distanceFeet : Optional Natural
      , maxDistanceFeet : Optional Natural
      , until : Optional Text
      }

let noneLeaf =
      { condition = None Text
      , movementKind = None Text
      , direction = None Text
      , distanceFeet = None Natural
      , maxDistanceFeet = None Natural
      , until = None Text
      }

let moveCreature =
      noneLeaf
        //  { kind = "force_move"
            , movementKind = Some "move"
            , direction = Some "any_direction"
            , distanceFeet = Some 30
            }

let restrained =
      noneLeaf // { kind = "apply_condition", condition = Some "restrained" }

let suspended =
      noneLeaf // { kind = "suspend_target", until = Some "end_of_next_turn" }

let fallIfNotReapplied =
      noneLeaf // { kind = "fall_at_end_of_next_turn_unless_reapplied" }

let moveObject =
      noneLeaf // { kind = "move_object", maxDistanceFeet = Some 30 }

let pullObjectAway =
      noneLeaf // { kind = "pull_object_away", maxDistanceFeet = Some 30 }

let manipulateObject =
      noneLeaf // { kind = "manipulate_object" }

let Outcome : Type =
      { kind : Text
      , condition : Optional Text
      , movementKind : Optional Text
      , direction : Optional Text
      , distanceFeet : Optional Natural
      , maxDistanceFeet : Optional Natural
      , until : Optional Text
      , effects : Optional (List Leaf)
      }

let noneOutcome =
      noneLeaf // { effects = None (List Leaf) }

let composite =
      \(effects : List Leaf) ->
        noneOutcome // { kind = "composite", effects = Some effects }

let ModeEffect : Type =
      { kind : Text
      , condition : Optional Text
      , movementKind : Optional Text
      , direction : Optional Text
      , distanceFeet : Optional Natural
      , maxDistanceFeet : Optional Natural
      , until : Optional Text
      , effects : Optional (List Leaf)
      , ability : Optional Text
      , dc : Optional { kind : Text }
      , onFail : Optional Outcome
      , onSuccess : Optional { kind : Text }
      }

let noneMode =
      noneOutcome
      //  { ability = None Text
          , dc = None { kind : Text }
          , onFail = None Outcome
          , onSuccess = None { kind : Text }
          }

let creatureSave : ModeEffect =
      noneMode
        //  { kind = "save_gate"
            , ability = Some "str"
            , dc = Some { kind = "caster_spell_save_dc" }
            , onFail =
                Some
                  (composite
                    [ moveCreature, restrained, suspended, fallIfNotReapplied ])
            , onSuccess = Some { kind = "none" }
            }

let unattendedObject : ModeEffect = noneMode // moveObject

let wornObjectSave : ModeEffect =
      noneMode
        //  { kind = "save_gate"
            , ability = Some "str"
            , dc = Some { kind = "caster_spell_save_dc" }
            , onFail = Some (composite [ pullObjectAway, moveObject ])
            , onSuccess = Some { kind = "none" }
            }

let fineControl : ModeEffect = noneMode // manipulateObject

let ChoiceEffect : Type =
      { kind : Text
      , label : Text
      , options :
          List
            { id : Text
            , displayName : Text
            , effects : List ModeEffect
            }
      }

let telekineticChoice : ChoiceEffect =
      { kind = "choose_effect_mode"
      , label = "telekinetic exertion"
      , options =
          [ { id = "creature"
            , displayName = "Huge or smaller creature"
            , effects = [ creatureSave ]
            }
          , { id = "unattended_object"
            , displayName = "Huge or smaller unattended object"
            , effects = [ unattendedObject ]
            }
          , { id = "worn_or_carried_object"
            , displayName = "Huge or smaller worn or carried object"
            , effects = [ wornObjectSave ]
            }
          , { id = "fine_object_control"
            , displayName = "fine object control"
            , effects = [ fineControl ]
            }
          ]
      }

let telekinesisTarget =
      { kind = "hole"
      , holeId = "telekinesis_target"
      , label = "creature or object"
      , value = { kind = "target", selection = { mode = "one" } }
      }

let Trigger : Type =
      { kind : Text, cost : Optional { kind : Text, action : Text } }

let effectStarts : Trigger =
      { kind = "on_effect_starts", cost = None { kind : Text, action : Text } }

let magicAction : Trigger =
      { kind = "on_caster_spends_action"
      , cost = Some { kind = "standard_action", action = "magic" }
      }

let Operation : Type = { trigger : Trigger, effect : ChoiceEffect }

let telekinesis =
      { kind = "spell"
      , id = "telekinesis"
      , name = "Telekinesis"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Telekinesis"
          }
      , description =
          "When you cast the spell and as a Magic action on later turns, you can exert your will on one creature or object you can see within range. A Huge or smaller creature makes a Strength saving throw; on a failure you move it up to 30 feet in any direction, it has the Restrained condition until the end of your next turn, and if lifted it is suspended and later falls unless this option is used again and it fails the save. A Huge or smaller unattended object can be moved up to 30 feet. A worn or carried object is pulled away and moved on a failed Strength save by the carrier. You can also exert fine control on objects."
      , mechanics =
          { family = "ongoing_effect"
          , level = 5
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , attachment = telekinesisTarget
          , operations =
              [ { trigger = effectStarts, effect = telekineticChoice }
              , { trigger = magicAction, effect = telekineticChoice }
              ] : List Operation
          }
      }

in  telekinesis
