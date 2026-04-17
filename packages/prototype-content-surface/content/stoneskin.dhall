-- Stoneskin — SRD 5.2.1 Spell, level 4, Transmutation.
--
-- RAW (Spells / Descriptions S-Z / Stoneskin):
--   "Until the spell ends, one willing creature you touch has
--    Resistance to Bludgeoning, Piercing, and Slashing damage."
--
-- ZERO-WIDENING VALIDATION REFERENCE. Uses grant_resistance bundled
-- in a composite for multiple damage types. Also exercises
-- Components.materialCostGp = 100 on a CONSUMED material (diamond
-- dust) — third instance of the material-cost metadata shape
-- alongside Protection from Evil and Good (consumed Holy Water) and
-- Identify (non-consumed pearl).

let stoneskin =
      { kind = "spell"
      , id = "stoneskin"
      , name = "Stoneskin"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Stoneskin"
          }
      , description =
          "Until the spell ends, one willing creature you touch has Resistance to Bludgeoning, Piercing, and Slashing damage."
      , mechanics =
          { family = "activation"
          , level = 4
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = Some "diamond dust"
              , materialCostGp = 100
              , materialConsumed = True
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "hour", amount = 1 }
              }
          , phases =
              let Resist
                    : Type
                    = { kind : Text, damageType : Text }
              let b
                    : Resist
                    = { kind = "grant_resistance", damageType = "bludgeoning" }
              let p
                    : Resist
                    = { kind = "grant_resistance", damageType = "piercing" }
              let s
                    : Resist
                    = { kind = "grant_resistance", damageType = "slashing" }
              in  [ { kind = "direct"
                    , attachment =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    , effects =
                        [ { kind = "composite", effects = [ b, p, s ] } ]
                    }
                  ]
          }
      }

in  stoneskin
