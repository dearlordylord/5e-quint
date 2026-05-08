let InnateSorceryEffect =
      { kind : Text, delta : Optional { kind : Text, amount : Natural, sign : Text }, spellSourceFilter : { className : Text }, mode : Optional Text, on : Optional (List Text) }

let innateSorcery =
      { kind = "class_feature"
      , id = "sorcerer_innate_sorcery"
      , name = "Innate Sorcery"
      , className = "sorcerer"
      , acquiredAtLevel = 1
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Sorcerer#Innate Sorcery"
          }
      , description =
          "As a Bonus Action, unleash your magic for 1 minute, increasing Sorcerer spell save DCs by 1 and giving Advantage on Sorcerer spell attack rolls."
      , mechanics =
          { family = "activation"
          , activationCost = { kind = "bonus_action" }
          , resource = { kind = "use_count", cap = { kind = "fixed", uses = 2 } }
          , resetCadence = { kind = "long_rest" }
          , duration = { kind = "timed", value = { unit = "minute", amount = 1 } }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "modify_save_dc"
                      , delta = Some { kind = "fixed_number", amount = 1, sign = "+" }
                      , spellSourceFilter = { className = "sorcerer" }
                      , mode = None Text
                      , on = None (List Text)
                      }
                    , { kind = "modify_roll_advantage"
                      , delta = None { kind : Text, amount : Natural, sign : Text }
                      , spellSourceFilter = { className = "sorcerer" }
                      , mode = Some "advantage"
                      , on = Some [ "spell_attack_roll" ]
                      }
                    ] : List InnateSorceryEffect
                }
              ]
          }
      }

in  innateSorcery
