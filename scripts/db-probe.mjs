// Dev-only: probe live Supabase schema for columns the code depends on.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function probe(table, cols) {
  const { error } = await supabase.from(table).select(cols).limit(1)
  console.log(`${table}(${cols}):`, error ? `MISSING — ${error.message}` : 'OK')
  return !error
}

await probe('rooms', 'id,code,status,host_user_id')
await probe('rooms', 'host_guest_id')
await probe('room_players', 'guest_id,is_guest')
await probe('room_players', 'display_name,avatar_url,is_host,is_connected,joined_at')
await probe('game_players', 'guest_id,is_guest,display_name')
await probe('night_actions', 'actor_guest_id')
await probe('votes', 'voter_guest_id')
await probe('player_game_stats', 'guest_id,is_guest')
await probe('game_results', 'game_id,winning_team')
await probe('users', 'id,email,full_name,sex,password_hash')
await probe('game_events', 'recipient_user_id,visibility,round_id')

// Can rooms.host_user_id be NULL? Insert a probe row and delete it.
const probeGuest = crypto.randomUUID()
const { data: ins, error: insErr } = await supabase
  .from('rooms')
  .insert({
    code: 'ZZ9PRB',
    host_user_id: null,
    host_guest_id: probeGuest,
    status: 'LOBBY',
    mafia_count: 1,
    discussion_timer_seconds: 180,
    voting_timer_seconds: 60,
    night_timer_seconds: 60,
    reveal_role_on_death: true,
    tie_rule: 'NO_ELIMINATION',
  })
  .select('id')
  .single()

if (insErr) console.log('rooms guest-host insert: FAILED —', insErr.message)
else {
  console.log('rooms guest-host insert: OK')
  await supabase.from('rooms').delete().eq('id', ins.id)
}

// room_players: can guest rows insert? (needs a real room — reuse probe room if it worked)
const { data: room2 } = await supabase
  .from('rooms')
  .insert({
    code: 'ZZ8PRB', host_user_id: null, host_guest_id: probeGuest, status: 'LOBBY',
    mafia_count: 1, discussion_timer_seconds: 180, voting_timer_seconds: 60,
    night_timer_seconds: 60, reveal_role_on_death: true, tie_rule: 'NO_ELIMINATION',
  })
  .select('id')
  .single()

if (room2) {
  const { error: rpErr } = await supabase.from('room_players').insert({
    room_id: room2.id, user_id: null, guest_id: probeGuest, is_guest: true,
    display_name: 'Probe', avatar_url: null, is_host: true, is_connected: true,
  })
  console.log('room_players guest insert:', rpErr ? `FAILED — ${rpErr.message}` : 'OK')
  await supabase.from('room_players').delete().eq('room_id', room2.id)
  await supabase.from('rooms').delete().eq('id', room2.id)
}
