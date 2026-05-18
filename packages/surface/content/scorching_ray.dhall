-- Scorching Ray — SRD 5.2.1 Spell, level 2, Evocation.
--
-- RAW (Spells/Descriptions-S-Z#Scorching Ray):
--   "You hurl three fiery rays. You can hurl them at one target
--    within range or at several. Make a ranged spell attack for each
--    ray. On a hit, the target takes 2d6 Fire damage."
--   "You create one additional ray for each spell slot level above 2."
--   The generic attack rules justify object targeting for the spell's
--   unspecified "target": Playing-the-Game.md lines 584-588 says an attack
--   target can be a creature, object, or location, Rules-Glossary.md lines
--   916-918 defines Spell Attack as an attack roll made as part of a spell,
--   and Rules-Glossary.md lines 1020-1022 defines a Target as the creature
--   or object targeted by an attack roll or spell.
--
-- MODELING NOTE. `choose_up_to` with `repeatsAllowed` captures the
-- ray target multiset and slot-scaled ray count. The separate attack
-- roll per ray is an execution obligation for repeated selections.

let scorchingRay =
      { kind = "spell"
      , id = "scorching_ray"
      , name = "Scorching Ray"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Scorching Ray"
          }
      , description =
          "You hurl three fiery rays. You can hurl them at one target within range or at several. Make a ranged spell attack for each ray. On a hit, the target takes 2d6 Fire damage. Using a Higher-Level Spell Slot: You create one additional ray for each spell slot level above 2."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 120 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "attack_roll"
                , attachment =
                    { kind = "hole"
                    , holeId = "scorching_ray_target"
                    , label = "ray target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "choose_up_to"
                            , count =
                                { kind = "linear"
                                , base = 3
                                , perSlotAboveBase = 1
                                , baseLevel = 2
                                }
                            , repeatsAllowed = True
                            }
                          // { targetKinds = [ "creature", "object" ] }
                        }
                    }
                , attackKind = "ranged_spell_attack"
                , onHit =
                    [ { kind = "damage"
                      , damageType = "fire"
                      , amount =
                          { kind = "fixed"
                          , expr = { dice = 2, dieSize = 6 }
                          }
                      }
                    ]
                , onMiss = [ { kind = "none" } ]
                }
              ]
          }
      }

in  scorchingRay
