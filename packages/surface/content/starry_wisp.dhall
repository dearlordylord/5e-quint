-- Starry Wisp — SRD 5.2.1 Cantrip, Evocation.
-- Family: activation (single attack_roll phase).
-- Ranged spell attack; on hit: 1d8 Radiant damage (cantrip scaling).
-- TARGET SUBSET: RAW targets "one creature or object within range". The
-- battle-runtime spell invocation profile admits both combatant targets and a
-- caller-supplied object-target branch with object identity, range fact,
-- Armor Class, attack adjudication, and damage disposition.
-- PROMOTED RIDER: "emits Dim Light in a 10-foot radius" is authored as a
-- hit-applied Dim-only light emission for the shared battle-runtime emitter
-- projection.
-- DEFERRED RIDER: "can't benefit from the Invisible condition until end of
-- next turn" remains a later runtime slice.
-- Cantrip upgrade: 1d8 → 2d8 (L5) → 3d8 (L11) → 4d8 (L17).

let starryWisp =
      { kind = "spell"
      , id = "starry_wisp"
      , name = "Starry Wisp"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Starry Wisp"
          }
      , description =
          "You launch a mote of light at one creature or object within range. Make a ranged spell attack against the target. On a hit, the target takes 1d8 Radiant damage, and until the end of your next turn, it emits Dim Light in a 10-foot radius and can't benefit from the Invisible condition. Cantrip Upgrade: The damage increases by 1d8 when you reach levels 5 (2d8), 11 (3d8), and 17 (4d8)."
      , mechanics =
          { family = "activation"
          , level = 0
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "attack_roll"
                , attachment =
                    { kind = "hole"
                    , holeId = "starry_wisp_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "one" }
                              // { targetKinds = [ "creature", "object" ] }
                        }
                    }
                , attackKind = "ranged_spell_attack"
                , onHit =
                    [ { kind = "damage"
                      , damageType = Some "radiant"
                      , amount =
                          Some
                            { kind = "threshold_tiers"
                            , axis = "character"
                            , base = { dice = 1, dieSize = 8 }
                            , tiers =
                                [ { atLevel = 5, override = { dice = 2 } }
                                , { atLevel = 11, override = { dice = 3 } }
                                , { atLevel = 17, override = { dice = 4 } }
                                ]
                            }
                      , radiusFeet = None Natural
                      , expiresAt = None Text
                      }
                    , { kind = "emit_dim_light"
                      , damageType = None Text
                      , amount =
                          None
                            { kind : Text
                            , axis : Text
                            , base : { dice : Natural, dieSize : Natural }
                            , tiers :
                                List
                                  { atLevel : Natural
                                  , override : { dice : Natural }
                                  }
                            }
                      , radiusFeet = Some 10
                      , expiresAt = Some "end_of_caster_next_turn"
                      }
                    ]
                , onMiss = [ { kind = "none" } ]
                }
              ]
          }
      }

in  starryWisp
