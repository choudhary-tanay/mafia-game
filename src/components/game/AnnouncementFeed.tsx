import type { Announcement } from '@/types/database'

export default function AnnouncementFeed({ announcements }: { announcements: Announcement[] }) {
  if (!announcements.length) return null
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-muted">
        Announcements
      </h2>
      <ul className="space-y-2 max-h-64 overflow-y-auto">
        {[...announcements].reverse().map((a) => (
          <li key={a.id} className="rounded-lg bg-surface-raised px-3 py-2.5 text-sm text-text-primary">
            {a.message}
          </li>
        ))}
      </ul>
    </div>
  )
}
