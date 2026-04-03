import type { ReactNode } from "react"

export function PageShell({ actions, children, title }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-amber-400">{title}</h1>
        {actions}
      </header>
      {children}
    </div>
  )
}
