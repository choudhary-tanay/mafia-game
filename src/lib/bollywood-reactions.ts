// Phase 10 — Bollywood Style Mode
// Pure config + event computation, no browser APIs, safe for server import.

export type BollywoodEventConfig = {
  imagePath: string
  caption: string
  durationMs: number
  priority: number
}

/** All 29 supported Bollywood reaction configs. */
export const BOLLYWOOD: Record<string, BollywoodEventConfig> = {
  '01': { imagePath: '/bollywood/01_doctor_blocks_mafia_attack.jpg',    caption: 'Kya gunda banega re tu',                                    durationMs: 4500, priority: 3 },
  '02': { imagePath: '/bollywood/02_mafia_kill_victim_view.png',         caption: 'Humko maro, humko zinda mat chhodo saalo',                  durationMs: 5000, priority: 4 },
  '03': { imagePath: '/bollywood/03_mafia_kill_mafia_view.png',          caption: 'Shhh... kaam ho gaya.',                                    durationMs: 4000, priority: 4 },
  '04': { imagePath: '/bollywood/04_doctor_self_save.jpg',               caption: 'Bilkul risk nahi lene ka',                                  durationMs: 4000, priority: 3 },
  '05': { imagePath: '/bollywood/05_mafia_caught_others_alive.png',      caption: 'Ab underground hone ka samay aa gaya hai',                  durationMs: 4500, priority: 5 },
  '06': { imagePath: '/bollywood/06_villagers_win_common_man.png',       caption: "Don't underestimate the power of a common man",             durationMs: 5500, priority: 1 },
  '07': { imagePath: '/bollywood/07_mafia_loses.png',                    caption: 'Beta tumse na ho payega',                                   durationMs: 5000, priority: 1 },
  '08': { imagePath: '/bollywood/08_mafia_wins.png',                     caption: 'Main hoon Don',                                            durationMs: 5500, priority: 1 },
  '09': { imagePath: '/bollywood/09_wrong_villager_voted_public.png',    caption: 'Meri aankhon me dekh',                                     durationMs: 4000, priority: 5 },
  '10': { imagePath: '/bollywood/10_wrong_villager_voted_private.png',   caption: 'Galat insaan pakad liya',                                  durationMs: 4500, priority: 5 },
  '11': { imagePath: '/bollywood/11_detective_finds_mafia.png',          caption: 'Tera toh game bajana padega',                              durationMs: 4500, priority: 2 },
  '12': { imagePath: '/bollywood/12_detective_finds_innocent.png',       caption: 'Abey saale',                                               durationMs: 3500, priority: 2 },
  '13': { imagePath: '/bollywood/13_no_one_dies_at_night.png',           caption: 'Bach gaya saale',                                          durationMs: 4000, priority: 7 },
  '14': { imagePath: '/bollywood/14_lone_mafia_comeback.png',            caption: 'Game abhi baaki hai',                                      durationMs: 4500, priority: 1 },
  '15': { imagePath: '/bollywood/15_first_elimination.png',              caption: 'Bhagoo!',                                                  durationMs: 3500, priority: 7 },
  '16': { imagePath: '/bollywood/16_tie_vote_no_elimination.png',        caption: 'Yaar aise game me cheating hogi to mai nahi khelunga',     durationMs: 5000, priority: 6 },
  '17': { imagePath: '/bollywood/17_doctor_dies.png',                    caption: 'Aise kaun karta hai bhai',                                 durationMs: 4500, priority: 7 },
  '18': { imagePath: '/bollywood/18_detective_dies.png',                 caption: 'Sir ek buri khabar hai',                                  durationMs: 4500, priority: 7 },
  '19': { imagePath: '/bollywood/19_mafia_caught_overconfident.png',     caption: 'Zyada hawa mat banao, pakde jaoge',                       durationMs: 4000, priority: 5 },
  '20': { imagePath: '/bollywood/20_doctor_clutch_save.png',             caption: 'Main to nahin hoon insaano mein',                         durationMs: 5000, priority: 3 },
  '21': { imagePath: '/bollywood/21_village_perfect_vote.png',           caption: 'Miracle! Miracle!',                                        durationMs: 4500, priority: 5 },
  '22': { imagePath: '/bollywood/22_everyone_abstains.png',              caption: 'Beta maine gandi gaali de deni hai',                      durationMs: 4500, priority: 6 },
  '23': { imagePath: '/bollywood/23_doctor_saves_other_player.png',      caption: 'Itni khushi mujhe aaj tak nahi hui',                       durationMs: 4500, priority: 3 },
  '24': { imagePath: '/bollywood/24_target_survives_due_to_doctor.jpg',  caption: 'Bach gaya saale',                                         durationMs: 4000, priority: 3 },
  '25': { imagePath: '/bollywood/25_mafia_kill_fails.png',               caption: 'Nahi... sachhi? Main nahi manta',                         durationMs: 4500, priority: 4 },
  '26': { imagePath: '/bollywood/26_village_eliminates_doctor.gif',      caption: 'Aise kaun karta hai bhai',                                durationMs: 5000, priority: 5 },
  '27': { imagePath: '/bollywood/27_village_eliminates_detective.png',   caption: 'Sir ek buri khabar hai',                                  durationMs: 5000, priority: 5 },
  '28': { imagePath: '/bollywood/28_unanimous_vote.png',                 caption: 'Hamare mohalle ka shikari hai ye',                        durationMs: 4500, priority: 5 },
  '29': { imagePath: '/bollywood/29_repeated_tie_no_decision.jpg',       caption: 'Yaar aise game me cheating hogi to mai nahi khelunga',    durationMs: 5000, priority: 6 },
}

