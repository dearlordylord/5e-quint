let potentCantrip =
      { kind = "class_feature"
      , id = "wizard_potent_cantrip"
      , name = "Potent Cantrip"
      , className = "wizard"
      , acquiredAtLevel = 3
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Wizard.md:417-420" }
      , description =
          "When you cast a damaging cantrip at a creature and miss with the attack roll or the target succeeds on its saving throw, the target takes half the cantrip's damage, if any, and suffers no additional effect."
      , mechanics =
          { family = "potent_cantrip"
          , trigger =
              { kind = "cast_cantrip_at_creature", cantripKind = "damaging" }
          , outcomes =
            [ "miss_with_attack_roll", "target_succeeds_saving_throw" ]
          , damage = { kind = "half_cantrip_damage_if_any" }
          , additionalEffect = "none"
          }
      }

in  potentCantrip
