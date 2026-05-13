-- Produce Flame — SRD 5.2.1 Cantrip, Conjuration.
--
-- RAW (Spells/Descriptions-M-P#Produce Flame):
--   "A flickering flame appears in your hand and remains there for the
--    duration. While there, the flame emits no heat and ignites nothing,
--    and it sheds Bright Light in a 20-foot radius and Dim Light for an
--    additional 20 feet. The spell ends if you cast it again.
--    Until the spell ends, you can take a Magic action to hurl fire at
--    a creature or an object within 60 feet of you. Make a ranged spell
--    attack. On a hit, the target takes 1d8 Fire damage."
--   "Cantrip Upgrade: The damage increases by 1d8 when you reach
--    levels 5 (2d8), 11 (3d8), and 17 (4d8)."
--
-- Family: ongoing_effect (timed 10 min, early end on caster_recasts_spell).
-- Attachment: self (flame in caster's hand).
-- Two operations:
--   1. passive → emit_light (20 ft bright, 20 ft dim additional)
--   2. on_caster_spends_action (Magic action) → attack_roll (ranged spell
--      attack), on hit: 1d8 fire damage (cantrip scaling at levels 5/11/17)
--
-- DHALL HOMOGENEITY NOTE: The two operations have structurally distinct
-- effect types (emit_light vs attack_roll). The Optional-field superset
-- trick (--omit-empty) unifies them into a single Dhall record type. All
-- fields are present in each element; None is stripped by dhall-to-json.
--
-- OMITTED (DM agenda):
--   "The flame emits no heat and ignites nothing" — world-state narrative,
--   no mechanical atom models heat or ignition gating.
--   The 60-foot hurl range and creature-or-object target boundary are enforced
--   by the promoted runtime profile; they are not captured on
--   OngoingEffect.attack_roll, which omits `attachment`.

let produceFlame =
      { kind = "spell"
      , id = "produce_flame"
      , name = "Produce Flame"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Produce Flame"
          }
      , description =
          "A flickering flame appears in your hand and remains there for the duration. While there, the flame emits no heat and ignites nothing, and it sheds Bright Light in a 20-foot radius and Dim Light for an additional 20 feet. The spell ends if you cast it again. Until the spell ends, you can take a Magic action to hurl fire at a creature or an object within 60 feet of you. Make a ranged spell attack. On a hit, the target takes 1d8 Fire damage. Cantrip Upgrade: The damage increases by 1d8 when you reach levels 5 (2d8), 11 (3d8), and 17 (4d8)."
      , mechanics =
          { family = "ongoing_effect"
          , level = 0
          , school = "conjuration"
          , castingTime = { kind = "bonus_action" }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "timed"
              , value = { unit = "minute", amount = 10 }
              , earlyEnd = [ { kind = "caster_recasts_spell" } ]
              }
          , attachment = { kind = "self" }
          , operations =
              -- Dhall requires a homogeneous list. The two operations carry
              -- structurally different effects (emit_light vs attack_roll).
              -- Unified via Optional superset; --omit-empty strips None.
              [ { trigger =
                    { kind = "passive"
                    , cost =
                        None { kind : Text, action : Text }
                    }
                , effect =
                    { kind = "emit_light"
                    , brightRadiusFeet = Some 20
                    , dimAdditionalFeet = Some 20
                    , attackKind = None Text
                    , onHit =
                        None
                          ( List
                              { kind : Text
                              , damageType : Optional Text
                              , amount :
                                  Optional
                                    { kind : Text
                                    , axis : Optional Text
                                    , base :
                                        Optional
                                          { dice : Natural, dieSize : Natural }
                                    , tiers :
                                        Optional
                                          ( List
                                              { atLevel : Natural
                                              , override : { dice : Natural }
                                              }
                                          )
                                    }
                              }
                          )
                    , onMiss =
                        None
                          ( List
                              { kind : Text
                              , damageType : Optional Text
                              , amount :
                                  Optional
                                    { kind : Text
                                    , axis : Optional Text
                                    , base :
                                        Optional
                                          { dice : Natural, dieSize : Natural }
                                    , tiers :
                                        Optional
                                          ( List
                                              { atLevel : Natural
                                              , override : { dice : Natural }
                                              }
                                          )
                                    }
                              }
                          )
                    }
                }
              , { trigger =
                    { kind = "on_caster_spends_action"
                    , cost =
                        Some { kind = "standard_action", action = "magic" }
                    }
                , effect =
                    { kind = "attack_roll"
                    , brightRadiusFeet = None Natural
                    , dimAdditionalFeet = None Natural
                    , attackKind = Some "ranged_spell_attack"
                    , onHit =
                        Some
                          [ { kind = "damage"
                            , damageType = Some "fire"
                            , amount =
                                Some
                                  { kind = "threshold_tiers"
                                  , axis = Some "character"
                                  , base =
                                      Some { dice = 1, dieSize = 8 }
                                  , tiers =
                                      Some
                                        [ { atLevel = 5
                                          , override = { dice = 2 }
                                          }
                                        , { atLevel = 11
                                          , override = { dice = 3 }
                                          }
                                        , { atLevel = 17
                                          , override = { dice = 4 }
                                          }
                                        ]
                                  }
                            }
                          ]
                    , onMiss =
                        Some
                          [ { kind = "none"
                            , damageType = None Text
                            , amount =
                                None
                                  { kind : Text
                                  , axis : Optional Text
                                  , base :
                                      Optional
                                        { dice : Natural, dieSize : Natural }
                                  , tiers :
                                      Optional
                                        ( List
                                            { atLevel : Natural
                                            , override : { dice : Natural }
                                            }
                                        )
                                  }
                            }
                          ]
                    }
                }
              ]
          }
      }

in  produceFlame
