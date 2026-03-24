# QA Validation Pipeline — How It Works

This pipeline validates the formal D&D 5e spec ([dnd.qnt](dnd.qnt)) against community-agreed rule interpretations sourced from RPG Stack Exchange and Reddit.

## The Big Picture

```
Raw Data (SE/Reddit)
    │
    ▼
Corpus (.jsonl)         ← parse scripts extract structured Q&A
    │
    ▼
Classification          ← Haiku labels each as "RAW mechanics?" + category
    │
    ▼
Quint Assertions        ← Sonnet translates RAW Q&A into run tests
    │
    ▼
quint test              ← assertions run against dnd.qnt
    │
    ▼
Pass/Fail               ← spec agrees or disagrees with community
```

---

## Stage 1: Data Download

Two independent data sources. Both are large and already downloaded — you skip this unless files are missing.

### Stack Exchange

[scripts/qa/download_se.py](scripts/qa/download_se.py) downloads the full `rpg.stackexchange.com` data dump (~285MB .7z) from archive.org and extracts XML files with 7z.

- Input: archive.org SE dump (2025-12-31)
- Output: `.references/qa2014/raw/rpg.stackexchange.com/Posts.xml` (344MB XML)
- Requires: `brew install 7zip`

### Reddit

[scripts/qa/download_reddit.py](scripts/qa/download_reddit.py) paginates the Arctic Shift API for all r/dndnext posts, then fetches comment trees for posts with score >= 5 and >= 2 comments.

- Input: Arctic Shift API (`arctic-shift.photon-reddit.com`)
- Output: `.references/qa2014/raw/dndnext_posts.jsonl` + `.references/qa2014/raw/dndnext_comments/{id}.json`
- ~279k posts, ~107k comment trees

Both scripts resume from where they left off on rerun.

---

## Stage 2: Parse into Corpus

Parsing extracts the raw downloads into clean JSONL corpora.

### Stack Exchange

[scripts/qa/parse_se.py](scripts/qa/parse_se.py) reads `Posts.xml`, filters to `dnd-5e` tagged questions, and joins each question with its accepted answer.

- Input: `.references/qa2014/raw/rpg.stackexchange.com/Posts.xml`
- Output: `.references/qa2014/se_corpus.jsonl` — 15,107 Q&A pairs
- Each entry: `{source, id, title, question, answer, tags, q_score, a_score, url}`

### Reddit

[scripts/qa/parse_reddit.py](scripts/qa/parse_reddit.py) joins posts with their top 10 root-level comments by score. Filters out `[deleted]`, `[removed]`, AutoModerator. Unwraps the `{kind, data}` envelope from Arctic Shift's comment tree format.

- Input: `.references/qa2014/raw/dndnext_posts.jsonl` + comment tree JSONs
- Output: `.references/qa2014/reddit_corpus.jsonl` — 91,348 entries
- Each entry: `{source, id, title, question, comments[{author, body, score}], flair, score, url}`

---

## Stage 3: Classify

[scripts/qa/classify.py](scripts/qa/classify.py) sends each corpus entry to Claude Haiku via the CLI and asks: "Is this a RAW (Rules As Written) mechanics question?"

### How it calls Claude

```
claude -p --tools "" --model haiku --no-session-persistence \
  --disable-slash-commands --permission-mode bypassPermissions \
  --system-prompt "..." "<formatted entry>"
```

Key flags:
- `--tools ""` — zero tool access (prompt injection safety: public forum data could be adversarial)
- `--model haiku` — fast, cheap via subscription ($0)
- `--no-session-persistence` — no state leaks between entries
- `--permission-mode bypassPermissions` — no interactive prompts in batch

### What it outputs per entry

```json
{"is_raw": true, "category": "hp_death", "rule_summary": "Nat 20 on death save regains 1 HP"}
```

Categories: `combat`, `conditions`, `hp_death`, `ability_checks`, `spellcasting`, `movement`, `equipment`, `class_features`, `rest_resources`, `other_mechanics`, `not_mechanics`

### Caching

Each entry is hashed (SHA256, 16-char prefix of the JSON-serialized entry). Result cached at:
```
.references/qa2014/cache/classify/{hash}.json
```

On rerun, cached entries are skipped. `--limit N` processes only N **uncached** entries, so you grow the dataset incrementally.

### Assembled output

All cached classifications are merged with their original corpus entries into:
```
.references/qa2014/classified.jsonl
```

This file is rebuilt from cache on every run (and on `--rebuild`).

### Commands

