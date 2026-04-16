-- Shocking Grasp — SRD 5.2.1 Cantrip, Evocation.
-- Family: activation (single attack_roll phase).
-- Melee spell attack; on hit: 1d8 Lightning damage (cantrip scaling).
-- OMITTED RIDER: "it can't make Opportunity Attacks until the start of its next turn"
-- → requires deny_opportunity_attack in Effect union (surface_widening).
--   deny_opportunity_attack IS a v4 atom, but Effect = DamageEffect | NoneEffect only.
--   Also needs onHit to support multiple effects (composite or array).
-- Cantrip upgrade: 1d8 → 2d8 (L5) → 3d8 (L11) → 4d8 (L17).

let shockingGrasp =
      { kind = "spell"
      , id = "shocking_grasp"
      , name = "Shocking Grasp"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S#Shocking Grasp"
          }
      , description =
          "Lightning springs from you to a creature that you try to touch. Make a melee spell attack against the target. On a hit, the target takes 1d8 Lightning damage, and it can't make Opportunity Attacks until the start of its next turn. Cantrip Upgrade: The damage increases by 1d8 when you reach levels 5 (2d8), 11 (3d8), and 17 (4d8)."
      , mechanics =
          { family = "activation"
          , level = 0
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "attack_roll"
                , attachment =
                    { kind = "target"
                    , selection = { mode = "one" }
                    }
                , attackKind = "melee_spell_attack"
                , onHit =
                    { kind = "damage"
                    , damageType = "lightning"
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
                , onMiss = { kind = "none" }
                }
              ]
          }
      }

in  shockingGrasp
