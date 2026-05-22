-- Spiritual Weapon — SRD 5.2.1 Spell, level 2, Evocation.
--
-- RAW (Spells/Descriptions-S-Z#Spiritual Weapon):
--   "You create a floating, spectral force that resembles a weapon"
--   "you can immediately make one melee spell attack against one
--    creature within 5 feet of the force"
--   "As a Bonus Action on your later turns, you can move the force up
--    to 20 feet and repeat the attack"
--   "Using a Higher-Level Spell Slot. The damage increases by 1d8 for
--    every slot level above 2."

let DiceExpr : Type =
      { dice : Natural
      , dieSize : Natural
      , spellcastingMod : Optional Bool
      }

let DiceExprDelta : Type = { dice : Natural, dieSize : Optional Natural }

let DiceAmount : Type =
      { kind : Text
      , expr : Optional DiceExpr
      , axis : Optional Text
      , base : Optional DiceExpr
      , perLevel : Optional DiceExprDelta
      , startingAtLevel : Optional Natural
      }

let DamageEffect : Type =
      { kind : Text
      , damageType : Optional Text
      , amount : Optional DiceAmount
      }

let noEffect : DamageEffect =
      { kind = "none"
      , damageType = None Text
      , amount = None DiceAmount
      }

let forceDamage : DamageEffect =
      { kind = "damage"
      , damageType = Some "force"
      , amount =
          Some
            { kind = "linear_per_level"
            , expr = None DiceExpr
            , axis = Some "slot"
            , base =
                Some
                  { dice = 1
                  , dieSize = 8
                  , spellcastingMod = Some True
                  }
            , perLevel = Some { dice = 1, dieSize = Some 8 }
            , startingAtLevel = Some 2
            }
      }

let forceHoleId = "spiritual_weapon_force"

let TargetRelativePosition : Type =
      { kind : Text, attachmentHoleId : Text, feet : Natural }

let targetWithinForceReach : TargetRelativePosition =
      { kind = "within_feet_of_attachment"
      , attachmentHoleId = forceHoleId
      , feet = 5
      }

let TargetSelection : Type =
      { mode : Text
      , targetKinds : Optional (List Text)
      , relativePosition : Optional TargetRelativePosition
      }

let AttackTargetAttachmentValue : Type =
      { kind : Text, selection : TargetSelection }

let AttackTargetAttachment : Type =
      { kind : Text
      , holeId : Text
      , label : Text
      , value : AttackTargetAttachmentValue
      }

let forceAttackTarget : AttackTargetAttachment =
      { kind = "hole"
      , holeId = "spiritual_weapon_attack_target"
      , label = "creature within 5 feet of the force"
      , value =
          { kind = "target"
          , selection =
              { mode = "one"
              , targetKinds = Some [ "creature" ]
              , relativePosition = Some targetWithinForceReach
              }
          }
      }

let OngoingChildEffect : Type =
      { kind : Text
      , maxMoveFeet : Optional Natural
      , attachment : Optional AttackTargetAttachment
      , attackKind : Optional Text
      , onHit : Optional (List DamageEffect)
      , onMiss : Optional (List DamageEffect)
      }

let moveForce : OngoingChildEffect =
      { kind = "reposition_attachment"
      , maxMoveFeet = Some 20
      , attachment = None AttackTargetAttachment
      , attackKind = None Text
      , onHit = None (List DamageEffect)
      , onMiss = None (List DamageEffect)
      }

let repeatAttack : OngoingChildEffect =
      { kind = "attack_roll"
      , maxMoveFeet = None Natural
      , attachment = Some forceAttackTarget
      , attackKind = Some "melee_spell_attack"
      , onHit = Some [ forceDamage ]
      , onMiss = Some [ noEffect ]
      }

let OngoingEffect : Type =
      { kind : Text
      , maxMoveFeet : Optional Natural
      , attachment : Optional AttackTargetAttachment
      , attackKind : Optional Text
      , onHit : Optional (List DamageEffect)
      , onMiss : Optional (List DamageEffect)
      , effects : Optional (List OngoingChildEffect)
      }

let laterTurnMoveAndAttack : OngoingEffect =
      { kind = "composite_ongoing"
      , maxMoveFeet = None Natural
      , attachment = None AttackTargetAttachment
      , attackKind = None Text
      , onHit = None (List DamageEffect)
      , onMiss = None (List DamageEffect)
      , effects = Some [ moveForce, repeatAttack ]
      }

let spiritualWeapon =
      { kind = "spell"
      , id = "spiritual_weapon"
      , name = "Spiritual Weapon"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Spiritual Weapon"
          }
      , description =
          "You create a floating, spectral force within range and can immediately make one melee spell attack against one creature within 5 feet of the force. On a hit, the target takes Force damage equal to 1d8 plus your spellcasting ability modifier. On later turns, you can take a Bonus Action to move the force up to 20 feet and repeat the attack. Using a Higher-Level Spell Slot. The damage increases by 1d8 for every slot level above 2."
      , mechanics =
          { family = "ongoing_effect"
          , level = 2
          , school = "evocation"
          , castingTime = { kind = "bonus_action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , attachment =
              { kind = "hole"
              , holeId = forceHoleId
              , label = "spectral force"
              , value =
                  { kind = "location"
                  , description = "space within range"
                  }
              }
          , initialPhase =
              { kind = "attack_roll"
              , attachment = forceAttackTarget
              , attackKind = "melee_spell_attack"
              , onHit = [ forceDamage ]
              , onMiss = [ noEffect ]
              }
          , operations =
              [ { trigger =
                    { kind = "on_caster_spends_action"
                    , cost = { kind = "bonus_action" }
                    , laterTurnsOnly = True
                    }
                , effect = laterTurnMoveAndAttack
                }
              ]
          }
      }

in  spiritualWeapon
