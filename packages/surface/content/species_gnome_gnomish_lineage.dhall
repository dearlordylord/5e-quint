let LineageGrant
    : Type
    = { kind : Text
      , spellId : Text
      , mode : Optional Text
      , count : Optional { kind : Text }
      , resetCadence : Optional Text
      }

let ClockworkDevice
    : Type
    = { creation :
          { trigger :
              { kind : Text
              , spellId : Text
              , castingTime : { amount : Natural, unit : Text }
              }
          , object :
              { kind : Text
              , size : Text
              , armorClass : Natural
              , hitPoints : Natural
              }
          , storedEffect :
              { kind : Text, optionChoicesLockedAtCreation : Bool }
          }
      , activation : { action : Text, activator : Text, contact : Text }
      , concurrentLimit : Natural
      , duration : { amount : Natural, unit : Text }
      , dismantle : { actor : Text, action : Text, contact : Text }
      }

let LineageOption
    : Type
    = { id : Text
      , displayName : Text
      , mechanics : { family : Text, grants : List LineageGrant }
      , clockworkDevice : Optional ClockworkDevice
      }

let knownMinorIllusion
    : LineageGrant
    = { kind = "grant_spell_access"
      , spellId = "minor_illusion"
      , mode = Some "known"
      , count = None { kind : Text }
      , resetCadence = None Text
      }

let preparedSpeakWithAnimals
    : LineageGrant
    = { kind = "grant_spell_access"
      , spellId = "speak_with_animals"
      , mode = Some "prepared"
      , count = None { kind : Text }
      , resetCadence = None Text
      }

let freeSpeakWithAnimals
    : LineageGrant
    = { kind = "grant_spell_free_casts"
      , spellId = "speak_with_animals"
      , mode = None Text
      , count = Some { kind = "proficiency_bonus" }
      , resetCadence = Some "long_rest"
      }

let knownMending
    : LineageGrant
    = { kind = "grant_spell_access"
      , spellId = "mending"
      , mode = Some "known"
      , count = None { kind : Text }
      , resetCadence = None Text
      }

let knownPrestidigitation
    : LineageGrant
    = { kind = "grant_spell_access"
      , spellId = "prestidigitation"
      , mode = Some "known"
      , count = None { kind : Text }
      , resetCadence = None Text
      }

let rockClockworkDevice
    : ClockworkDevice
    = { creation =
        { trigger =
          { kind = "prestidigitation_cast"
          , spellId = "prestidigitation"
          , castingTime = { amount = 10, unit = "minute" }
          }
        , object =
          { kind = "clockwork_device"
          , size = "tiny"
          , armorClass = 5
          , hitPoints = 1
          }
        , storedEffect =
          { kind = "one_prestidigitation_effect_chosen_at_creation"
          , optionChoicesLockedAtCreation = True
          }
        }
      , activation =
        { action = "bonus_action"
        , activator = "self_or_another_creature"
        , contact = "touch"
        }
      , concurrentLimit = 3
      , duration = { amount = 8, unit = "hour" }
      , dismantle = { actor = "creator", action = "utilize", contact = "touch" }
      }

let forestGnome
    : LineageOption
    = { id = "forest_gnome"
      , displayName = "Forest Gnome"
      , mechanics =
        { family = "passive"
        , grants =
          [ knownMinorIllusion, preparedSpeakWithAnimals, freeSpeakWithAnimals ]
        }
      , clockworkDevice = None ClockworkDevice
      }

let rockGnome
    : LineageOption
    = { id = "rock_gnome"
      , displayName = "Rock Gnome"
      , mechanics =
        { family = "passive"
        , grants = [ knownMending, knownPrestidigitation ]
        }
      , clockworkDevice = Some rockClockworkDevice
      }

let gnomishLineage =
      { description =
          "Choose either Forest Gnome or Rock Gnome, and choose Intelligence, Wisdom, or Charisma as the spellcasting ability for spells from this trait."
      , id = "species_gnome_gnomish_lineage"
      , kind = "species_trait"
      , mechanics =
        { family = "species_lineage_choice"
        , choiceKey = "gnome_lineage"
        , timing = "species_selection"
        , spellcastingAbilityChoice =
          { kind = "spellcasting_ability_choice"
          , abilities = [ "int", "wis", "cha" ]
          }
        , options = [ forestGnome, rockGnome ]
        }
      , name = "Gnomish Lineage"
      , provenance =
        { kind = "srd-5.2.1"
        , section = "Character-Origins/Gnome#Gnomish Lineage"
        }
      , species = "gnome"
      }

in  gnomishLineage
