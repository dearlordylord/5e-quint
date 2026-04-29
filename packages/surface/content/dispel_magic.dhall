-- Dispel Magic — SRD 5.2.1 Spell, Level 3, Abjuration.
-- §C3 validation ref — first `ability_check_gate` phase +
-- `end_ongoing_spells` atom.
--
-- Two phases per RAW:
--   1. direct sweep: any ongoing spell of level ≤ caster's slot ends.
--   2. per-higher-level-spell ability check: spellcasting ability vs
--      DC 10 + that spell's level; on success the contested spell ends.
--
-- The per-spell iteration in phase 2 is caller-owned (the caller walks
-- each higher-level spell and invokes the gate). The type shape models
-- a single resolution; the tracer emits one check-gate subgraph.

let dispelMagic =
      { kind = "spell"
      , id = "dispel_magic"
      , name = "Dispel Magic"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Dispel Magic"
          }
      , description =
          "Choose one creature, object, or magical effect within range. Any ongoing spell of level 3 or lower on the target ends. For each ongoing spell of level 4 or higher on the target, make an ability check using your spellcasting ability (DC 10 plus that spell's level). On a successful check, the spell ends. Using a Higher-Level Spell Slot: you automatically end a spell on the target if the spell's level is equal to or less than the level of the spell slot you use."
      , mechanics =
          { family = "activation"
          , level = 3
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 120 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          -- Dhall homogeneity: two phase kinds in one list, Optional-
          -- field trick keeps the record types uniform.
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "dispel_magic_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    }
                , effects =
                    Some
                      [ { kind = "end_ongoing_spells"
                        , maxSpellLevel = Some "caster_slot_level"
                        }
                      ]
                , ability = None Text
                , dc = None Natural
                , onPass = None { kind : Text, maxSpellLevel : Optional Text }
                , autoSuccessIfCasterSlotGte = None Text
                }
              , { kind = "ability_check_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "dispel_magic_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    }
                , effects =
                    None (List { kind : Text, maxSpellLevel : Optional Text })
                , ability = Some "int"
                , dc = Some 10
                , onPass =
                    Some
                      { kind = "end_ongoing_spells"
                      , maxSpellLevel = Some "contested_spell_level"
                      }
                , autoSuccessIfCasterSlotGte = Some "target_spell_level"
                }
              ]
          }
      }

in  dispelMagic
