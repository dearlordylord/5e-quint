-- Animal Friendship — SRD 5.2.1 Spell, level 1, Enchantment.
--
-- RAW (Spells / Descriptions A-D / Animal Friendship):
--   "Target a Beast that you can see within range. The target must
--    succeed on a Wisdom saving throw or have the Charmed condition
--    for the duration. If you or one of your allies deals damage to
--    the target, the spell ends."
--   "Using a Higher-Level Spell Slot. You can target one additional
--    Beast for each spell slot level above 1."
--
-- ZERO-WIDENING VALIDATION REFERENCE. Structurally parallel to Charm
-- Person with (a) different creature-type filter (beast vs humanoid)
-- and (b) longer duration (24 hours vs 1 hour). Confirms the Target-
-- Selection.typeFilter enum generalizes across types and that
-- DurationEndTrigger.target_damaged_by_caster_or_ally reuses cleanly.

let animalFriendship =
      { kind = "spell"
      , id = "animal_friendship"
      , name = "Animal Friendship"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Animal Friendship"
          }
      , description =
          "Target a Beast that you can see within range. The target must succeed on a Wisdom saving throw or have the Charmed condition for the duration. If you or one of your allies deals damage to the target, the spell ends. Using a Higher-Level Spell Slot. You can target one additional Beast for each spell slot level above 1."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "enchantment"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 30 }
          , components =
              { v = True
              , s = True
              , m = Some "a morsel of food"
              }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 24 }
              , earlyEnd =
                  [ { kind = "target_damaged_by_caster_or_ally" } ]
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "animal_friendship_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "choose_up_to"
                            , count =
                                { kind = "linear"
                                , base = 1
                                , perSlotAboveBase = 1
                                , baseLevel = 1
                                }
                            , typeFilter = [ "beast" ]
                            }
                        }
                    }
                , ability = "wis"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "apply_condition"
                    , condition = "charmed"
                    }
                , onSuccess = { kind = "none" }
                }
              ]
          }
      }

in  animalFriendship
