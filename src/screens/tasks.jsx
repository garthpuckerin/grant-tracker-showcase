// Tasks screen
import React from 'react';
import { DATA } from '../data.js';
import { fmt, Icon, Status } from '../atoms.jsx';
import { useStore, updateTask } from '../store.js';
import { CreateTaskForm } from '../forms.jsx';
import { TaskDrawer } from '../task-drawer.jsx';
import { useToast, MockButton } from '../toast.jsx';

export const Tasks = ({ navigate, search }) => {
  const tasks = useStore((s) => s.tasks);
  const D = { ...DATA, tasks };
  const toast = useToast();
  const [showForm, setShowForm] = React.useState(false);
  const [filter, setFilter] = React.useState('ALL');
  const [priority, setPriority] = React.useState('ALL');
  // Selected task id (not the object) so the drawer always renders the LIVE
  // store record after an in-drawer edit.
  const [selectedId, setSelectedId] = React.useState(null);
  const selected = tasks.find((t) => t.id === selectedId) || null;

  // Inline completion from the row's check control — the fastest interaction.
  const toggleDone = (t) => {
    const done = t.status === 'COMPLETE';
    updateTask(t.id, { status: done ? 'OPEN' : 'COMPLETE' });
    toast(done ? `“${t.title}” reopened.` : `“${t.title}” marked complete.`);
  };

  const visibleTasks = D.tasks
    .filter(t => filter === 'ALL' || t.status === filter)
    .filter(t => priority === 'ALL' || t.priority === priority)
    .filter(t => !search || (t.title + t.desc).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(a.due) - new Date(b.due));

  // Group by week-ish buckets
  const groups = {
    overdue: visibleTasks.filter(t => t.status !== 'COMPLETE' && fmt.daysUntil(t.due) < 0),
    thisWeek: visibleTasks.filter(t => t.status !== 'COMPLETE' && fmt.daysUntil(t.due) >= 0 && fmt.daysUntil(t.due) <= 7),
    next: visibleTasks.filter(t => t.status !== 'COMPLETE' && fmt.daysUntil(t.due) > 7),
    done: visibleTasks.filter(t => t.status === 'COMPLETE'),
  };

  const stats = {
    open: D.tasks.filter(t => t.status === 'OPEN').length,
    inProg: D.tasks.filter(t => t.status === 'IN_PROGRESS').length,
    done: D.tasks.filter(t => t.status === 'COMPLETE').length,
    overdue: D.tasks.filter(t => t.status !== 'COMPLETE' && fmt.daysUntil(t.due) < 0).length,
  };

  return (
    <div>
      <TaskDrawer task={selected} onClose={() => setSelectedId(null)} navigate={navigate} />
      {showForm && (
        <CreateTaskForm
          onClose={() => setShowForm(false)}
          onCreated={(msg) => toast(msg)}
        />
      )}
      <div className="page-head">
        <div>
          <div className="eyebrow">Workspace · {D.tasks.length} tasks across portfolio</div>
          <h1>Tasks.</h1>
          <p className="sub">
            Operational items across all active grants — reporting deadlines, approvals, compliance certifications. Grouped by urgency.
          </p>
        </div>
        <div className="ph-actions">
          <MockButton className="btn ghost" icon="filter" label="Filters" message="Advanced task filters are mocked in this demo — use the status groups and search." />
          <button className="btn accent" onClick={() => setShowForm(true)}><Icon name="plus" size={12} /> New task</button>
        </div>
      </div>

      <div className="bento" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="metric" style={{ minHeight: 90 }}>
          <div className="lbl">Open</div>
          <div className="val" style={{ fontSize: 32 }}>{stats.open}</div>
        </div>
        <div className="metric" style={{ minHeight: 90 }}>
          <div className="lbl">In Progress</div>
          <div className="val" style={{ fontSize: 32 }}>{stats.inProg}</div>
        </div>
        <div className="metric" style={{ minHeight: 90 }}>
          <div className="lbl">Completed</div>
          <div className="val" style={{ fontSize: 32, color: 'var(--fund)' }}>{stats.done}</div>
        </div>
        <div className="metric" style={{ minHeight: 90 }}>
          <div className="lbl">Overdue</div>
          <div className="val" style={{ fontSize: 32, color: stats.overdue ? 'var(--alert)' : 'var(--ink)' }}>{stats.overdue}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="pill-group">
          {['ALL', 'OPEN', 'IN_PROGRESS', 'COMPLETE'].map(s => (
            <button key={s} className={filter === s ? 'on' : ''} onClick={() => setFilter(s)}>{s.replace('_', ' ')}</button>
          ))}
        </div>
        <div className="pill-group">
          {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(p => (
            <button key={p} className={priority === p ? 'on' : ''} onClick={() => setPriority(p)}>{p}</button>
          ))}
        </div>
      </div>

      {visibleTasks.length === 0 ? (
        <div className="empty-state">
          <div className="kicker">No results</div>
          <p className="serif">{search ? `No tasks match “${search}”` : 'No tasks match this view'}</p>
          <p className="muted">Try a different status or priority — or clear the filters to see all tasks.</p>
        </div>
      ) : (
      <div className="flex-col gap-24">
        {[
          { key: 'overdue', label: 'OVERDUE', tasks: groups.overdue, accent: 'var(--alert)' },
          { key: 'thisWeek', label: 'THIS WEEK', tasks: groups.thisWeek, accent: 'var(--accent)' },
          { key: 'next', label: 'UPCOMING', tasks: groups.next, accent: 'var(--ink-3)' },
          { key: 'done', label: 'COMPLETED', tasks: groups.done, accent: 'var(--fund)' },
        ].map(g => g.tasks.length > 0 && (
          <div key={g.key}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--ink)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: g.accent, display: 'inline-block' }}></span>
                <span className="mono" style={{ fontSize: 11, letterSpacing: '0.16em', fontWeight: 600 }}>{g.label}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{g.tasks.length}</span>
              </div>
            </div>
            <div className="card">
              {g.tasks.map((t, i) => {
                const grant = D.grants.find(gg => gg.id === t.grantId);
                const days = fmt.daysUntil(t.due);
                return (
                  <div
                    key={t.id}
                    className="task-row row-h"
                    role="button"
                    tabIndex={0}
                    aria-label={`Open task: ${t.title}`}
                    onClick={() => setSelectedId(t.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(t.id); } }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '24px 1fr auto auto auto auto',
                      gap: 16,
                      padding: '14px 20px',
                      borderBottom: i < g.tasks.length - 1 ? '1px solid var(--rule)' : 'none',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}>
                    <button
                      type="button"
                      className="task-check"
                      aria-label={t.status === 'COMPLETE' ? `Reopen: ${t.title}` : `Mark complete: ${t.title}`}
                      aria-pressed={t.status === 'COMPLETE'}
                      onClick={(e) => { e.stopPropagation(); toggleDone(t); }}
                      style={{ width: 18, height: 18, padding: 0, border: '1px solid var(--rule-strong)', borderRadius: '50%', display: 'grid', placeItems: 'center', background: t.status === 'COMPLETE' ? 'var(--ink)' : 'transparent', cursor: 'pointer' }}
                    >
                      {t.status === 'COMPLETE' && <span style={{ color: 'var(--paper)', fontSize: 10, lineHeight: 1 }}>✓</span>}
                    </button>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 3, textDecoration: t.status === 'COMPLETE' ? 'line-through' : 'none', textDecorationColor: 'var(--ink-3)' }}>{t.title}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{t.desc}</div>
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>{grant?.agencyShort} · {grant?.number}</div>
                    <span className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: t.priority === 'HIGH' ? 'var(--alert)' : 'var(--ink-3)' }}>{t.priority}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="avatar-sm">{t.assigned.initials}</div>
                    </div>
                    <div className="mono" style={{ fontSize: 11, color: days < 0 ? 'var(--alert)' : 'var(--ink-3)', minWidth: 70, textAlign: 'right' }}>
                      {fmt.shortDate(t.due)}{t.status !== 'COMPLETE' && ` · ${days < 0 ? `${Math.abs(days)}d late` : `${days}d`}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
};
