# Issue Tracker: GitHub

Issues, specifications, and Wayfinder maps for this repository live in
[GitHub Issues](https://github.com/dearlordylord/5e-quint/issues). Use `gh` from
this checkout so it resolves the `origin` repository automatically.

## Common operations

- Create: `gh issue create --title "..." --body-file <file>`
- Read: `gh issue view <number> --comments`
- List: `gh issue list --state open --json number,title,body,labels,assignees`
- Comment: `gh issue comment <number> --body-file <file>`
- Label: `gh issue edit <number> --add-label "..."`
- Close: `gh issue close <number> --comment "..."`

Pull requests are not a request or triage surface. GitHub shares one number
space between issues and pull requests; if a referenced number is ambiguous,
try `gh issue view` and `gh pr view` to identify its kind.

When a skill says to publish work to the issue tracker, create a GitHub issue.
When it says to fetch a ticket or specification, read the corresponding issue
and its comments.

## Wayfinding operations

A Wayfinder map is one issue labelled `wayfinder:map`. Its decision tickets are
child issues labelled with exactly one of:

- `wayfinder:research`
- `wayfinder:prototype`
- `wayfinder:grilling`
- `wayfinder:task`

Use GitHub sub-issues as the canonical parent-child relationship. After creating
a child, obtain its database ID as described below and attach it to the map:

```sh
gh api --method POST \
  repos/<owner>/<repo>/issues/<map>/sub_issues \
  -F sub_issue_id=<child-database-id>
```

List the map's children in their GitHub sub-issue order with:

```sh
gh api --paginate repos/<owner>/<repo>/issues/<map>/sub_issues
```

If sub-issues are unavailable, add each child to a task list in the map and
begin the child body with `Part of #<map>`.

Use GitHub's native issue dependencies for blocking edges. Add an edge with:

```sh
gh api --method POST \
  repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by \
  -F issue_id=<blocker-database-id>
```

Obtain the database ID—not the issue number or node ID—with:

```sh
gh api repos/<owner>/<repo>/issues/<number> --jq .id
```

If native dependencies are unavailable, put `Blocked by: #<number>` at the top
of the child body. A ticket is unblocked only when every blocker is closed.

The frontier is the map's open child issues with no open blockers and no
assignee, preserving the order returned by the sub-issues endpoint. For each
open child returned by that endpoint:

1. Exclude it when its `assignees` array is nonempty.
2. List its blockers with
   `gh api --paginate repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by`.
3. Exclude it when that response contains any issue whose `state` is `open`.

When native relationships are unavailable, perform the equivalent checks using
the map task list, the child's assignee, and every issue named in its
`Blocked by:` line.

Claim the first remaining child before working it with:

```sh
gh issue edit <number> --add-assignee @me
```

Resolve one by posting the answer as a comment, closing the child, and adding a
one-line context pointer to the map's `Decisions so far` section. The decision
detail remains owned by the child issue; the map only indexes it.
