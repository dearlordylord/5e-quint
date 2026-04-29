-- Death Ward — SRD 5.2.1 Spell, level 4, Abjuration.
--
-- RAW (Spells/Descriptions-A-D#Death Ward):
--   "The first time the target would drop to 0 Hit Points before the
--    spell ends, the target instead drops to 1 Hit Point, and the
--    spell ends."
--   "If the spell is still in effect when the target is subjected to
--    an effect that would kill it instantly without dealing damage,
--    that effect is negated against the target, and the spell ends."

let Effect : Type =
      { kind : Text
      , replacementHp : Optional Natural
      , consumesEffect : Optional Bool
      }

let zeroHpProtection : Effect =
      { kind = "prevent_drop_to_0_hp"
      , replacementHp = Some 1
      , consumesEffect = Some True
      }

let instantDeathProtection : Effect =
      { kind = "negate_instant_death"
      , replacementHp = None Natural
      , consumesEffect = Some True
      }

let deathWard =
      { kind = "spell"
      , id = "death_ward"
      , name = "Death Ward"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Death Ward"
          }
      , description =
          "You touch a creature and grant it protection from death. The first time the target would drop to 0 Hit Points before the spell ends, the target instead drops to 1 Hit Point and the spell ends. If the target is subjected to an effect that would kill it instantly without dealing damage, that effect is negated against the target and the spell ends."
      , mechanics =
          { family = "ongoing_effect"
          , level = 4
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 8 }
              }
          , attachment =
              { kind = "hole"
              , holeId = "death_ward_target"
              , label = "touched creature"
              , value =
                  { kind = "target"
                  , selection = { mode = "one" }
                  }
              }
          , operations =
              [ { trigger = { kind = "passive" }
                , effect = zeroHpProtection
                }
              , { trigger = { kind = "passive" }
                , effect = instantDeathProtection
                }
              ]
          }
      }

in  deathWard
