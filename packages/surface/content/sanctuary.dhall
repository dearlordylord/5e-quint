-- Sanctuary — SRD 5.2.1 Spell, level 1, Abjuration.
--
-- RAW (Spells/Descriptions-S-Z#Sanctuary):
--   "You ward a creature within range."
--   "Until the spell ends, any creature who targets the warded
--    creature with an attack roll or a damaging spell must succeed on
--    a Wisdom saving throw or either choose a new target or lose the
--    attack or spell."
--   "This spell doesn't protect the warded creature from areas of
--    effect."
--   "The spell ends if the warded creature makes an attack roll,
--    casts a spell, or deals damage."

let sanctuary =
      { kind = "spell"
      , id = "sanctuary"
      , name = "Sanctuary"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Sanctuary"
          }
      , description =
          "You ward a creature within range. Until the spell ends, any creature who targets the warded creature with an attack roll or a damaging spell must succeed on a Wisdom saving throw or either choose a new target or lose the attack or spell. This spell doesn't protect the warded creature from areas of effect. The spell ends if the warded creature makes an attack roll, casts a spell, or deals damage."
      , mechanics =
          { family = "ongoing_effect"
          , level = 1
          , school = "abjuration"
          , castingTime = { kind = "bonus_action" }
          , range = { kind = "point", feet = 30 }
          , components =
              { v = True
              , s = True
              , m = Some "a shard of glass from a mirror"
              }
          , duration =
              { kind = "timed"
              , value = { unit = "minute", amount = 1 }
              , earlyEnd =
                  [ { kind = "target_makes_attack_roll" }
                  , { kind = "target_casts_spell" }
                  , { kind = "target_deals_damage" }
                  ]
              }
          , attachment =
              { kind = "hole"
              , holeId = "sanctuary_warded_creature"
              , label = "warded creature"
              , value =
                  { kind = "target"
                  , selection =
                      { mode = "one", targetKinds = [ "creature" ] }
                  }
              }
          , operations =
              [ { trigger =
                    { kind = "on_attached_targeted"
                    , targeting = [ "attack_roll", "damaging_spell" ]
                    , excludes = "area_of_effect"
                    }
                , effect =
                    { kind = "save_gate"
                    , ability = "wis"
                    , dc = { kind = "caster_spell_save_dc" }
                    , onFail =
                        { kind = "choose_new_target_or_lose"
                        , subject = "triggering_attack_or_spell"
                        }
                    , onSuccess = { kind = "none" }
                    }
                }
              ]
          }
      }

in  sanctuary
