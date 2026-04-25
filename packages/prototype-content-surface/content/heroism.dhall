-- Heroism — SRD 5.2.1 Spell, Level 1, Enchantment.
-- Family: ongoing_effect, multi-operation. §A15 + §A17 validation
-- ref: passive frightened-immunity + per-turn temp-HP refresh
-- (amount = caster's spellcasting ability modifier, via DiceExpr's
-- existing spellcastingMod flag as 0d1 + mod).

let heroism =
      { kind = "spell"
      , id = "heroism"
      , name = "Heroism"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Heroism"
          }
      , description =
          "A willing creature you touch is imbued with bravery. Until the spell ends, the creature is immune to the Frightened condition and gains Temporary Hit Points equal to your spellcasting ability modifier at the start of each of its turns. Using a Higher-Level Spell Slot. You can target one additional creature for each spell slot level above 1."
      , mechanics =
          { family = "ongoing_effect"
          , level = 1
          , school = "enchantment"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , attachment =
              { kind = "hole"
              , holeId = "heroism_target"
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
                      }
                  }
              }
          -- Two heterogeneous ops: Dhall homogeneity forces Optional-
          -- field trick on the `effect` records (condition field on
          -- grant_condition_immunity vs amount field on grant_temp_hp).
          , operations =
              [ { trigger = { kind = "passive" }
                , predicate =
                    None
                      { kind : Text
                      , threshold : Natural
                      , comparison : Text
                      }
                , effect =
                    { kind = "grant_condition_immunity"
                    , condition = Some "frightened"
                    , amount =
                        None
                          { kind : Text
                          , expr :
                              { dice : Natural
                              , dieSize : Natural
                              , flat : Natural
                              , spellcastingMod : Bool
                              }
                          }
                    }
                }
              , { trigger = { kind = "on_attached_turn_start" }
                , predicate =
                    None
                      { kind : Text
                      , threshold : Natural
                      , comparison : Text
                      }
                , effect =
                    { kind = "grant_temp_hp"
                    , condition = None Text
                    , amount =
                        Some
                          { kind = "fixed"
                          , expr =
                              { dice = 0
                              , dieSize = 1
                              , flat = 0
                              , spellcastingMod = True
                              }
                          }
                    }
                }
              ]
          }
      }

in  heroism