```bash
python3 scripts/qa/classify.py --limit 100 --source se --workers 5
python3 scripts/qa/classify.py --rebuild  # rebuild from cache, no API calls
```

---

## Stage 4: Generate Quint Assertions

[scripts/qa/generate_assertions.py](scripts/qa/generate_assertions.py) takes classified RAW entries and asks Claude Sonnet to write Quint `run` tests that encode the community-agreed answer as an assertion against [dnd.qnt](dnd.qnt).

### How it calls Claude

```
claude -p --tools "" --model sonnet --no-session-persistence \
  --disable-slash-commands --permission-mode bypassPermissions \
  --system-prompt "<full dnd.qnt spec + instructions>" "<formatted Q&A>"
```

The entire spec (~2200 lines of [dnd.qnt](dnd.qnt)) is included in the system prompt so Sonnet knows every type, function, and state transition available.

### What each cached assertion looks like

A cached file at `.references/qa2014/cache/assertions/{hash}.qnt` contains raw Quint — no module wrapper, no imports:

```quint
// Is a Raging Barbarian immune to 1-damage attacks?
run qa_resistance_rounds_1_damage_to_zero = {
  val creature = freshCreature(20)
  val result = pTakeDamage(creature, 1, Bludgeoning, Set(Bludgeoning), Set(), Set(), false)
  assert(result.hp == 20)
}
```

If the Q&A can't be encoded with existing spec functions, Sonnet outputs `// SKIP: <reason>` — cached but excluded from the test file. Not a failure; just "spec doesn't cover this yet." Delete the cache entry after extending the spec to retry.

### Typecheck validation

Before caching, each fragment is wrapped in a temp module and run through `quint typecheck`. If it fails (bad syntax, nonexistent function, type error), the fragment is **not cached** and reported as a failure. On the next run it will retry automatically — no manual intervention needed.

### Assembly

`--rebuild` (or end of any run) assembles all non-SKIP cached fragments into [qa_generated.qnt](qa_generated.qnt):

```quint
module qa_generated {
  import dnd.* from "./dnd"

  // ...all cached assertions, indented...
}
```

This file is gitignored — it's generated output.

### Caching

Same content-hash scheme. Cache at:
```
.references/qa2014/cache/assertions/{hash}.qnt
```

`--limit N` processes only N uncached entries.

### Commands

```bash
python3 scripts/qa/generate_assertions.py --limit 10 --workers 3
python3 scripts/qa/generate_assertions.py --category hp_death --limit 5
python3 scripts/qa/generate_assertions.py --titles "death saving,barbarian"
python3 scripts/qa/generate_assertions.py --rebuild
```

---

## Stage 5: Run Tests

[scripts/qa/run_tests.py](scripts/qa/run_tests.py) runs all generated assertions and writes structured results.

```bash
python3 scripts/qa/run_tests.py              # run all tests
python3 scripts/qa/run_tests.py --rebuild    # rebuild .qnt first, then run
```

It calls `quint test qa_generated.qnt --main qa_generated --match "qa_"`, parses the output, and writes:
- `.references/qa2014/test_results.jsonl` — one `{test, status}` per test (`"pass"` or `"fail"`)
- Summary to stdout with failed test names
- Exit code 1 if any failures

### Failure output

For each failure, `run_tests.py` prints:
- Q&A source link (clickable)
- Quint error message
- The failing test code
- A copy-pasteable `rm` command

All failure details are also persisted in `.references/qa2014/test_results.jsonl` with fields: `test`, `status`, `source_url`, `cache_file`, `error`, `code`.

---

## Stage 6: Review Failures

A test failure means the spec and the community answer disagree. Here's how to resolve each one, A to Z.

### Step 1: Run tests

```bash
python3 scripts/qa/run_tests.py --rebuild
```

Failures are printed to stdout and saved to `.references/qa2014/test_results.jsonl`.

### Step 2: For each failure, read the output

The failure block shows you everything:
```
--- [1/3] qa_half_cover_increases_effective_ac ---
Q&A: https://rpg.stackexchange.com/q/143504
Cache: .references/qa2014/cache/assertions/dd513df888c35808.qnt
  Error [QNT508]: Assertion failed
    4337:     assert(nocover.hits and not(halfcover.hits))
              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  Code:
    run qa_half_cover_increases_effective_ac = {
      val nocover = resolveAttackRoll(14, 0, 15, coverBonus(NoCover))
      ...
    }

  Action:
    rm .references/qa2014/cache/assertions/dd513df888c35808.qnt
```

### Step 3: Open the Q&A link, read the rule discussion

