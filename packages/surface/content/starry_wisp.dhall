-- Starry Wisp — SRD 5.2.1 Cantrip, Evocation.
-- Family: activation (single attack_roll phase).
-- Ranged spell attack; on hit: 1d8 Radiant damage (cantrip scaling).
-- TARGET BLOCKER: RAW targets "one creature or object within range". The
-- battle-runtime spell invocation profile currently admits combatant targets
-- only, so this Unit must stay unsupported until object-target identity,
-- attack adjudication, damage disposition, Dim Light emission, and Invisible
-- benefit denial are executable.
-- OMITTED RIDERS: "emits Dim Light in a 10-foot radius" and
--   "can't benefit from the Invisible condition until end of next turn"
--   → both require new atoms not in v4:
--     • emit_light (or grant_light_emission) — no such effect atom exists
--     • deny_condition_benefit (or suppress_invisible_benefit) — no such atom exists
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
                      , damageType = "radiant"
                      , amount =
                          { kind = "threshold_tiers"
                          , axis = "character"
                          , base = { dice = 1, dieSize = 8 }
                          , tiers =
                              [ { atLevel = 5, override = { dice = 2 } }
                              , { atLevel = 11, override = { dice = 3 } }
                              , { atLevel = 17, override = { dice = 4 } }
                              ]
                          }
                      }
                    ]
                , onMiss = [ { kind = "none" } ]
                }
              ]
          }
      }

in  starryWisp
