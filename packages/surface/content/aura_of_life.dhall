-- Aura of Life — SRD 5.2.1 Spell, Level 4, Abjuration.
-- Family: ongoing_effect, multi-operation (passive grant_resistance
-- + conditional per-turn heal). §A15-unlocked per-turn trigger + new
-- multi-operation widening validation ref.
--
-- All three listed mechanics now authored (§A16 block_max_hp_reduction
-- landed alongside the multi-op widening).

let auraOfLife =
      { kind = "spell"
      , id = "aura_of_life"
      , name = "Aura of Life"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Aura of Life"
          }
      , description =
          "An aura radiates from you in a 30-foot Emanation for the duration. While in the aura, you and your allies have Resistance to Necrotic damage, and your Hit Point maximums can't be reduced. If an ally with 0 Hit Points starts its turn in the aura, that ally regains 1 Hit Point."
      , mechanics =
          { family = "ongoing_effect"
          , level = 4
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components = { v = True, s = False, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , attachment =
              { kind = "area"
              , shape = { kind = "emanation", radiusFeet = 30 }
              , origin = { kind = "self" }
              }
          -- Dhall homogeneity forces Optional-field trick across the
          -- two operations: each record carries every variant-specific
          -- field from both effects as Optional, with None on the
          -- records that don't use it. --omit-empty strips the Nones.
          , operations =
              [ { trigger = { kind = "passive" }
                , predicate =
                    None
                      { kind : Text
                      , threshold : Natural
                      , comparison : Text
                      }
                , effect =
                    { kind = "grant_resistance"
                    , damageType = Some "necrotic"
                    , amount =
                        None
                          { kind : Text
                          , expr : { dice : Natural, dieSize : Natural, flat : Natural }
                          }
                    , target = None Text
                    }
                }
              , { trigger = { kind = "passive" }
                , predicate =
                    None
                      { kind : Text
                      , threshold : Natural
                      , comparison : Text
                      }
                , effect =
                    { kind = "block_max_hp_reduction"
                    , damageType = None Text
                    , amount =
                        None
                          { kind : Text
                          , expr : { dice : Natural, dieSize : Natural, flat : Natural }
                          }
                    , target = None Text
                    }
                }
              , { trigger = { kind = "on_attached_turn_start" }
                , predicate =
                    Some
                      { kind = "at_hp_threshold"
                      , threshold = 0
                      , comparison = "eq"
                      }
                , effect =
                    { kind = "heal_hp"
                    , damageType = None Text
                    , amount =
                        Some
                          { kind = "fixed"
                          , expr = { dice = 0, dieSize = 1, flat = 1 }
                          }
                    , target = Some "target_creature"
                    }
                }
              ]
          }
      }

in  auraOfLife
