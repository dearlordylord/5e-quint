# Article Structure Draft

## Angle

Formal spec as remedy for vibe code slop. LLMs generate code at every layer; each layer verifies the one above it mechanically. You don't review LLM output line by line — you write a spec, and the spec catches errors.

NOT "I wrote a game." It's a pipeline / methodology demonstration using D&D as the concrete domain.

## Hook

"LLMs generate my formal spec code. A large chunk of what they generate is wrong. It doesn't matter — the typechecker catches it before it's cached, the pipeline retries, no human review needed."

## Structure

1. **Hook** — counterintuitive: high LLM failure rate, still works
2. **The pipeline** — SRD docs -> Quint spec -> XState implementation, each layer verified by the next
   - Quint typechecker catches bad spec code
   - MBT catches XState divergence from spec (random traces, field-by-field comparison)
   - QA assertions catch spec bugs against community rulings
   - Depth example: Fighter class modeled L1–L18 (Champion subclass), every feature formally specified and MBT-verified against XState
3. **Star feature: QA corpus** — community D&D arguments auto-translated into Quint assertions
   - Show the grapple leapfrog example (two characters drag each other for 2x speed)
   - "Real people argued about this on Reddit. An LLM turned it into a formal assertion. The spec confirms it."
4. **The high failure rate** — why it's fine
   - Typecheck wraps every fragment, rejects garbage, retries
   - Three-tier error classification: spec bug, bad Q&A, LLM misinterpretation
   - Each has a structured fix path
5. **1-2 Quint snippets** — prone lock or similar, show it reads like pseudocode but is machine-checked
6. **Link to Monadical blog post** — broader philosophy of separating controlling code from vibe code
7. **CTA** — try Quint (formal proofs), try XState (state machines), here's the repo

## QA examples for the article

See `BLOG_QA_EXAMPLES.md` — five community-discovered exploits with Quint assertions. Use the grapple leapfrog and prone lock examples in the article.

## What NOT to do

- Don't frame it as "I built a game"
- Don't lead with Quint syntax (readers don't know it yet)
- Don't make it a Monadical sales pitch
- Don't use the term "overseer pattern" — not a community term
- Don't over-explain D&D rules — the examples should be self-evident

## Where to publish

Personal blog.

## Links to include

- Repo: https://github.com/dearlordylord/5e-quint
- Monadical vibe code blog post: https://monadical.com/posts/vibe-code-how-to-stay-in-control.html
- Quint: https://github.com/informalsystems/quint
- XState: https://xstate.js.org/
- SRD 5.2.1: https://www.dndbeyond.com/resources/1781-systems-reference-document-srd (CC-BY-4.0)
- MBT bridge: https://github.com/dearlordylord/quint-connect-ts (@firfi/quint-connect)

---

## Twitter strategy

Small following — rely on tags, hashtags, and pinging the right people.

**People to tag (verify handles before posting):**
- @DavidKPiano — XState creator, directly relevant
- @Hillelogram — Hillel Wayne, formal methods educator, large following
- @DominicTornow — deterministic simulation advocate
- @TigerBeetleDB — TigerBeetle, into deterministic simulation
- Gabriela Moreira — core Quint developer (find handle)
- Informal Systems account (find handle)
- Igor Konnov — Quint creator (find handle)

**Hashtags:** #FormalMethods #TLAPlus #ModelBasedTesting #XState #StateMachines

### Post series (synced with other channels)

**Post 1 — synced with Quint Telegram (Phase 1)**
- Angle: Quint + the project itself
- "Wrote a Quint spec of D&D 5e combat — core rules, full Fighter class, Champion subclass. MBT proves parity with XState implementation."
- Tag Quint/Informal Systems people
- Repo link
- #FormalMethods #TLAPlus

**Post 2 — when article drops (Phase 4)**
- Angle: the code generation / vibe code remedy story
- Lead with the hook: "LLMs generate my formal spec code. A large chunk fails. Caught mechanically."
- Link to article
- Tag @Hillelogram, @DominicTornow
- #FormalMethods #ModelBasedTesting

**Post 3 — the viral D&D example (Phase 4, day after article)**
- Angle: the fun one — a specific QA exploit
- Show a Quint snippet (grapple leapfrog or prone lock)
- "This was auto-generated from a Reddit argument and machine-checked against a formal spec."
- Most shareable — D&D audience + tech audience overlap
- Quote-tweet post 2 or link to article

**Post 4 — XState angle (Phase 4, same week)**
- Angle: MBT proving XState correctness
- "Random traces, field-by-field comparison between Quint spec and XState machine. If they disagree, the test fails."
- Tag @DavidKPiano
- #XState #StateMachines

**Post 5 — deterministic simulation angle (Phase 4, same week)**
- Angle: the methodology as generalizable approach
- "Formal spec -> MBT -> implementation. Works for any written rules corpus."
- Tag @TigerBeetleDB, @DominicTornow
- Link back to article

---

## Quint Telegram post (Phase 1, synced with Twitter Post 1)

**Ideas — not final text:**
- Built a substantial project in Quint — formal spec of D&D 5e combat rules from SRD 5.2.1, including full Fighter class (Champion subclass L1–L18)
- MBT bridge proves XState implementation matches the spec (random traces, field-by-field comparison)
- QA pipeline: community Q&A from Reddit/StackExchange auto-translated into Quint assertions by LLM, typechecked, run against the spec
- High LLM generation failure rate caught by Quint typechecker — pipeline retries automatically
- Repo link
- Would love feedback on the spec / how Quint was used
