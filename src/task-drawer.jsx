// Task detail drawer — the end-to-end interaction behind a task row.
//
// Every control writes straight through to the store (updateTask), so the
// change is live everywhere the task is derived: the Tasks groups and stats,
// the sidebar open-task count, the dashboard's "N overdue" copy and deadline
// rail, and the grant's Tasks tab. Mark complete / reopen is the primary
// action; status, priority, assignee, and due date are editable in place.
import React from 'react';
import { DATA } from './data.js';
import { fmt, Icon, Status } from './atoms.jsx';
import { Drawer } from './drawer.jsx';
import { FormField } from './forms.jsx';
import { updateTask } from './store.js';
import { useToast } from './toast.jsx';

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETE', label: 'Complete' },
];
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => ({
  value: p, label: p.charAt(0) + p.slice(1).toLowerCase(),
}));

export const TaskDrawer = ({ task, onClose, navigate }) => {
  const toast = useToast();
  if (!task) return null;
  const grant = DATA.grants.find((g) => g.id === task.grantId);
  const days = fmt.daysUntil(task.due);
  const done = task.status === 'COMPLETE';

  const set = (name, value) => {
    if (name === 'assignee') {
      const user = DATA.users.find((u) => u.id === value) || task.assigned;
      updateTask(task.id, { assigned: user });
      return;
    }
    updateTask(task.id, { [name]: value });
  };

  const toggleDone = () => {
    updateTask(task.id, { status: done ? 'OPEN' : 'COMPLETE' });
    toast(done ? `“${task.title}” reopened.` : `“${task.title}” marked complete.`);
  };

  const openGrant = () => {
    onClose();
    if (grant) navigate({ name: 'grant', id: grant.id, grant });
  };

  const assigneeOptions = DATA.users.map((u) => ({ value: u.id, label: `${u.name} (${u.role})` }));

  return (
    <Drawer
      open={!!task}
      onClose={onClose}
      title={task.title}
      subtitle={grant ? `${grant.agencyShort} · ${grant.number}` : 'Portfolio task'}
    >
      <div className="flex-col gap-24">
        {/* Status strip + primary action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Status s={task.status} />
          <span className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: task.priority === 'HIGH' || task.priority === 'URGENT' ? 'var(--alert)' : 'var(--ink-3)' }}>{task.priority}</span>
          {!done && (
            <span className="mono" style={{ fontSize: 11, color: days < 0 ? 'var(--alert)' : 'var(--ink-3)' }}>
              {days < 0 ? `${Math.abs(days)}d late` : days === 0 ? 'due today' : `due in ${days}d`}
            </span>
          )}
          <button className={`btn ${done ? 'ghost' : 'accent'}`} style={{ marginLeft: 'auto' }} onClick={toggleDone}>
            <Icon name="check" size={12} /> {done ? 'Reopen' : 'Mark complete'}
          </button>
        </div>

        <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.55, margin: 0 }}>{task.desc}</p>

        {/* Editable fields — write-through to the store */}
        <div>
          <div className="drawer-section-label">Details</div>
          <div className="form-grid cols-2">
            <FormField name="status" label="Status" type="select" value={task.status} onChange={set} options={STATUS_OPTIONS} />
            <FormField name="priority" label="Priority" type="select" value={task.priority} onChange={set} options={PRIORITY_OPTIONS} />
            <FormField name="assignee" label="Assignee" type="select" value={task.assigned?.id || ''} onChange={set} options={assigneeOptions} />
            <FormField name="due" label="Due date" type="date" value={task.due} onChange={set} />
          </div>
        </div>

        {/* Related award */}
        {grant && (
          <div>
            <div className="drawer-section-label">Award</div>
            <dl className="drawer-dl">
              <div><dt>Grant</dt><dd>{grant.title}</dd></div>
              <div><dt>Number</dt><dd className="mono">{grant.number}</dd></div>
              <div><dt>PI</dt><dd>{grant.pi.name}</dd></div>
            </dl>
            <button className="btn-link" style={{ marginTop: 8 }} onClick={openGrant}>Open grant →</button>
          </div>
        )}
      </div>
    </Drawer>
  );
};
