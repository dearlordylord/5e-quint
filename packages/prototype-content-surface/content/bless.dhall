-- Bless — SRD 5.2.1
-- Authored against the closed atom vocabulary in ../src/surface/types.ts.
-- Compile to JSON with: dhall-to-json --file bless.dhall --output bless.json
--
-- Right now the JSON in bless.json is hand-maintained because no Dhall
-- toolchain is installed in this repo yet. The Dhall file lives here as
-- documentation of authoring intent, and as the target format once the
-- surface stabilizes.

let LinearSlotScaling =
      λ(base : Natural) →
      λ(perSlotAboveBase : Natural) →
      λ(baseLevel : Natural) →
        { kind = "linear"
        , base = base
        , perSlotAboveBase = perSlotAboveBase
        , baseLevel = baseLevel
        }

in  { id = "bless"
    , name = "Bless"
    , provenance =
        { kind = "srd-5.2.1"
        , section = "Spells/Descriptions-A-D#Bless"
        }
    , description =
        "You bless up to three creatures within range. Whenever a target makes an attack roll or a saving throw before the spell ends, the target adds 1d4 to the attack roll or save."
    , mechanics =
        { family = "ongoing_effect"
        , castingTime = { kind = "action" }
        , attachment =
            { kind = "target"
            , selection =
                { mode = "choose_up_to"
                , count = LinearSlotScaling 3 1 1
                , range = { feet = 30 }
                }
            }
        , resource = { kind = "spell_slot", minLevel = 1 }
        , operation =
            { kind = "roll_modifier"
            , on = [ "attack_roll", "saving_throw" ]
            , delta = { dice = 1, dieSize = 4, sign = "+" }
            }
        , lifecycle =
            { kind = "concentration"
            , maxDuration = { unit = "minute", amount = 1 }
            }
        , cleanup = { kind = "concentration_end" }
        }
    }