export type BollywoodEvent = {
  /** Unique ID for sessionStorage dedup (eventId + key suffix). */
  id: string
  key: string
  imagePath: string
  caption: string
  durationMs: number
}

function make(key: string, eventId: string): BollywoodEvent | null {
  const cfg = BOLLYWOOD[key]
  if (!cfg) return null
  return { id: `${eventId}-${key}`, key, imagePath: cfg.imagePath, caption: cfg.caption, durationMs: cfg.durationMs }
}

export type AnnExt = {
  id: string
  event_type: string
  target_player_id: string | null
  round_id: string | null
  message: string
  created_at: string
}

export type ComputeCtx = {
  roundId: string | null
  roundNumber: number
  allAnnouncements: AnnExt[]
  myRole: string
  myIsAlive: boolean
  myStableId: string
  detectiveResult: string | null
  players: Array<{ user_id: string; is_alive: boolean; role?: string; display_name: string }>
  voteCounts: Array<{ user_id: string; count: number }> | undefined
  revealRoleOnDeath: boolean
  myNightActionTargetId: string | null | undefined
  winningTeam: string | null
  phase: string
}

/**
 * Pure function — derives Bollywood events this player is authorized to see
 * from game state already scoped to their perspective. Safe: never exposes
 * private data beyond what the server already sent this player.
 * Returns events sorted by priority, max 2 per call.
 */
