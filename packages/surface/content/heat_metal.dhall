-- Heat Metal — SRD 5.2.1 Spell, Level 2, Transmutation (Bard, Druid).
--
-- RAW (Spells/Descriptions-E-L#Heat Metal):
--   "Choose a manufactured metal object ... that you can see within range."
--   "Any creature in physical contact with the object takes 2d8 Fire damage
--    when you cast the spell."
--   "Until the spell ends, you can take a Bonus Action on each of your later
--    turns to deal this damage again if the object is within range."
--   "If a creature is holding or wearing the object and takes the damage from
--    it, the creature must succeed on a Constitution saving throw or drop the
--    object if it can. If it doesn't drop the object, it has Disadvantage on
--    attack rolls and ability checks until the start of your next turn."
--   "Using a Higher-Level Spell Slot. The damage increases by 1d8 for each
--    spell slot level above 2."
--
-- Surface ownership: this record carries the Spell Definition shape for
-- manufactured-metal object targeting, table-witnessed contact, and the
-- holding/wearing save branch. Runtime object identity, contact witnesses,
-- drop capability/result witnesses, damage application, and roll-mode
-- projection remain battle-runtime facts for the follow-up tasks.

let slotScaledDamage =
      { kind = "linear_per_level"
      , axis = "slot"
      , base = { dice = 2, dieSize = 8 }
      , perLevel = { dice = 1 }
      , startingAtLevel = 3
      }

let contactDamage =
      { kind = "object_contact_damage"
      , contact =
          { kind = "table_witnessed_physical_contact_with_spell_object" }
      , damageType = "fire"
      , amount = slotScaledDamage
      , holdingOrWearingSave =
          { appliesIf =
              { kind = "table_witnessed_holding_or_wearing_spell_object" }
          , ability = "con"
          , dc = { kind = "caster_spell_save_dc" }
          , onSuccess = { kind = "none" }
          , onFailure =
              { kind = "drop_if_possible_else_disadvantage"
              , dropCapabilityWitness =
                  { kind = "table_witnessed_drop_capability"
                  , subject = "damaged_creature"
                  , object = "spell_object"
                  }
              , dropResultWitness =
                  { kind = "table_witnessed_drop_result"
                  , subject = "damaged_creature"
                  , object = "spell_object"
                  }
              , fallbackWhen = "object_not_dropped"
              , fallback =
                  { kind = "modify_roll_advantage"
                  , mode = "disadvantage"
                  , on = [ "attack_roll", "ability_check" ]
                  , expiresOn = { kind = "caster_turn_start" }
                  }
              }
          }
      }

let metalObjectAttachment =
      { kind = "hole"
      , holeId = "heat_metal_object"
      , label = "target object"
      , value =
          { kind = "object"
          , count = 1
          , filter =
              { material = "metal"
              , visibility = "caster_can_see"
              , manufactured = True
              }
          }
      }

let heatMetal =
      { kind = "spell"
      , id = "heat_metal"
      , name = "Heat Metal"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Heat Metal"
          }
      , description =
          "Choose a manufactured metal object, such as a metal weapon or a suit of Heavy or Medium metal armor, that you can see within range. You cause the object to glow red-hot. Any creature in physical contact with the object takes 2d8 Fire damage when you cast the spell. Until the spell ends, you can take a Bonus Action on each of your later turns to deal this damage again if the object is within range. If a creature is holding or wearing the object and takes the damage from it, the creature must succeed on a Constitution saving throw or drop the object if it can. If it doesn't drop the object, it has Disadvantage on attack rolls and ability checks until the start of your next turn. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 2."
      , mechanics =
          { family = "ongoing_effect"
          , level = 2
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components =
              { v = True, s = True, m = Some "a piece of iron and a flame" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , attachment = metalObjectAttachment
          , initialPhase =
              { kind = "direct"
              , attachment = metalObjectAttachment
              , effects = [ contactDamage ]
              }
          , operations =
              [ { trigger =
                    { kind = "on_caster_spends_action"
                    , cost = { kind = "bonus_action" }
                    , laterTurnsOnly = True
                    }
                , predicate =
                    { kind = "table_witnessed_attachment_within_spell_range" }
                , effect = contactDamage
                }
              ]
          }
      }

in  heatMetal
