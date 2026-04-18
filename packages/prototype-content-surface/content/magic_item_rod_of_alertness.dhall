-- Rod of Alertness — SRD 5.2.1 magic item (very rare, attunement).
--
-- Honest fit to the current surface:
--   • composite magic item
--   • passive held-item advantage on Initiative and Wis (Perception)
--   • passive held-item at-will spell access for four named spells
--   • once-per-dawn Magic-action protective aura with 10-minute duration
--     granting +1 AC and +1 to saving throws to you and allies in the
--     bright-light radius
--
-- Explicit omission recorded in proposal/result:
--   • "you and your allies ... can sense the location of any Invisible
--     creature that is also in the Bright Light" has no honest existing
--     effect shape. `grant_sense truesight` would overstate the rule.
--
-- Caller-owned / out-of-surface detail:
--   • the emitted Bright/Dim Light itself is treated as the narrative /
--     table-facing envelope of the aura rather than a separate authored
--     effect atom.

let SkillFilter =
      { kind : Text
      , skills : List Text
      }

let PassiveEffect =
      { kind : Text
      , mode : Optional Text
      , on : Optional (List Text)
      , skillFilter : Optional SkillFilter
      , spellId : Optional Text
      }

let ActivationEffect =
      { kind : Text
      , delta : Optional { kind : Text, dice : Natural, dieSize : Natural, sign : Text }
      , on : Optional (List Text)
      }

let ActivationCost = { kind : Text, action : Optional Text }

let UseCountResource =
      { kind : Text
      , cap : { kind : Text, uses : Natural }
      }

let DawnReset =
      { kind : Text
      , regain :
          Optional
            { kind : Text
            , expr : { dice : Natural, dieSize : Natural, flat : Natural }
            }
      }

let DurationValue = { unit : Text, amount : Natural }

let TimedDuration =
      { kind : Text
      , value : DurationValue
      }

let DirectPhase =
      { kind : Text
      , attachment :
          { kind : Text
          , shape : { kind : Text, radiusFeet : Natural }
          , origin : { kind : Text }
          , occupantDispositionFilter : Text
          }
      , effects : List ActivationEffect
      }

let MagicItemPart =
      { family : Text
      , condition : Optional { kind : Text }
      , grants : Optional (List PassiveEffect)
      , activationCost : Optional ActivationCost
      , resource : Optional UseCountResource
      , resetCadence : Optional DawnReset
      , duration : Optional TimedDuration
      , phases : Optional (List DirectPhase)
      }

let rodOfAlertness =
      { kind = "magic_item"
      , id = "magic_item_rod_of_alertness"
      , name = "Rod of Alertness"
      , rarity = "very_rare"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#RodOfAlertness"
          }
      , description =
          "While holding the rod, you have Advantage on Wisdom (Perception) checks and on Initiative rolls. While holding the rod, you can cast Detect Evil and Good, Detect Magic, Detect Poison and Disease, and See Invisibility from it. As a Magic action, you can plant the rod in the ground; for 10 minutes, while in its Bright Light, you and your allies gain a +1 bonus to Armor Class and saving throws. The aura's Invisible-creature-location rider is omitted from this authored subset; see proposal-magic_item_rod_of_alertness.md."
      , mechanics =
          { family = "composite"
          , parts =
              [ { family = "passive"
                , condition = Some { kind = "holding_item" }
                , grants =
                    Some
                      [ { kind = "modify_roll_advantage"
                        , mode = Some "advantage"
                        , on = Some [ "initiative" ]
                        , skillFilter = None SkillFilter
                        , spellId = None Text
                        }
                      , { kind = "modify_roll_advantage"
                        , mode = Some "advantage"
                        , on = Some [ "ability_check" ]
                        , skillFilter =
                            Some
                              { kind = "fixed"
                              , skills = [ "perception" ]
                              }
                        , spellId = None Text
                        }
                      , { kind = "grant_spell_access"
                        , mode = Some "at_will"
                        , on = None (List Text)
                        , skillFilter = None SkillFilter
                        , spellId = Some "detect_evil_and_good"
                        }
                      , { kind = "grant_spell_access"
                        , mode = Some "at_will"
                        , on = None (List Text)
                        , skillFilter = None SkillFilter
                        , spellId = Some "detect_magic"
                        }
                      , { kind = "grant_spell_access"
                        , mode = Some "at_will"
                        , on = None (List Text)
                        , skillFilter = None SkillFilter
                        , spellId = Some "detect_poison_and_disease"
                        }
                      , { kind = "grant_spell_access"
                        , mode = Some "at_will"
                        , on = None (List Text)
                        , skillFilter = None SkillFilter
                        , spellId = Some "see_invisibility"
                        }
                      ]
                , activationCost = None ActivationCost
                , resource = None UseCountResource
                , resetCadence = None DawnReset
                , duration = None TimedDuration
                , phases = None (List DirectPhase)
                }
              , { family = "activation"
                , condition = Some { kind = "holding_item" }
                , grants = None (List PassiveEffect)
                , activationCost =
                    Some
                      { kind = "standard_action"
                      , action = Some "magic"
                      }
                , resource =
                    Some
                      { kind = "use_count"
                      , cap = { kind = "fixed", uses = 1 }
                      }
                , resetCadence =
                    Some
                      { kind = "dawn"
                      , regain =
                          None
                            { kind : Text
                            , expr : { dice : Natural, dieSize : Natural, flat : Natural }
                            }
                      }
                , duration =
                    Some
                      { kind = "timed"
                      , value = { unit = "minute", amount = 10 }
                      }
                , phases =
                    Some
                      [ { kind = "direct"
                        , attachment =
                            { kind = "area"
                            , shape = { kind = "sphere", radiusFeet = 60 }
                            , origin = { kind = "self" }
                            , occupantDispositionFilter = "friendly_to_source"
                            }
                        , effects =
                            [ { kind = "modify_ac"
                              , delta =
                                  Some
                                    { kind = "fixed_dice"
                                    , dice = 1
                                    , dieSize = 1
                                    , sign = "+"
                                    }
                              , on = None (List Text)
                              }
                            , { kind = "modify_roll_numeric"
                              , delta =
                                  Some
                                    { kind = "fixed_dice"
                                    , dice = 1
                                    , dieSize = 1
                                    , sign = "+"
                                    }
                              , on = Some [ "saving_throw" ]
                              }
                            ]
                        }
                      ]
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  rodOfAlertness