Understand what the community says the rule should be.

### Step 4: Diagnose — one of three causes

**A. Spec bug** — the spec doesn't match the PHB rule.
```bash
# Fix dnd.qnt, then verify:
quint test dndTest.qnt --main dndTest      # existing tests still pass
python3 scripts/qa/run_tests.py            # the QA test now passes too
```

**B. Bad Q&A** — the community answer is wrong, or the question is unencodable.
```bash
# Permanently skip: overwrite the cache file with a SKIP marker.
# This is cached — it won't regenerate.
echo '// SKIP: community answer incorrect — <your reason>' > .references/qa2014/cache/assertions/{hash}.qnt

# Rebuild to exclude it from qa_generated.qnt:
python3 scripts/qa/generate_assertions.py --rebuild
```

**C. LLM misinterpretation** — Sonnet wrote bad test code (wrong math, wrong function, etc.)
```bash
# Option 1: Delete and let it regenerate (might produce same error).
rm .references/qa2014/cache/assertions/{hash}.qnt
python3 scripts/qa/generate_assertions.py --limit 1 --workers 1

# Option 2: Manually fix the test code in the cache file.
# Edit .references/qa2014/cache/assertions/{hash}.qnt directly.
# Then rebuild:
python3 scripts/qa/generate_assertions.py --rebuild
python3 scripts/qa/run_tests.py
```

### Step 5: Confirm resolution

```bash
python3 scripts/qa/run_tests.py
# Should show 0 failed, or one fewer failure than before.
```

### Decision summary

| Cause | Action on cache file | Then |
|-------|---------------------|------|
| Spec bug | Keep as-is | Fix `dnd.qnt`, rerun tests |
| Bad Q&A | Overwrite with `// SKIP: reason` | `--rebuild` |
| LLM wrong, retry | `rm {hash}.qnt` | `--limit 1` to regenerate |
| LLM wrong, manual fix | Edit `{hash}.qnt` directly | `--rebuild`, rerun tests |

---

## File Map

| File | Role |
|------|------|
| [dnd.qnt](dnd.qnt) | The spec being validated |
| [dndTest.qnt](dndTest.qnt) | Hand-written unit tests |
| [qa_generated.qnt](qa_generated.qnt) | Auto-generated QA tests (gitignored) |
| [scripts/qa/download_se.py](scripts/qa/download_se.py) | Download SE dump |
| [scripts/qa/download_reddit.py](scripts/qa/download_reddit.py) | Download Reddit via Arctic Shift |
| [scripts/qa/parse_se.py](scripts/qa/parse_se.py) | SE XML → `se_corpus.jsonl` |
| [scripts/qa/parse_reddit.py](scripts/qa/parse_reddit.py) | Reddit JSONL → `reddit_corpus.jsonl` |
| [scripts/qa/classify.py](scripts/qa/classify.py) | Classify entries (Haiku) |
| [scripts/qa/generate_assertions.py](scripts/qa/generate_assertions.py) | Generate Quint tests (Sonnet) + typecheck |
| [scripts/qa/run_tests.py](scripts/qa/run_tests.py) | Run tests, write structured results |
| [scripts/qa/QA_README.md](scripts/qa/QA_README.md) | Operational reference |

### Data (all gitignored in `.references/qa2014/`)

```
.references/qa2014/
  se_corpus.jsonl              ← 15k SE Q&A pairs
  reddit_corpus.jsonl          ← 91k Reddit posts+comments
  classified.jsonl             ← assembled classification results
  test_results.jsonl           ← structured pass/fail per test
  cache/classify/{hash}.json   ← per-entry Haiku classification
  cache/assertions/{hash}.qnt  ← per-entry Sonnet Quint test
```

---

## Quick Reference

```bash
# Classify 100 more entries
python3 scripts/qa/classify.py --limit 100 --source se --workers 5

# Generate 10 Quint tests from classified entries
python3 scripts/qa/generate_assertions.py --limit 10 --workers 3

# Run all generated tests
python3 scripts/qa/run_tests.py --rebuild

# Review failures (see Stage 6 above for full workflow)
# Spec bug:    fix dnd.qnt, rerun
# Bad Q&A:     echo '// SKIP: reason' > .references/qa2014/cache/assertions/{hash}.qnt
# LLM wrong:   rm .references/qa2014/cache/assertions/{hash}.qnt  (auto-retries)
# LLM wrong:   edit .references/qa2014/cache/assertions/{hash}.qnt (manual fix)
```

Each step is resumable. Cached results are never reprocessed. Run the same command again to process the next N.
