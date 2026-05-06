// -*- mode: Bluespec; -*-

module qcore0BlowupPoc {
  var qScore: int
  var qSeen: Set[int]

  action init = all {
    qScore' = 0,
    qSeen' = Set(),
  }

  action narrowStep = {
    nondet damage = 1.to(2).oneOf()
    nondet hit = Set(true, false).oneOf()
    all {
      qScore' = qScore + if (hit) damage else 0,
      qSeen' = qSeen,
    }
  }

  action wideStep = {
    nondet target = 1.to(4).oneOf()
    nondet attackRoll = 1.to(20).oneOf()
    nondet damage = 0.to(24).oneOf()
    all {
      qScore' = qScore + target + attackRoll + damage,
      qSeen' = qSeen,
    }
  }

  action narrowSetStep = {
    nondet picked = 1.to(4).powerset().oneOf()
    all {
      qScore' = qScore + picked.size(),
      qSeen' = picked,
    }
  }

  action wideSetStep = {
    nondet picked = 1.to(12).powerset().oneOf()
    all {
      qScore' = qScore + picked.size(),
      qSeen' = picked,
    }
  }

  action composedNarrowStep = any {
    narrowStep,
    narrowStep,
    narrowStep,
  }

  action composedWideStep = any {
    wideStep,
    wideStep,
    wideStep,
  }

  action step = composedNarrowStep

  val invariant = all {
    qScore >= 0,
    qSeen.forall(i => i.in(1.to(12))),
  }
}
