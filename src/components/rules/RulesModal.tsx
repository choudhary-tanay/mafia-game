'use client'

import { useState } from 'react'
import { BookOpen, Target, Moon, Lightbulb, Trophy } from 'lucide-react'
import Modal from '@/components/ui/Modal'

const ROLES = [
  {
    name: 'Mafia',
    color: 'text-red-400',
    border: 'border-red-900/50',
    bg: 'bg-red-950/20',
    icon: '🔴',
    ability: 'Each night, secretly choose one player to eliminate.',
    goal: 'Equal or outnumber the village.',
    tip: 'Blend in during discussions. Never look too eager to vote.',
  },
  {
    name: 'Doctor',
    color: 'text-cyan-400',
    border: 'border-cyan-900/50',
    bg: 'bg-cyan-950/20',
    icon: '💊',
    ability: 'Each night, choose one player to protect from elimination.',
    goal: 'Help the village eliminate all Mafia.',
    tip: 'You can protect yourself. Watch who Mafia might target.',
  },
  {
    name: 'Detective',
    color: 'text-purple-400',
    border: 'border-purple-900/50',
    bg: 'bg-purple-950/20',
    icon: '🔍',
    ability: 'Each night, investigate one player — you learn if they are Mafia.',
    goal: 'Use your knowledge to guide the village.',
    tip: 'Share findings carefully. The Mafia may try to eliminate you.',
  },
  {
    name: 'Villager',
    color: 'text-emerald-400',
    border: 'border-emerald-900/50',
    bg: 'bg-emerald-950/20',
    icon: '👥',
    ability: 'No night action.',
    goal: 'Vote out all Mafia during the day.',
    tip: 'Observe who acts suspicious. Your vote is your power.',
  },
]

export default function RulesButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted hover:text-text-primary hover:bg-surface-raised hover:border-border-bright transition-all"
        aria-label="How to play"
      >
        <BookOpen size={13} />
        Rules
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="How to play Mafia">
        <div className="space-y-8 text-sm">

          {/* Quick summary */}
          <section className="rounded-xl border border-border bg-surface-raised p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3 flex items-center gap-2">
              <Lightbulb size={12} />
              Quick rules
            </p>
            <div className="space-y-2">
              {[
                'Mafia secretly picks who dies each night.',
                'Doctor protects one player each night.',
                'Detective investigates one player each night.',
                'Everyone discusses and votes during the day.',
                'Village wins by eliminating all Mafia.',
                'Mafia wins when they equal or outnumber the village.',
              ].map((rule, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-surface-high text-xs text-text-muted font-mono">
                    {i + 1}
                  </span>
                  <p className="text-text-primary text-xs leading-relaxed">{rule}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Roles */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4 flex items-center gap-2">
              <Target size={12} />
              Roles
            </p>
            <div className="space-y-3">
              {ROLES.map((r) => (
                <div key={r.name} className={`rounded-xl border ${r.border} ${r.bg} p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{r.icon}</span>
                    <p className={`font-bold text-base ${r.color}`}>{r.name}</p>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <p className="text-text-primary"><span className="text-text-muted">Ability: </span>{r.ability}</p>
                    <p className="text-text-muted"><span className="font-medium text-text-primary">Goal: </span>{r.goal}</p>
                    <p className="text-text-faint border-t border-border/50 pt-1.5 mt-1.5"><span className="text-text-muted">Tip: </span>{r.tip}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Game flow */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4 flex items-center gap-2">
              <Moon size={12} />
              Game flow
            </p>
            <div className="space-y-3">
              {[
                { phase: 'Role Reveal', icon: '🎭', text: 'Secret roles are assigned. Only you see your role.' },
                { phase: 'Night', icon: '🌙', text: 'Mafia chooses a target. Doctor protects someone. Detective investigates.' },
                { phase: 'Morning', icon: '☀️', text: 'The night result is revealed — someone may have died, or been saved.' },
                { phase: 'Discussion', icon: '💬', text: 'Everyone talks. Debate, accuse, defend. Find the Mafia.' },
                { phase: 'Voting', icon: '🗳️', text: 'All alive players vote to eliminate one person, or abstain.' },
              ].map((item) => (
                <div key={item.phase} className="flex items-start gap-3 p-3 rounded-xl bg-surface-raised">
                  <span className="text-lg leading-none">{item.icon}</span>
                  <div>
                    <p className="font-semibold text-text-primary text-xs uppercase tracking-wider mb-0.5">{item.phase}</p>
                    <p className="text-text-muted text-xs leading-relaxed">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Win conditions */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4 flex items-center gap-2">
              <Trophy size={12} />
              Win conditions
            </p>
            <div className="space-y-2.5">
              <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-4">
                <p className="font-bold text-emerald-400 mb-1">🏆 Village wins</p>
                <p className="text-text-muted text-xs">When all Mafia players are eliminated from the game.</p>
              </div>
              <div className="rounded-xl border border-red-800/40 bg-red-950/20 p-4">
                <p className="font-bold text-red-400 mb-1">🔴 Mafia wins</p>
                <p className="text-text-muted text-xs">When Mafia players equal or outnumber the remaining village.</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-raised p-4">
                <p className="font-bold text-text-primary mb-1">🤝 Ties</p>
                <p className="text-text-muted text-xs">If the vote is tied, no one is eliminated that round.</p>
              </div>
            </div>
          </section>

        </div>
      </Modal>
    </>
  )
}
