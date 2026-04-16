-- Ray of Frost — SRD 5.2.1 Cantrip, Evocation.
-- Family: activation (single attack_roll phase).
-- Ranged spell attack; on hit: 1d8 Cold damage (cantrip scaling).
-- OMITTED RIDER: "its Speed is reduced by 10 feet until the start of your next turn"
-- → requires modify_speed in Effect union (surface_widening).
--   modify_speed IS a v4 atom, but Effect = DamageEffect | NoneEffect only.
--   Also needs onHit to support multiple effects (composite or array).
-- Cantrip upgrade: 1d8 → 2d8 (L5) → 3d8 (L11) → 4d8 (L17).

let rayOfFrost =
      { kind = "spell"
      , id = "ray_of_frost"
      , name = "Ray of Frost"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-Q-R#Ray of Frost"
          }
      , description =
          "A frigid beam of blue-white light streaks toward a creature within range. Make a ranged spell attack against the target. On a hit, it takes 1d8 Cold damage, and its Speed is reduced by 10 feet until the start of your next turn. Cantrip Upgrade: The damage increases by 1d8 when you reach levels 5 (2d8), 11 (3d8), and 17 (4d8)."
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
                    { kind = "target"
                    , selection = { mode = "one" }
                    }
                , attackKind = "ranged_spell_attack"
                , onHit =
                    { kind = "damage"
                    , damageType = "cold"
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

in  rayOfFrost
