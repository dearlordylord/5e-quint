let selfRestoration =
      { kind = "class_feature"
      , id = "monk_self_restoration"
      , name = "Self-Restoration"
      , className = "monk"
      , acquiredAtLevel = 10
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Monk.md:152-156" }
      , description =
          "At the end of each of your turns, you can remove one of these conditions from yourself: Charmed, Frightened, or Poisoned. In addition, forgoing food and drink doesn't give you levels of Exhaustion."
      , mechanics = { family = "passive", grants = [] : List {} }
      }

in  selfRestoration
