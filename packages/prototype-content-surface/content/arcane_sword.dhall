-- Arcane Sword — SRD 5.2.1 Spell, level 7, Evocation.
--
-- RAW (Spells/Descriptions-A-D#Arcane Sword):
--   "You create a spectral sword that hovers within range."
--   "When the sword appears, you make a melee spell attack against a
--    target within 5 feet of the sword."
--   "On your later turns, you can take a Bonus Action to move the
--    sword up to 30 feet ... and repeat the attack."

let DiceExpr : Type =
      { dice : Natural
      , dieSize : Natural
      , spellcastingMod : Optional Bool
      }

let DiceAmount : Type =
      { kind : Text
      , expr : DiceExpr
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
            { kind = "fixed"
            , expr =
                { dice = 4
                , dieSize = 12
                , spellcastingMod = Some True
                }
            }
      }

let OngoingEffect : Type =
      { kind : Text
      , maxMoveFeet : Optional Natural
      , attackKind : Optional Text
      , onHit : Optional (List DamageEffect)
      , onMiss : Optional (List DamageEffect)
      }

let moveSword : OngoingEffect =
      { kind = "reposition_attachment"
      , maxMoveFeet = Some 30
      , attackKind = None Text
      , onHit = None (List DamageEffect)
      , onMiss = None (List DamageEffect)
      }

let repeatAttack : OngoingEffect =
      { kind = "attack_roll"
      , maxMoveFeet = None Natural
      , attackKind = Some "melee_spell_attack"
      , onHit = Some [ forceDamage ]
      , onMiss = Some [ noEffect ]
      }

let arcaneSword =
      { kind = "spell"
      , id = "arcane_sword"
      , name = "Arcane Sword"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Arcane Sword"
          }
      , description =
          "You create a spectral sword that hovers within range. When the sword appears, you make a melee spell attack against a target within 5 feet of the sword. On a hit, the target takes Force damage equal to 4d12 plus your spellcasting ability modifier. On later turns, you can take a Bonus Action to move the sword up to 30 feet and repeat the attack against the same target or a different one."
      , mechanics =
          { family = "ongoing_effect"
          , level = 7
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 90 }
          , components =
              { v = True
              , s = True
              , m = Some "a miniature sword worth 250+ GP"
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , attachment =
              { kind = "hole"
              , holeId = "arcane_sword"
              , label = "spectral sword"
              , value =
                  { kind = "location"
                  , description = "space within range"
                  }
              }
          , initialPhase =
              { kind = "attack_roll"
              , attachment =
                  { kind = "hole"
                  , holeId = "arcane_sword_attack_target"
                  , label = "target within 5 feet of the sword"
                  , value =
                      { kind = "target"
                      , selection = { mode = "one" }
                      }
                  }
              , attackKind = "melee_spell_attack"
              , onHit = [ forceDamage ]
              , onMiss = [ noEffect ]
              }
          , operations =
              [ { trigger =
                    { kind = "on_caster_spends_action"
                    , cost = { kind = "bonus_action" }
                    }
                , effect = moveSword
                }
              , { trigger =
                    { kind = "on_caster_spends_action"
                    , cost = { kind = "bonus_action" }
                    }
                , effect = repeatAttack
                }
              ]
          }
      }

in  arcaneSword
