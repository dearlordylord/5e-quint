let bless =
      { kind = "spell"
      , id = "bless"
      , name = "Bless"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Bless"
          }
      , description =
          "You bless up to three creatures within range. Whenever a target makes an attack roll or a saving throw before the spell ends, the target adds 1d4 to the attack roll or save. Using a Higher-Level Spell Slot: You can target one additional creature for each spell slot level above 1."
      , mechanics =
          { family = "ongoing_effect"
          , level = 1
          , school = "enchantment"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 30 }
          , components = { v = True, s = True, m = Some "a Holy Symbol worth 5+ GP" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , attachment =
              { kind = "target"
              , selection =
                  { mode = "choose_up_to"
                  , count =
                      { kind = "linear"
                      , base = 3
                      , perSlotAboveBase = 1
                      , baseLevel = 1
                      }
                  }
              }
          , operation =
              { kind = "roll_modifier"
              , on = [ "attack_roll", "saving_throw" ]
              , delta = { dice = 1, dieSize = 4, sign = "+" }
              }
          }
      }

in  bless
