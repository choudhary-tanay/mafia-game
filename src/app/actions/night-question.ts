'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getPlayerIdentity } from '@/lib/identity'
import { hasGuestPlayerColumns, playerIdentityFilter } from '@/lib/guest-schema'

export type NightQuestionAnswerRow = {
  questionText: string
  answerText: string | null
  skipped: boolean
}

/** Submit or update a night question answer for the current player. Non-blocking:
 *  never returns an error that would confuse the user — if the table doesn't
 *  exist yet the game continues normally. */
export async function submitNightQuestionAnswer(
  gameId: string,
  roundId: string,
  questionText: string,
  answerText: string,
): Promise<{ ok: boolean; error?: string }> {
  const identity = await getPlayerIdentity()
  if (!identity) return { ok: false, error: 'Not authenticated.' }

  const supabase = createServiceClient()
  const hasGuestColumns = await hasGuestPlayerColumns(supabase)

  // Guard: only alive players in this game can submit
  const { data: me } = await supabase
    .from('game_players')
    .select('is_alive')
    .eq('game_id', gameId)
    .match(playerIdentityFilter(identity, hasGuestColumns))
    .maybeSingle()

  if (!me?.is_alive) return { ok: false, error: 'Only alive players can answer.' }

  const trimmed = answerText.trim().slice(0, 200)
  const skipped = trimmed.length === 0

  const actorCol = identity.userId || !hasGuestColumns ? 'user_id' : 'guest_id'
  const actorId  = identity.userId ?? identity.guestId!

  // Select-then-insert pattern (partial unique indexes can't arbitrate upserts)
  const { data: existing } = await supabase
    .from('night_question_answers')
    .select('id')
    .eq('round_id', roundId)
    .eq(actorCol, actorId)
    .limit(1)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('night_question_answers')
      .update({ answer_text: skipped ? null : trimmed, skipped })
      .eq('id', existing.id)
  } else {
    await supabase.from('night_question_answers').insert({
      game_id:      gameId,
      round_id:     roundId,
      user_id:      identity.userId  ?? null,
      guest_id:     identity.guestId ?? null,
      question_text: questionText,
      answer_text:  skipped ? null : trimmed,
      skipped,
    })
  }

  // Errors are silently swallowed — the table may not exist yet and the
  // question feature is entirely additive / non-critical.
  return { ok: true }
}

/** Fetch the current player's night question answer for a given round.
 *  Returns null if they haven't answered yet or if the table doesn't exist. */
export async function getMyNightQuestionAnswer(
  roundId: string,
): Promise<NightQuestionAnswerRow | null> {
  const identity = await getPlayerIdentity()
  if (!identity) return null

  const supabase = createServiceClient()
  const hasGuestColumns = await hasGuestPlayerColumns(supabase)
  const actorCol = identity.userId || !hasGuestColumns ? 'user_id' : 'guest_id'
  const actorId  = identity.userId ?? identity.guestId!

  const { data } = await supabase
    .from('night_question_answers')
    .select('question_text, answer_text, skipped')
    .eq('round_id', roundId)
    .eq(actorCol, actorId)
    .limit(1)
    .maybeSingle()

  if (!data) return null
  return {
    questionText: (data as { question_text: string }).question_text,
    answerText:   (data as { answer_text: string | null }).answer_text,
    skipped:      (data as { skipped: boolean }).skipped,
  }
}

/** Fetch anonymous night thoughts for discussion phase display.
 *  Returns an empty array if the table doesn't exist yet. */
export async function getNightThoughts(
  gameId: string,
  roundId: string,
): Promise<string[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('night_question_answers')
    .select('answer_text')
    .eq('game_id', gameId)
    .eq('round_id', roundId)
    .eq('skipped', false)
    .not('answer_text', 'is', null)
    .order('created_at', { ascending: true })

  return (data ?? []).map((r) => (r as { answer_text: string }).answer_text)
}
