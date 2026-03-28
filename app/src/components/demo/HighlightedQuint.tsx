/** Simple syntax highlighter for Quint (BlueSpec-like) source snippets. */
export function HighlightedQuint({ source }: { readonly source: string }) {
  const lines = source.split("\n")
  return (
    <>
      {lines.map((line, i) => {
        const commentMatch = line.match(/^(\s*)(\/\/\/.*)$/) ?? line.match(/^(\s*)(\/\/.*)$/)
        if (commentMatch) {
          return (
            <div key={i}>
              <span>{commentMatch[1]}</span>
              <span className="text-gray-500 italic">{commentMatch[2]}</span>
            </div>
          )
        }

        const parts: Array<{ text: string; type: "text" | "keyword" | "type" | "number" | "string" }> = []
        const tokenRegex =
          /\b(pure|def|val|if|else|and|not|or|action|all|match|Set|List|Map|true|false|type)\b|\b(FighterState|TurnState|CreatureState|CharConfig|SpellSlotState|ConcBreakResult|ActiveEffect|StartOfTurnEffect|EndOfTurnSave|EndOfTurnDamage|ActionType|DamageType|Condition|ArmorState|GrappleShoveResult|AttackRollResult|bool|int|str)\b|\b(\d+)\b|("[^"]*")/g
        let lastIndex = 0
        let match: RegExpExecArray | null
        tokenRegex.lastIndex = 0

        while ((match = tokenRegex.exec(line)) !== null) {
          if (match.index > lastIndex) {
            parts.push({ text: line.slice(lastIndex, match.index), type: "text" })
          }
          if (match[1]) parts.push({ text: match[0], type: "keyword" })
          else if (match[2]) parts.push({ text: match[0], type: "type" })
          else if (match[3]) parts.push({ text: match[0], type: "number" })
          else if (match[4]) parts.push({ text: match[0], type: "string" })
          lastIndex = match.index + match[0].length
        }
        if (lastIndex < line.length) {
          parts.push({ text: line.slice(lastIndex), type: "text" })
        }

        return (
          <div key={i}>
            {parts.map((p, j) => {
              const cls =
                p.type === "keyword"
                  ? "text-violet-400 font-semibold"
                  : p.type === "type"
                    ? "text-cyan-400"
                    : p.type === "number"
                      ? "text-amber-300"
                      : p.type === "string"
                        ? "text-emerald-400"
                        : "text-gray-200"
              return (
                <span key={j} className={cls}>
                  {p.text}
                </span>
              )
            })}
          </div>
        )
      })}
    </>
  )
}
