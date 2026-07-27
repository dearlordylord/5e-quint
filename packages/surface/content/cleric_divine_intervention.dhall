let divineIntervention =
      { kind = "class_feature"
      , id = "cleric_divine_intervention"
      , name = "Divine Intervention"
      , className = "cleric"
      , acquiredAtLevel = 10
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Cleric.md:122-126" }

      , mechanics =
          { family = "activation"
          , activationCost = { kind = "standard_action", action = "magic" }
          , resource = { kind = "use_count", cap = { kind = "fixed", uses = 1 } }
          , resetCadence = { kind = "long_rest" }
          , phases = [ { kind = "direct", attachment = { kind = "self" } } ]
          }
      }

in  divineIntervention
