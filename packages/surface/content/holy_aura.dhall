-- Holy Aura — SRD 5.2.1 Spell, level 8, Abjuration.
--
-- RAW (Spells/Descriptions-E-L#Holy Aura):
--   "For the duration, you emit an aura in a 30-foot Emanation."
--   "While in the aura, creatures of your choice have Advantage on all
--    saving throws, and other creatures have Disadvantage on attack
--    rolls against them."
--   "when a Fiend or an Undead hits an affected creature with a melee
--    attack roll, the attacker must succeed on a Constitution saving
--    throw or have the Blinded condition until the end of its next turn."

let Effect : Type =
      { kind : Text
      , mode : Optional Text
      , on : Optional (List Text)
      , condition : Optional Text
      , duration : Optional Text
      , ability : Optional Text
      , dc : Optional { kind : Text }
      , onFail : Optional { kind : Text, condition : Text, duration : Text }
      , onSuccess : Optional { kind : Text }
      }

let none =
      { mode = None Text
      , on = None (List Text)
      , condition = None Text
      , duration = None Text
      , ability = None Text
      , dc = None { kind : Text }
      , onFail = None { kind : Text, condition : Text, duration : Text }
      , onSuccess = None { kind : Text }
      }

let savingThrowAdvantage : Effect =
      none
        //  { kind = "modify_roll_advantage"
            , mode = Some "advantage"
            , on = Some [ "saving_throw" ]
            }

let attackDisadvantage : Effect =
      none
        //  { kind = "modify_roll_advantage"
            , mode = Some "disadvantage"
            , on = Some [ "attack_roll" ]
            }

let blindedUntilNextTurn =
      { kind = "apply_condition"
      , condition = "blinded"
      , duration = "end_of_next_turn"
      }

let fiendUndeadHitSave : Effect =
      none
        //  { kind = "save_gate"
            , ability = Some "con"
            , dc = Some { kind = "caster_spell_save_dc" }
            , onFail = Some blindedUntilNextTurn
            , onSuccess = Some { kind = "none" }
            }

let auraAttachment =
      { kind = "hole"
      , holeId = "holy_aura_chosen_creatures"
      , label = "chosen creatures in aura"
      , value =
          { kind = "area"
          , shape = { kind = "emanation", radiusFeet = 30 }
          , origin = { kind = "self" }
          }
      }

let Trigger : Type =
      { kind : Text
      , attackKind : Optional Text
      , attackerTypeFilter : Optional (List Text)
      }

let passive : Trigger =
      { kind = "passive"
      , attackKind = None Text
      , attackerTypeFilter = None (List Text)
      }

let fiendUndeadMeleeHit : Trigger =
      { kind = "on_attached_hit_by_attack_roll"
      , attackKind = Some "melee"
      , attackerTypeFilter = Some [ "fiend", "undead" ]
      }

let Operation : Type = { trigger : Trigger, effect : Effect }

let holyAura =
      { kind = "spell"
      , id = "holy_aura"
      , name = "Holy Aura"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Holy Aura"
          }
      , description =
          "For the duration, you emit an aura in a 30-foot Emanation. While in the aura, creatures of your choice have Advantage on all saving throws, and other creatures have Disadvantage on attack rolls against them. In addition, when a Fiend or an Undead hits an affected creature with a melee attack roll, the attacker must succeed on a Constitution saving throw or have the Blinded condition until the end of its next turn."
      , mechanics =
          { family = "ongoing_effect"
          , level = 8
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components =
              { v = True
              , s = True
              , m = Some "a reliquary"
              , materialCostGp = 1000
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , attachment = auraAttachment
          , operations =
              [ { trigger = passive, effect = savingThrowAdvantage }
              , { trigger = passive, effect = attackDisadvantage }
              , { trigger = fiendUndeadMeleeHit, effect = fiendUndeadHitSave }
              ] : List Operation
          }
      }

in  holyAura
