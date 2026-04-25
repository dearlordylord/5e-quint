-- Flame Blade — SRD 5.2.1 Spell, level 2, Evocation.
--
-- RAW (Spells/Descriptions-E-L#Flame Blade):
--   "You evoke a fiery blade in your free hand"
--   "As a Magic action, you can make a melee spell attack with the
--    fiery blade. On a hit, the target takes Fire damage equal to 3d6
--    plus your spellcasting ability modifier."
--   "The flaming blade sheds Bright Light in a 10-foot radius and Dim
--    Light for an additional 10 feet."
--   "Using a Higher-Level Spell Slot. The damage increases by 1d6 for
--    each spell slot level above 2."
--
-- DEFERRED. "If you let go of the blade, it disappears, but you can
-- evoke it again as a Bonus Action" needs held-created-object
-- lifecycle state. This surface pass encodes the combat attack and
-- light riders.

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

let fireDamage : DamageEffect =
      { kind = "damage"
      , damageType = Some "fire"
      , amount =
          Some
            { kind = "linear_per_level"
            , expr = None DiceExpr
            , axis = Some "slot"
            , base =
                Some
                  { dice = 3
                  , dieSize = 6
                  , spellcastingMod = Some True
                  }
            , perLevel = Some { dice = 1, dieSize = Some 6 }
            , startingAtLevel = Some 2
            }
      }

let OngoingEffect : Type =
      { kind : Text
      , brightRadiusFeet : Optional Natural
      , dimAdditionalFeet : Optional Natural
      , attackKind : Optional Text
      , onHit : Optional (List DamageEffect)
      , onMiss : Optional (List DamageEffect)
      }

let bladeLight : OngoingEffect =
      { kind = "emit_light"
      , brightRadiusFeet = Some 10
      , dimAdditionalFeet = Some 10
      , attackKind = None Text
      , onHit = None (List DamageEffect)
      , onMiss = None (List DamageEffect)
      }

let bladeAttack : OngoingEffect =
      { kind = "attack_roll"
      , brightRadiusFeet = None Natural
      , dimAdditionalFeet = None Natural
      , attackKind = Some "melee_spell_attack"
      , onHit = Some [ fireDamage ]
      , onMiss = Some [ noEffect ]
      }

let Trigger : Type =
      { kind : Text
      , cost : Optional { kind : Text, action : Optional Text }
      }

let passiveTrigger : Trigger =
      { kind = "passive"
      , cost = None { kind : Text, action : Optional Text }
      }

let magicActionTrigger : Trigger =
      { kind = "on_caster_spends_action"
      , cost =
          Some
            { kind = "standard_action"
            , action = Some "magic"
            }
      }

let flameBlade =
      { kind = "spell"
      , id = "flame_blade"
      , name = "Flame Blade"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Flame Blade"
          }
      , description =
          "You evoke a fiery blade in your free hand for the duration. As a Magic action, you can make a melee spell attack with the blade. On a hit, the target takes Fire damage equal to 3d6 plus your spellcasting ability modifier. The blade sheds Bright Light in a 10-foot radius and Dim Light for an additional 10 feet. Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 2."
      , mechanics =
          { family = "ongoing_effect"
          , level = 2
          , school = "evocation"
          , castingTime = { kind = "bonus_action" }
          , range = { kind = "self" }
          , components =
              { v = True
              , s = True
              , m = Some "a sumac leaf"
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , attachment = { kind = "self" }
          , operations =
              [ { trigger = passiveTrigger
                , effect = bladeLight
                }
              , { trigger = magicActionTrigger
                , effect = bladeAttack
                }
              ]
          }
      }

in  flameBlade
