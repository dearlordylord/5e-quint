-- Conjure Animals — SRD 5.2.1 Spell, Level 3, Conjuration.
--
-- RAW (Spells/Descriptions-A-D#Conjure Animals):
--   "You conjure nature spirits that appear as a Large pack of
--    spectral, intangible animals in an unoccupied space you can see
--    within range."
--   "You have Advantage on Strength saving throws while you're within
--    5 feet of the pack, and when you move on your turn, you can also
--    move the pack up to 30 feet to an unoccupied space you can see."
--   "Whenever the pack moves within 10 feet of a creature you can see
--    and whenever a creature you can see enters a space within 10 feet
--    of the pack or ends its turn there, you can force that creature
--    to make a Dexterity saving throw. On a failed save, the creature
--    takes 3d10 Slashing damage. A creature makes this save only once
--    per turn."
--   "Using a Higher-Level Spell Slot. The damage increases by 1d10
--    for each spell slot level above 3."
--
-- Surface lifecycle modeled here:
--   * Spell-created spatial manifestation, not a companion creature:
--     Large spectral intangible animal pack, caster-chosen animal form,
--     placed in a visible unoccupied space within range.
--   * Passive Strength Saving Throw Advantage while the caster is within
--     5 feet of the pack.
--   * Caster-turn movement hook that repositions the pack up to 30 feet
--     to a visible unoccupied space, distinct from ordinary creature
--     movement or companion control.
--   * Optional Dexterity Saving Throw damage trigger for caster-visible
--     creatures when the pack moves within 10 feet, a creature enters
--     within 10 feet, or a creature ends its turn there.
--   * Shared once-per-turn-per-creature limiter across all three save
--     triggers, encoded by one limitGroup.
--
-- Battle-runtime execution remains a future pack Spell Effect owner:
-- consumers must project these typed Surface facts rather than branch on
-- the authored spell id or name.

let DiceAmount : Type =
      { kind : Text
      , axis : Text
      , base : { dice : Natural, dieSize : Natural }
      , perLevel : { dice : Natural }
      , startingAtLevel : Natural
      }

let slashingDamageAmount : DiceAmount =
      { kind = "linear_per_level"
      , axis = "slot"
      , base = { dice = 3, dieSize = 10 }
      , perLevel = { dice = 1 }
      , startingAtLevel = 3
      }

let DamageEffect : Type =
      { kind : Text
      , damageType : Text
      , amount : DiceAmount
      }

let slashingDamage : DamageEffect =
      { kind = "damage"
      , damageType = "slashing"
      , amount = slashingDamageAmount
      }

let PackManifestation =
      { kind = "hole"
      , holeId = "conjure_animals_pack"
      , label = "Large spectral intangible animal pack"
      , value =
          { kind = "spell_spatial_manifestation"
          , manifestation =
              { creatureSize = "large"
              , appearance = "spectral_animals_pack"
              , tangibility = "intangible"
              , formChoice = { chooser = "caster", domain = "animal_form" }
              }
          , placement =
              { kind = "visible_unoccupied_space_within_range"
              , chooser = "caster"
              }
          }
      }

let SaveApplication : Type = { kind : Text }

let RepositionDestination : Type = { kind : Text, chooser : Text }

let OngoingEffect : Type =
      { kind : Text
      , mode : Optional Text
      , affects : Optional Text
      , on : Optional (List Text)
      , saveAbilityFilter : Optional (List Text)
      , maxMoveFeet : Optional Natural
      , destination : Optional RepositionDestination
      , ability : Optional Text
      , dc : Optional { kind : Text }
      , onFail : Optional DamageEffect
      , onSuccess : Optional { kind : Text }
      , saveApplication : Optional SaveApplication
      }

let noneText = None Text
let noneTexts = None (List Text)
let noneNatural = None Natural
let noneDestination = None RepositionDestination
let noneDc = None { kind : Text }
let noneDamage = None DamageEffect
let noneSuccess = None { kind : Text }
let noneSaveApplication = None SaveApplication

let strengthSaveAdvantage : OngoingEffect =
      { kind = "modify_roll_advantage"
      , mode = Some "advantage"
      , affects = Some "self_roll"
      , on = Some [ "saving_throw" ]
      , saveAbilityFilter = Some [ "str" ]
      , maxMoveFeet = noneNatural
      , destination = noneDestination
      , ability = noneText
      , dc = noneDc
      , onFail = noneDamage
      , onSuccess = noneSuccess
      , saveApplication = noneSaveApplication
      }

let repositionPack : OngoingEffect =
      { kind = "reposition_attachment"
      , mode = noneText
      , affects = noneText
      , on = noneTexts
      , saveAbilityFilter = noneTexts
      , maxMoveFeet = Some 30
      , destination =
          Some { kind = "visible_unoccupied_space", chooser = "caster" }
      , ability = noneText
      , dc = noneDc
      , onFail = noneDamage
      , onSuccess = noneSuccess
      , saveApplication = noneSaveApplication
      }

let dexteritySaveDamage : OngoingEffect =
      { kind = "save_gate"
      , mode = noneText
      , affects = noneText
      , on = noneTexts
      , saveAbilityFilter = noneTexts
      , maxMoveFeet = noneNatural
      , destination = noneDestination
      , ability = Some "dex"
      , dc = Some { kind = "caster_spell_save_dc" }
      , onFail = Some slashingDamage
      , onSuccess = Some { kind = "none" }
      , saveApplication = Some { kind = "caster_may_force_target_save" }
      }

let Trigger : Type =
      { kind : Text
      , distanceFeet : Optional Natural
      , requiresVisibleCreature : Optional Bool
      }

let passive : Trigger =
      { kind = "passive"
      , distanceFeet = noneNatural
      , requiresVisibleCreature = None Bool
      }

let casterMovesOnTurn : Trigger =
      { kind = "on_caster_moves_on_turn"
      , distanceFeet = noneNatural
      , requiresVisibleCreature = None Bool
      }

let packMovesWithin10Feet : Trigger =
      { kind = "on_spatial_manifestation_moves_within_distance_of_creature"
      , distanceFeet = Some 10
      , requiresVisibleCreature = Some True
      }

let creatureEntersWithin10Feet : Trigger =
      { kind = "on_creature_enters_distance_of_spatial_manifestation"
      , distanceFeet = Some 10
      , requiresVisibleCreature = Some True
      }

let creatureEndsTurnWithin10Feet : Trigger =
      { kind = "on_creature_ends_turn_within_distance_of_spatial_manifestation"
      , distanceFeet = Some 10
      , requiresVisibleCreature = Some True
      }

let Predicate : Type =
      { kind : Text
      , feet : Optional Natural
      }

let casterWithin5Feet : Predicate =
      { kind = "caster_within_feet_of_attachment"
      , feet = Some 5
      }

let UsageLimit : Type = { kind : Text, limitGroup : Optional Text }

let sharedSaveOncePerTurn =
      Some
        { kind = "once_per_turn"
        , limitGroup = Some "conjure_animals_save_per_turn"
        }

let noPredicate = None Predicate
let noLimit = None UsageLimit

let Operation : Type =
      { trigger : Trigger
      , predicate : Optional Predicate
      , effect : OngoingEffect
      , usageLimit : Optional UsageLimit
      }

let conjureAnimals =
      { kind = "spell"
      , id = "conjure_animals"
      , name = "Conjure Animals"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Conjure Animals"
          }
      , description =
          "You conjure nature spirits that appear as a Large pack of spectral, intangible animals in an unoccupied space you can see within range. The pack lasts for the duration, and you choose the spirits' animal form. You have Advantage on Strength saving throws while you're within 5 feet of the pack, and when you move on your turn, you can also move the pack up to 30 feet to an unoccupied space you can see. Whenever the pack moves within 10 feet of a creature you can see and whenever a creature you can see enters a space within 10 feet of the pack or ends its turn there, you can force that creature to make a Dexterity saving throw. On a failed save, the creature takes 3d10 Slashing damage. A creature makes this save only once per turn. Using a Higher-Level Spell Slot. The damage increases by 1d10 for each spell slot level above 3."
      , mechanics =
          { family = "ongoing_effect"
          , level = 3
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , attachment = PackManifestation
          , operations =
              [ { trigger = passive
                , predicate = Some casterWithin5Feet
                , effect = strengthSaveAdvantage
                , usageLimit = noLimit
                }
              , { trigger = casterMovesOnTurn
                , predicate = noPredicate
                , effect = repositionPack
                , usageLimit = noLimit
                }
              , { trigger = packMovesWithin10Feet
                , predicate = noPredicate
                , effect = dexteritySaveDamage
                , usageLimit = sharedSaveOncePerTurn
                }
              , { trigger = creatureEntersWithin10Feet
                , predicate = noPredicate
                , effect = dexteritySaveDamage
                , usageLimit = sharedSaveOncePerTurn
                }
              , { trigger = creatureEndsTurnWithin10Feet
                , predicate = noPredicate
                , effect = dexteritySaveDamage
                , usageLimit = sharedSaveOncePerTurn
                }
              ] : List Operation
          }
      }

in  conjureAnimals
