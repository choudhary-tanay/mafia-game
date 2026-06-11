'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'

const ROLES = [
  {
    name: 'Mafia', color: 'text-red-400', icon: '🔴',
    ability: 'Each night, secretly choose one player to eliminate.',
    goal: 'Equal or outnumber the village.',
    tip: 'Blend in during discussions. Mislead the Detective.',
  },
  {
    name: 'Doctor', color: 'text-cyan-400', icon: '💊',
    ability: 'Each night, protect one player from elimination.',
    goal: 'Help the village eliminate all Mafia.',
    tip: 'You can protect yourself. Watch who Mafia might target.',
  },
  {
    name: 'Detective', color: 'text-purple-400', icon: '🔍',
    ability: 'Each night, investigate one player — learn if they are Mafia.',
    goal: 'Help the village by identifying Mafia.',
    tip: 'Share your findings carefully. Mafia may try to silence you.',
  },
  {
    name: 'Villager', color: 'text-green-400', icon: '👤',
    ability: 'No night action.',
    goal: 'Vote out all Mafia during the day.',
    tip: 'Observe who acts suspicious. Your vote is your weapon.',
  },
]

export default function RulesButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-border px-2.5 py-1 text-xs text-text-muted hover:text-text-primary hover:border-text-muted transition-colors"
        aria-label="Game rules"
      >
        ? Rules
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="How to play Mafia">
        <div className="space-y-6 text-sm">

          {/* Overview */}
          <section>
            <h3 className="mb-2 font-semibold text-text-primary">Overview</h3>
            <p className="text-text-muted leading-relaxed">
              Mafia is a hidden-role party game. Each player is secretly assigned a role.
              The Mafia try to eliminate villagers; the Village tries to identify and vote
              out all Mafia before they take control.
            </p>
          </section>

          {/* Roles */}
          <section>
            <h3 className="mb-3 font-semibold text-text-primary">Roles</h3>
            <div className="space-y-3">
              {ROLES.map((r) => (
                <div key={r.name} className="rounded-lg bg-surface-raised p-3 space-y-1">
                  <p className={`font-bold ${r.color}`}>{r.icon} {r.name}</p>
                  <p className="text-text-primary">🎯 <span className="font-medium">Ability:</span> {r.ability}</p>
                  <p className="text-text-muted">🏁 <span className="font-medium">Goal:</span> {r.goal}</p>
                  <p className="text-text-muted">💡 <span className="font-medium">Tip:</span> {r.tip}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Flow */}
          <section>
            <h3 className="mb-2 font-semibold text-text-primary">Game flow</h3>
            <ol className="space-y-2 text-text-muted list-decimal list-inside leading-relaxed">
              <li>Roles are secretly assigned — only you see yours.</li>
              <li><span className="text-blue-400">Night:</span> Mafia choose a target. Doctor chooses who to protect. Detective investigates one player.</li>
              <li><span className="text-amber-400">Morning:</span> The night result is revealed — someone may have died, or the Doctor saved them.</li>
              <li><span className="text-amber-400">Discussion:</span> Everyone debates who the Mafia might be.</li>
              <li><span className="text-red-400">Voting:</span> All alive players vote to eliminate one person, or abstain.</li>
              <li>Repeat until one team wins.</li>
            </ol>
          </section>

          {/* Win */}
          <section>
            <h3 className="mb-2 font-semibold text-text-primary">Win conditions</h3>
            <div className="space-y-2">
              <p className="rounded-lg bg-green-950/30 border border-green-800/30 px-3 py-2 text-green-300">
                🏆 <strong>Village wins</strong> when all Mafia are eliminated.
              </p>
              <p className="rounded-lg bg-red-950/30 border border-red-800/30 px-3 py-2 text-red-300">
                🔴 <strong>Mafia wins</strong> when Mafia players equal or outnumber the village.
              </p>
            </div>
          </section>

          {/* Tie */}
          <section className="text-text-muted">
            <p><strong>Ties:</strong> If the vote is tied, no one is eliminated that day.</p>
          </section>
        </div>
      </Modal>
    </>
  )
}