export function computeBollywoodEvents(ctx: ComputeCtx): BollywoodEvent[] {
  const events: BollywoodEvent[] = []

  const push = (key: string, eventId: string) => {
    const e = make(key, eventId)
    if (e) events.push(e)
  }

  // Events in the current round only (avoid replaying history)
  const roundEvents = ctx.roundId
    ? ctx.allAnnouncements.filter((a) => a.round_id === ctx.roundId)
    : []

  // Tie count across the whole game (for scenario 29)
  const tieCount = ctx.allAnnouncements.filter(
    (a) => a.event_type === 'NO_ELIMINATION_TIE',
  ).length

  // Total eliminations across the whole game (for scenario 15 "first")
  const totalDeaths = ctx.allAnnouncements.filter(
    (a) => a.event_type === 'PLAYER_KILLED_BY_MAFIA' || a.event_type === 'PLAYER_ELIMINATED_BY_VOTE',
  ).length

  // Only process event types that are relevant to the CURRENT phase.
  // This prevents night-kill events (stored in the same round) from being
  // re-processed on VOTING/VOTE_RESOLUTION renders, which would change the
  // dependency string and fire the GameView effect a second time.
  const PHASE_ALLOWED_EVENTS: Record<string, string[]> = {
    NIGHT_RESOLUTION:  ['PLAYER_KILLED_BY_MAFIA', 'PLAYER_SAVED_BY_DOCTOR', 'NIGHT_QUIET'],
    DISCUSSION:        ['PLAYER_KILLED_BY_MAFIA', 'PLAYER_SAVED_BY_DOCTOR', 'NIGHT_QUIET'],
    DAY_ANNOUNCEMENT:  ['PLAYER_KILLED_BY_MAFIA', 'PLAYER_SAVED_BY_DOCTOR', 'NIGHT_QUIET'],
    VOTING:            ['PLAYER_KILLED_BY_MAFIA', 'PLAYER_SAVED_BY_DOCTOR', 'NIGHT_QUIET'],
    VOTE_RESOLUTION:   ['PLAYER_ELIMINATED_BY_VOTE', 'NO_ELIMINATION_TIE', 'NO_ELIMINATION_ABSTAIN'],
    GAME_OVER:         ['GAME_ENDED', 'PLAYER_ELIMINATED_BY_VOTE', 'NO_ELIMINATION_TIE', 'NO_ELIMINATION_ABSTAIN'],
    NIGHT_ACTIONS_OPEN:['PLAYER_KILLED_BY_MAFIA', 'PLAYER_SAVED_BY_DOCTOR', 'NIGHT_QUIET'],
  }
  const allowedTypes = PHASE_ALLOWED_EVENTS[ctx.phase] ?? Object.values(PHASE_ALLOWED_EVENTS).flat()
  const phaseScopedEvents = roundEvents.filter((a) => allowedTypes.includes(a.event_type))

  for (const ann of phaseScopedEvents) {
    const targetPlayer = ann.target_player_id
      ? ctx.players.find((p) => p.user_id === ann.target_player_id)
      : null
    const targetRole = targetPlayer?.role ?? null // only populated when revealRoleOnDeath or GAME_OVER

    switch (ann.event_type) {

      case 'PLAYER_KILLED_BY_MAFIA': {
        // Scenario 15: first death in the whole game
        if (totalDeaths === 1) push('15', ann.id)

        // Scenario 02: I was the victim (I just died)
        if (ann.target_player_id === ctx.myStableId) push('02', ann.id)

        // Scenario 03: Mafia views their successful kill
        else if (ctx.myRole === 'MAFIA') push('03', ann.id)

        // Scenario 17/18: Doctor/Detective killed (only when role visible)
        if (targetRole === 'DOCTOR') push('17', ann.id)
        else if (targetRole === 'DETECTIVE') push('18', ann.id)
        break
      }

      case 'PLAYER_SAVED_BY_DOCTOR': {
        // Scenario 01: All — Mafia attack blocked
        push('01', ann.id)

        // Scenario 25: Mafia's kill was foiled
        if (ctx.myRole === 'MAFIA') push('25', ann.id)

        // Scenario 24: I was the target and survived (check if I was the mafia target this round)
        // We can infer: if I'm alive AND the saved player event exists AND I was targeted
        // myNightActionTargetId for MAFIA is who they targeted; for Doctor is who they saved.
        // From the non-mafia perspective we don't know who was targeted.
        // Only show 24 if we KNOW the player was the target (server can derive this).
        // Conservative: show only to detective since they investigate patterns.
        // Actually skip 24 — can't safely compute without leaking who the Mafia targeted.

        // Scenario 04/20/23: Doctor's perspective
        if (ctx.myRole === 'DOCTOR' && ctx.myNightActionTargetId != null) {
          const aliveCount = ctx.players.filter((p) => p.is_alive).length
          const isSelfSave = ctx.myNightActionTargetId === ctx.myStableId

          if (isSelfSave) {
            push('04', ann.id)
          } else if (aliveCount <= 4) {
            push('20', ann.id) // Clutch save — late game
          } else {
            push('23', ann.id) // Saved another player
          }
        }
        break
      }

      case 'NIGHT_QUIET': {
        // Scenario 13: No one died
        push('13', ann.id)
        break
      }

      case 'PLAYER_ELIMINATED_BY_VOTE': {
        // Scenario 15: first elimination in game
        if (totalDeaths === 1) push('15', ann.id)

        const isMyElimination = ann.target_player_id === ctx.myStableId
        const isMafiaEliminated = targetRole === 'MAFIA'

        if (isMafiaEliminated) {
          // Correct elimination — village success reactions
          // Scenario 21: Perfect vote
          push('21', ann.id)

          // Scenario 28: unanimous vote (only 1 target got any votes)
          if (ctx.voteCounts && ctx.voteCounts.length === 1) push('28', ann.id)

          // Scenario 05: Remaining Mafia members see a teammate fall
          if (ctx.myRole === 'MAFIA' && ctx.myIsAlive) push('05', ann.id)

          // Scenario 19: Mafia eliminated early (rounds 1–2)
          if ((ctx.myRole === 'MAFIA' || isMyElimination) && ctx.roundNumber <= 2) push('19', ann.id)
        } else {
          // Wrong player eliminated
          // Scenario 09: Public — only when revealRoleOnDeath shows the role
          if (ctx.revealRoleOnDeath && targetRole && targetRole !== 'MAFIA') push('09', ann.id)

          // Scenario 10: Private — only to the eliminated non-Mafia player
          if (isMyElimination) push('10', ann.id)

          // Scenario 26/27: specific role eliminated by vote
          if (ctx.revealRoleOnDeath || isMyElimination) {
            if (targetRole === 'DOCTOR') push('26', ann.id)
            else if (targetRole === 'DETECTIVE') push('27', ann.id)
          } else if (isMyElimination) {
            // Private to eliminated player regardless of reveal setting
            if (ctx.myRole === 'DOCTOR') push('26', ann.id)
            else if (ctx.myRole === 'DETECTIVE') push('27', ann.id)
          }

          // Scenario 28: unanimous vote even for wrong target
          if (ctx.voteCounts && ctx.voteCounts.length === 1) push('28', ann.id)
        }
        break
      }

      case 'NO_ELIMINATION_TIE': {
        // Scenario 29 if 2nd+ tie; scenario 16 for first
        push(tieCount >= 2 ? '29' : '16', ann.id)
        break
      }

      case 'NO_ELIMINATION_ABSTAIN': {
        push('22', ann.id)
        break
      }

      case 'GAME_ENDED': {
        if (ctx.winningTeam === 'VILLAGE') {
          if (ctx.myRole !== 'MAFIA') push('06', ann.id)
          else push('07', ann.id) // Mafia lost
        } else if (ctx.winningTeam === 'MAFIA') {
          if (ctx.myRole === 'MAFIA') {
            // Lone Mafia comeback if only 1 Mafia remains
            const aliveMafia = ctx.players.filter((p) => p.is_alive && p.role === 'MAFIA').length
            if (aliveMafia === 1) push('14', ann.id)
            push('08', ann.id)
          }
        }
        break
      }
    }
  }

  // Detective private reactions (based on this round's investigation)
  if (ctx.myRole === 'DETECTIVE' && ctx.detectiveResult && ctx.roundId) {
    const key = ctx.detectiveResult.includes('MAFIA') ? '11' : '12'
    push(key, `detective-${ctx.roundId}`)
  }

  // Deduplicate by key (keep first occurrence)
  const seen = new Set<string>()
  const deduped = events.filter((e) => {
    if (seen.has(e.key)) return false
    seen.add(e.key)
    return true
  })

  // Sort by priority (lower number = higher priority)
  deduped.sort(
    (a, b) => (BOLLYWOOD[a.key]?.priority ?? 9) - (BOLLYWOOD[b.key]?.priority ?? 9),
  )

  // Max 2 popups per event cycle so we don't spam
  return deduped.slice(0, 2)
}
