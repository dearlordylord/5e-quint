-- Vampiric Touch — SRD 5.2.1 Spell, level 3, Necromancy
-- (Sorcerer, Warlock, Wizard).
--
-- RAW (Spells / Descriptions S-Z / Vampiric Touch):
--   "The touch of your shadow-wreathed hand can siphon life force from
--    others to heal your wounds. Make a melee spell attack against
--    one creature within reach. On a hit, the target takes 3d6
--    Necrotic damage, and you regain Hit Points equal to half the
--    amount of Necrotic damage dealt."
--   "Until the spell ends, you can make the attack again on each of
--    your turns as a Magic action, targeting the same creature or a
--    different one."
--   "Using a Higher-Level Spell Slot. The damage increases by 1d6
--    for each spell slot level above 3."
--
-- §A14 VALIDATION REFERENCE. Exercises DiceAmount.linked on
-- heal_hp: the caster's self-heal is equal to half the Necrotic
-- damage dealt in this same attack_roll phase. First SRD unit that
-- couples a heal amount to another atom's resolved output via the
-- `damage_dealt` link with `scale = "half"`.
--
-- PARTIAL CARVEOUT: the "Until the spell ends, you can make the
-- attack again on each of your turns as a Magic action" recast loop
-- is not modeled — no per-turn repeat_cast primitive exists in the
-- surface yet. Only the initial cast's attack → damage + self-heal
-- is encoded here; the concentration duration remains the correct
-- lifecycle marker because the recast window is scoped by it.

let vampiricTouch =
      { kind = "spell"
      , id = "vampiric_touch"
      , name = "Vampiric Touch"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Vampiric Touch"
          }
      , description =
          "The touch of your shadow-wreathed hand can siphon life force from others to heal your wounds. Make a melee spell attack against one creature within reach. On a hit, the target takes 3d6 Necrotic damage, and you regain Hit Points equal to half the amount of Necrotic damage dealt. Until the spell ends, you can make the attack again on each of your turns as a Magic action, targeting the same creature or a different one. Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 3."
      , mechanics =
          { family = "activation"
          , level = 3
          , school = "necromancy"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , phases =
              -- Dhall homogeneity: damage.amount is a linear_per_level
              -- DiceAmount, heal_hp.amount is a linked DiceAmount.
              -- Merge both variants' fields into one Optional-record
              -- so the composite list typechecks as homogeneous.
              let AmountBase
                    : Type
                    = { dice : Natural, dieSize : Natural }
              let AmountLink
                    : Type
                    = { kind : Text, scale : Text }
              let Amount
                    : Type
                    = { kind : Text
                      , axis : Optional Text
                      , base : Optional AmountBase
                      , perLevel : Optional { dice : Natural }
                      , startingAtLevel : Optional Natural
                      , link : Optional AmountLink
                      }
              let HitEffect
                    : Type
                    = { kind : Text
                      , damageType : Optional Text
                      , amount : Optional Amount
                      , target : Optional Text
                      }
              let dmg
                    : HitEffect
                    = { kind = "damage"
                      , damageType = Some "necrotic"
                      , amount =
                          Some
                            { kind = "linear_per_level"
                            , axis = Some "slot"
                            , base = Some { dice = 3, dieSize = 6 }
                            , perLevel = Some { dice = 1 }
                            , startingAtLevel = Some 3
                            , link = None AmountLink
                            }
                      , target = None Text
                      }
              let siphon
                    : HitEffect
                    = { kind = "heal_hp"
                      , damageType = None Text
                      , amount =
                          Some
                            { kind = "linked"
                            , axis = None Text
                            , base = None AmountBase
                            , perLevel = None { dice : Natural }
                            , startingAtLevel = None Natural
                            , link =
                                Some
                                  { kind = "damage_dealt"
                                  , scale = "half"
                                  }
                            }
                      , target = Some "self"
                      }
              in  [ { kind = "attack_roll"
                    , attachment =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    , attackKind = "melee_spell_attack"
                    , onHit =
                        [ { kind = "composite"
                          , effects = [ dmg, siphon ]
                          }
                        ]
                    , onMiss = [ { kind = "none" } ]
                    }
                  ]
          }
      }

in  vampiricTouch
