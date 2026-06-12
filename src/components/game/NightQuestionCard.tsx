'use client'

import { useState } from 'react'
import { submitNightQuestionAnswer } from '@/app/actions/night-question'
import type { NightQuestionAnswerRow } from '@/app/actions/night-question'
import { Loader2, Send, SkipForward } from 'lucide-react'
import { MoonScene } from '@/components/ui/illustrations'

type Props = {
  gameId: string
  roundId: string
  /** Random question chosen client-side for this session. */
  question: string
  /** Pre-existing answer from the server (for refresh resilience). */
  existingAnswer?: NightQuestionAnswerRow | null
}

export default function NightQuestionCard({ gameId, roundId, question, existingAnswer }: Props) {
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState(
    existingAnswer != null && (existingAnswer.skipped || existingAnswer.answerText !== null),
  )
  const [wasSkipped, setWasSkipped] = useState(existingAnswer?.skipped ?? false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If already answered on a previous session, use the stored question
  const displayQuestion = (existingAnswer?.questionText && submitted)
    ? existingAnswer.questionText
    : question

  async function submit(skip = false) {
    if (isPending) return
    setIsPending(true)
    setError(null)
    const res = await submitNightQuestionAnswer(
      gameId,
      roundId,
      displayQuestion,
      skip ? '' : answer,
    )
    setIsPending(false)
    if (!res.ok && res.error) {
      // Show error only if it's not just a missing table
      if (!res.error.includes('does not exist') && !res.error.includes('relation')) {
        setError(res.error)
      }
    }
    setSubmitted(true)
    setWasSkipped(skip)
  }

  // ── Submitted / skipped state ──────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-blue-900/40 bg-blue-950/20 p-5 animate-fade-up">
        <div className="fog-layer" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <MoonScene size={22} className="text-blue-400 flex-shrink-0" />
            <p className="text-xs font-bold uppercase tracking-widest text-blue-400">Night Thought</p>
          </div>
          <p className="text-sm text-text-muted italic mb-4 leading-relaxed">
            &ldquo;{displayQuestion}&rdquo;
          </p>
          {wasSkipped ? (
            <div className="text-center">
              <p className="text-sm text-text-muted italic">You stayed silent.</p>
              <p className="text-xs text-text-faint mt-1">Waiting for morning…</p>
            </div>
          ) : (
            <div className="rounded-xl border border-blue-800/30 bg-blue-950/30 px-4 py-3">
              <p className="text-xs text-blue-400/80 uppercase tracking-wider mb-1">Your whisper:</p>
              <p className="text-sm text-text-primary leading-relaxed">
                {existingAnswer?.answerText ?? answer}
              </p>
              <p className="text-xs text-text-faint mt-2">Waiting for morning…</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Question form ──────────────────────────────────────────────────────────
  return (
    <div className="relative rounded-2xl border border-blue-900/40 bg-blue-950/20 overflow-hidden animate-fade-up">
      <div className="fog-layer" />
      <div className="relative">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
          <MoonScene size={28} className="text-blue-400 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-400">
              Night Thought
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              The village sleeps, but your mind is awake.
            </p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Question */}
          <div className="rounded-xl border border-blue-800/30 bg-blue-950/30 px-4 py-4">
            <p className="text-base font-semibold italic text-text-primary leading-relaxed text-center">
              &ldquo;{displayQuestion}&rdquo;
            </p>
          </div>

          {/* Answer input */}
          <div className="space-y-1.5">
            <label htmlFor="night-thought-answer" className="text-xs text-text-muted uppercase tracking-wider font-semibold">
              Your answer <span className="text-text-faint">(optional)</span>
            </label>
            <textarea
              id="night-thought-answer"
              value={answer}
              onChange={(e) => { setAnswer(e.target.value.slice(0, 200)); setError(null) }}
              placeholder="Whisper your answer into the dark…"
              rows={3}
              className="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-text-primary placeholder:text-text-faint placeholder:italic resize-none focus:outline-none focus:border-blue-700/60 focus:ring-1 focus:ring-blue-700/30 transition-all"
            />
            <div className="flex items-center justify-between">
              {error && <p className="text-xs text-red-400">⚠ {error}</p>}
              <span className="text-xs text-text-faint ml-auto">{answer.length}/200</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => submit(false)}
              disabled={isPending || answer.trim().length === 0}
              className="flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-blue-700/50 bg-blue-800/40 px-4 py-3 text-sm font-bold text-blue-200 hover:bg-blue-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              Submit Thought
            </button>
            <button
              onClick={() => submit(true)}
              disabled={isPending}
              className="min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-raised px-4 py-3 text-xs text-text-muted hover:text-text-primary hover:bg-surface-high disabled:opacity-40 transition-all"
              title="Skip this question"
            >
              <SkipForward size={14} />
              Skip
            </button>
          </div>

          <p className="text-center text-xs text-text-faint italic">
            Your answer is anonymous and does not affect the game.
          </p>
        </div>
      </div>
    </div>
  )
}
