'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AppShell } from '@/components/shell';
import { Badge, Button, Card, EmptyState, Icon, PageHeader, Tabs, cx, relativeDate } from '@/components/ui';
import { useStore } from '@/lib/store';

const KIND_STYLE: Record<string, { icon: string; tone: 'danger' | 'warning' | 'info' | 'success'; label: string }> = {
  deadline: { icon: 'CalendarClock', tone: 'danger', label: 'Deadline' },
  renewal: { icon: 'RefreshCw', tone: 'warning', label: 'Renewal' },
  status: { icon: 'CircleCheck', tone: 'success', label: 'Status update' },
  recommendation: { icon: 'Sparkles', tone: 'info', label: 'Recommendation' },
};

export default function NotificationsPage() {
  const { notifications, markAllRead, markRead, unreadCount, t } = useStore();
  const [filter, setFilter] = useState('all');

  const filtered = notifications.filter((n) => (filter === 'all' ? true : n.kind === filter));

  const tabs = [
    { id: 'all', label: 'All', count: notifications.length },
    { id: 'deadline', label: 'Deadlines', count: notifications.filter((n) => n.kind === 'deadline').length },
    { id: 'renewal', label: 'Renewals', count: notifications.filter((n) => n.kind === 'renewal').length },
    { id: 'status', label: 'Updates', count: notifications.filter((n) => n.kind === 'status').length },
    { id: 'recommendation', label: 'For you', count: notifications.filter((n) => n.kind === 'recommendation').length },
  ];

  return (
    <AppShell>
      <div id="main" className="mx-auto max-w-[820px] space-y-5">
        <PageHeader title={t('notif.title')} subtitle={t('notif.sub')}>
          {unreadCount > 0 && (
            <Button variant="secondary" onClick={markAllRead}>
              <Icon name="CheckCheck" className="h-4 w-4" />
              {t('notif.markRead')}
            </Button>
          )}
        </PageHeader>

        <Tabs tabs={tabs} active={filter} onChange={setFilter} />

        {filtered.length === 0 ? (
          <EmptyState icon="BellOff" title={t('notif.empty')} body="New deadlines, renewals and application updates will appear here." />
        ) : (
          <ul className="space-y-3">
            {filtered.map((n) => {
              const style = KIND_STYLE[n.kind] ?? KIND_STYLE.status;
              const body = (
                <Card
                  className={cx(
                    'flex items-start gap-4 p-5 transition-all',
                    !n.read && 'border-brand-200 bg-brand-50/40 dark:border-brand-500/30 dark:bg-brand-500/[0.08]',
                    n.href && 'hover:shadow-lift',
                  )}
                >
                  <div
                    className={cx(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                      style.tone === 'danger' && 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
                      style.tone === 'warning' && 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
                      style.tone === 'success' && 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
                      style.tone === 'info' && 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
                    )}
                  >
                    <Icon name={style.icon} className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={style.tone}>{style.label}</Badge>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-brand-500" aria-label="Unread" />}
                      <span className="muted ml-auto text-xs">{relativeDate(n.at)}</span>
                    </div>
                    <h3 className="mt-2 text-[15px] font-bold leading-snug">{n.title}</h3>
                    <p className="muted mt-1 text-sm leading-relaxed">{n.body}</p>
                  </div>

                  {n.href && <Icon name="ChevronRight" className="mt-1 h-5 w-5 shrink-0 opacity-40" />}
                </Card>
              );

              return (
                <li key={n.id}>
                  {n.href ? (
                    <Link href={n.href} onClick={() => markRead(n.id)} className="block">
                      {body}
                    </Link>
                  ) : (
                    <button onClick={() => markRead(n.id)} className="block w-full text-left">
                      {body}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <Card className="p-5">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold">
            <Icon name="Settings2" className="h-4 w-4 text-brand-500" />
            How you get reminders
          </h2>
          <p className="muted text-[13px] leading-relaxed">
            MITRA reminds you in the app and by email today. SMS and WhatsApp reminders are on the
            roadmap so that citizens without a smartphone are reached too. You can change what you
            receive in Settings.
          </p>
          <Button href="/settings" variant="secondary" size="sm" className="mt-3">
            Notification settings
          </Button>
        </Card>
      </div>
    </AppShell>
  );
}
