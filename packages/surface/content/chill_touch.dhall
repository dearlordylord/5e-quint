-- Chill Touch — SRD 5.2.1 Cantrip, Necromancy.
-- Family: activation (single attack_roll phase).
-- Melee spell attack; on hit: 1d10 Necrotic damage (cantrip scaling) and
-- target can't regain Hit Points until end of your next turn.
-- The generic RAW "target" uses the SRD Target glossary boundary: creature or
-- object. Battle-runtime admits combatant targets and caller-supplied object
-- identity/range/Armor Class/damage disposition facts without owning generic
-- object discovery.
-- Cantrip upgrade: 1d10 → 2d10 (L5) → 3d10 (L11) → 4d10 (L17).

let AmountRec
    : Type
    = { kind : Text
      , axis : Text
      , base : { dice : Natural, dieSize : Natural }
      , tiers :
          List
            { atLevel : Natural
            , override : { dice : Natural }
            }
      }

let HitRider
    : Type
    = { kind : Text
      , damageType : Optional Text
      , amount : Optional AmountRec
      , expiresAt : Optional Text
      }

let damageRider
    : HitRider
    = { kind = "damage"
      , damageType = Some "necrotic"
      , amount =
          Some
            { kind = "threshold_tiers"
            , axis = "character"
            , base = { dice = 1, dieSize = 10 }
            , tiers =
                [ { atLevel = 5, override = { dice = 2 } }
                , { atLevel = 11, override = { dice = 3 } }
                , { atLevel = 17, override = { dice = 4 } }
                ]
            }
      , expiresAt = None Text
      }

let hitPointRegainPreventionRider
    : HitRider
    = { kind = "prevent_hit_point_regain"
      , damageType = None Text
      , amount = None AmountRec
      , expiresAt = Some "end_of_caster_next_turn"
      }

let chillTouch =
      { kind = "spell"
      , id = "chill_touch"
      , name = "Chill Touch"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Chill Touch"
          }
      , description =
          "Channeling the chill of the grave, make a melee spell attack against a target within reach. On a hit, the target takes 1d10 Necrotic damage, and it can't regain Hit Points until the end of your next turn. Cantrip Upgrade: The damage increases by 1d10 when you reach levels 5 (2d10), 11 (3d10), and 17 (4d10)."
      , mechanics =
          { family = "activation"
          , level = 0
          , school = "necromancy"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "attack_roll"
                , attachment =
                    { kind = "hole"
                    , holeId = "chill_touch_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "one" }
                              // { targetKinds = [ "creature", "object" ] }
                        }
                    }
                , attackKind = "melee_spell_attack"
                , onHit = [ damageRider, hitPointRegainPreventionRider ]
                , onMiss = [ { kind = "none" } ]
                }
              ]
          }
      }

in  chillTouch
