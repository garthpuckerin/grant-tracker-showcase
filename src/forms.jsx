// Validated create-forms (Grant / Task / Budget Line Item) + supporting atoms.
//
// Hand-rolled, plain-JS, no react-hook-form / zod / Radix. Validation rules are
// replicated in validate.js (exact reference thresholds). Forms are controlled
// components rendered inside a simple modal overlay; submit simulates a delay
// then optimistically appends to the in-memory store.
import React from 'react';
import { Icon } from './atoms.jsx';
import { DATA } from './data.js';
import { addGrant, addTask, addLineItem, requestReallocation } from './store.js';
import { isoFromToday } from './dates.js';
import {
  validate,
  isValid,
  grantRules,
  taskRules,
  budgetRules,
  makeReallocationRules,
  GRANT_STATUS,
  TASK_STATUS,
  TASK_PRIORITY,
  BUDGET_CATEGORY,
} from './validate.js';

// ------------------------------------------------------------------
// Modal — fixed centered card + backdrop. Esc + outside-click close.
// ------------------------------------------------------------------
export const Modal = ({ title, subtitle, onClose, children }) => {
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <div className="modal-title">{title}</div>
            {subtitle && <div className="modal-sub">{subtitle}</div>}
          </div>
          <button className="tb-icon" onClick={onClose} aria-label="Close">
            <Icon name="close" size={14} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------
// FormField — label (+ * when required) + typed control + one error line.
// ------------------------------------------------------------------
export const FormField = ({
  name, label, type = 'text', value, onChange, onBlur,
  required = false, error, placeholder, options, rows = 3, disabled = false,
  span = 1,
}) => {
  const id = `f-${name}`;
  const common = {
    id, name, value, disabled,
    onChange: (e) => onChange(name, e.target.value),
    onBlur: () => onBlur && onBlur(name),
    'aria-invalid': error ? 'true' : undefined,
    className: error ? 'field-input has-error' : 'field-input',
  };
  return (
    <div className="form-field" style={span > 1 ? { gridColumn: `span ${span}` } : undefined}>
      <label htmlFor={id} className="field-label">
        {label}{required && <span className="field-req"> *</span>}
      </label>
      {type === 'textarea' ? (
        <textarea {...common} rows={rows} placeholder={placeholder} />
      ) : type === 'select' ? (
        <select {...common}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : type === 'number' ? (
        <input {...common} type="number" step="0.01" placeholder={placeholder} />
      ) : type === 'date' ? (
        <input {...common} type="date" placeholder={placeholder} />
      ) : (
        <input {...common} type="text" placeholder={placeholder} />
      )}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
};

// Shared controlled-form hook: values, touched, errors, blur/change/submit.
function useFormState(initial, ruleSet) {
  const [values, setValues] = React.useState(initial);
  const [touched, setTouched] = React.useState({});
  const [submitted, setSubmitted] = React.useState(false);

  const errors = validate(values, ruleSet);
  // Only surface a field's first error once it has been touched or submit tried.
  const visibleError = (field) =>
    (touched[field] || submitted) && errors[field] ? errors[field][0] : undefined;

  const setField = (name, val) => setValues((v) => ({ ...v, [name]: val }));
  const blur = (name) => setTouched((t) => ({ ...t, [name]: true }));

  return { values, setValues, setField, blur, errors, visibleError, submitted, setSubmitted };
}

// Editorial select-option helpers.
const opt = (v) => ({ value: v, label: titleCase(v) });
const titleCase = (s) =>
  s.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');

const piOptions = [
  { value: '', label: 'Select Principal Investigator…' },
  ...DATA.users
    .filter((u) => u.role === 'PI' || u.role === 'ADMIN')
    .map((u) => ({ value: u.id, label: `${u.name} (${u.role})` })),
];

// ------------------------------------------------------------------
// CreateGrantForm
// ------------------------------------------------------------------
export const CreateGrantForm = ({ onClose, onCreated }) => {
  const f = useFormState({
    title: '', grantNumber: '', agency: '', pi: '',
    startDate: '', endDate: '', totalYears: '1', status: 'DRAFT', description: '',
  }, grantRules);
  const [busy, setBusy] = React.useState(false);

  const submit = (e) => {
    e.preventDefault();
    f.setSubmitted(true);
    if (!isValid(f.errors)) return;
    setBusy(true);
    setTimeout(() => {
      const pi = DATA.users.find((u) => u.id === f.values.pi) || DATA.users[1];
      const budget = 0;
      addGrant({
        id: 'g-' + Date.now(),
        title: f.values.title,
        number: f.values.grantNumber,
        agency: f.values.agency,
        agencyShort: f.values.agency.split(/\s+/).map((w) => w[0]).join('').slice(0, 4).toUpperCase(),
        status: f.values.status,
        year: 1,
        totalYears: Number(f.values.totalYears),
        start: f.values.startDate,
        end: f.values.endDate,
        pi,
        budget,
        spent: 0,
        pct: 0,
      });
      setBusy(false);
      onCreated(`Grant “${f.values.title}” created.`);
      onClose();
    }, 1000);
  };

  return (
    <Modal
      title="Create New Grant"
      subtitle="Enter the details for the new federal award. Required fields are marked."
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate>
        <div className="form-grid cols-2">
          <FormField name="title" label="Grant Title" required span={2}
            value={f.values.title} onChange={f.setField} onBlur={f.blur}
            error={f.visibleError('title')} placeholder="Enter the full grant title" />
          <FormField name="grantNumber" label="Grant Number" required
            value={f.values.grantNumber} onChange={f.setField} onBlur={f.blur}
            error={f.visibleError('grantNumber')} placeholder="e.g., NSF-2024-001" />
          <FormField name="agency" label="Agency Name" required
            value={f.values.agency} onChange={f.setField} onBlur={f.blur}
            error={f.visibleError('agency')} placeholder="e.g., National Science Foundation" />
          <FormField name="pi" label="Principal Investigator" type="select" required
            value={f.values.pi} onChange={f.setField} onBlur={f.blur}
            error={f.visibleError('pi')} options={piOptions} />
          <FormField name="status" label="Status" type="select" required
            value={f.values.status} onChange={f.setField} onBlur={f.blur}
            error={f.visibleError('status')} options={GRANT_STATUS.map(opt)} />
          <FormField name="startDate" label="Start Date" type="date" required
            value={f.values.startDate} onChange={f.setField} onBlur={f.blur}
            error={f.visibleError('startDate')} />
          <FormField name="endDate" label="End Date" type="date" required
            value={f.values.endDate} onChange={f.setField} onBlur={f.blur}
            error={f.visibleError('endDate')} />
          <FormField name="totalYears" label="Total Years" type="number" required
            value={f.values.totalYears} onChange={f.setField} onBlur={f.blur}
            error={f.visibleError('totalYears')} />
          <FormField name="description" label="Description" type="textarea" span={2}
            value={f.values.description} onChange={f.setField} onBlur={f.blur}
            error={f.visibleError('description')} placeholder="Optional summary (max 1000 characters)" />
        </div>
        <FormActions busy={busy} onClose={onClose} idleLabel="Create Grant" busyLabel="Creating…" />
      </form>
    </Modal>
  );
};

// ------------------------------------------------------------------
// CreateTaskForm — with live Task Preview panel.
// ------------------------------------------------------------------
export const CreateTaskForm = ({ onClose, onCreated, grantId }) => {
  const f = useFormState({
    title: '', description: '', status: 'PENDING', priority: 'MEDIUM',
    assignee: '', dueDate: '',
  }, taskRules);
  const [busy, setBusy] = React.useState(false);

  const assigneeOptions = [
    { value: '', label: 'Unassigned (optional)' },
    ...DATA.users.map((u) => ({ value: u.id, label: `${u.name} (${u.role})` })),
  ];

  const submit = (e) => {
    e.preventDefault();
    f.setSubmitted(true);
    if (!isValid(f.errors)) return;
    setBusy(true);
    setTimeout(() => {
      const assigned = DATA.users.find((u) => u.id === f.values.assignee) || DATA.users[0];
      // Map the reference status enum to our existing display vocabulary.
      const statusMap = { PENDING: 'OPEN', IN_PROGRESS: 'IN_PROGRESS', COMPLETED: 'COMPLETE', CANCELLED: 'COMPLETE' };
      addTask({
        id: 'tk-' + Date.now(),
        title: f.values.title,
        desc: f.values.description || '—',
        due: f.values.dueDate || isoFromToday(180),
        status: statusMap[f.values.status] || 'OPEN',
        priority: f.values.priority,
        grantId: grantId || DATA.grants[0].id,
        assigned,
      });
      setBusy(false);
      onCreated(`Task “${f.values.title}” created.`);
      onClose();
    }, 1000);
  };

  const assigneeLabel = assigneeOptions.find((o) => o.value === f.values.assignee)?.label;

  return (
    <Modal
      title="Create New Task"
      subtitle="Add a task or milestone. The preview updates as you type."
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate>
        <div className="form-grid cols-2">
          <FormField name="title" label="Task Title" required span={2}
            value={f.values.title} onChange={f.setField} onBlur={f.blur}
            error={f.visibleError('title')} placeholder="Enter a descriptive task title" />
          <FormField name="description" label="Description" type="textarea" span={2}
            value={f.values.description} onChange={f.setField} onBlur={f.blur}
            error={f.visibleError('description')} placeholder="Optional details (max 1000 characters)" />
          <FormField name="status" label="Status" type="select" required
            value={f.values.status} onChange={f.setField} onBlur={f.blur}
            error={f.visibleError('status')} options={TASK_STATUS.map(opt)} />
          <FormField name="priority" label="Priority" type="select" required
            value={f.values.priority} onChange={f.setField} onBlur={f.blur}
            error={f.visibleError('priority')} options={TASK_PRIORITY.map(opt)} />
          <FormField name="assignee" label="Assign To" type="select"
            value={f.values.assignee} onChange={f.setField} onBlur={f.blur}
            error={f.visibleError('assignee')} options={assigneeOptions} />
          <FormField name="dueDate" label="Due Date" type="date"
            value={f.values.dueDate} onChange={f.setField} onBlur={f.blur}
            error={f.visibleError('dueDate')} />
        </div>

        {/* Live Task Preview */}
        <div className="form-preview">
          <div className="form-preview-title">Task Preview</div>
          <dl className="form-preview-grid">
            <div><dt>Title</dt><dd>{f.values.title || 'Untitled Task'}</dd></div>
            <div><dt>Status</dt><dd>{titleCase(f.values.status)}</dd></div>
            <div><dt>Priority</dt><dd>{titleCase(f.values.priority)}</dd></div>
            <div><dt>Assignee</dt><dd>{f.values.assignee ? assigneeLabel : 'Unassigned'}</dd></div>
            <div><dt>Due</dt><dd>{f.values.dueDate
              ? new Date(f.values.dueDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
              : 'No due date'}</dd></div>
          </dl>
        </div>

        <FormActions busy={busy} onClose={onClose} idleLabel="Create Task" busyLabel="Creating…" />
      </form>
    </Modal>
  );
};

// ------------------------------------------------------------------
// BudgetLineItemForm — with live Budget Summary (Remaining calc).
// ------------------------------------------------------------------
const money2 = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? v.toFixed(2) : '0.00';
};

export const BudgetLineItemForm = ({ onClose, onCreated, grantId }) => {
  const f = useFormState({
    category: 'PERSONNEL', description: '',
    budgetedAmount: '', actualSpent: '', encumberedAmount: '',
  }, budgetRules);
  const [busy, setBusy] = React.useState(false);

  const budgeted = Number(f.values.budgetedAmount) || 0;
  const actual = Number(f.values.actualSpent) || 0;
  const encumbered = Number(f.values.encumberedAmount) || 0;
  const remaining = budgeted - actual - encumbered;

  const submit = (e) => {
    e.preventDefault();
    f.setSubmitted(true);
    if (!isValid(f.errors)) return;
    setBusy(true);
    setTimeout(() => {
      addLineItem(grantId || DATA.grants[0].id, {
        cat: f.values.category,
        desc: f.values.description,
        budgeted, spent: actual, encumbered,
      });
      setBusy(false);
      onCreated('Budget line item added.');
      onClose();
    }, 500);
  };

  return (
    <Modal
      title="Add Budget Line Item"
      subtitle="Enter the details for this budget category. All amounts are in USD."
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate>
        <div className="form-grid cols-2">
          <FormField name="category" label="Budget Category" type="select" required
            value={f.values.category} onChange={f.setField} onBlur={f.blur}
            error={f.visibleError('category')} options={BUDGET_CATEGORY.map(opt)} />
          <div /> {/* spacer to keep category on its own row's left */}
          <FormField name="description" label="Description" type="textarea" required span={2}
            value={f.values.description} onChange={f.setField} onBlur={f.blur}
            error={f.visibleError('description')} placeholder="Describe this budget line item" />
          <FormField name="budgetedAmount" label="Budgeted Amount" type="number" required
            value={f.values.budgetedAmount} onChange={f.setField} onBlur={f.blur}
            error={f.visibleError('budgetedAmount')} placeholder="0.00" />
          <FormField name="actualSpent" label="Actual Spent" type="number" required
            value={f.values.actualSpent} onChange={f.setField} onBlur={f.blur}
            error={f.visibleError('actualSpent')} placeholder="0.00" />
          <FormField name="encumberedAmount" label="Encumbered Amount" type="number" required
            value={f.values.encumberedAmount} onChange={f.setField} onBlur={f.blur}
            error={f.visibleError('encumberedAmount')} placeholder="0.00" />
        </div>

        {/* Live Budget Summary */}
        <div className="form-preview">
          <div className="form-preview-title">Budget Summary</div>
          <dl className="form-preview-grid cols-2">
            <div><dt>Budgeted</dt><dd className="mono">${money2(budgeted)}</dd></div>
            <div><dt>Remaining</dt><dd className="mono" style={{ color: remaining < 0 ? 'var(--alert)' : 'var(--ink)' }}>${money2(remaining)}</dd></div>
            <div><dt>Spent</dt><dd className="mono">${money2(actual)}</dd></div>
            <div><dt>Encumbered</dt><dd className="mono">${money2(encumbered)}</dd></div>
          </dl>
        </div>

        <FormActions busy={busy} onClose={onClose} idleLabel="Add Line Item" busyLabel="Adding…" />
      </form>
    </Modal>
  );
};

// ------------------------------------------------------------------
// ReallocationRequestForm — RBAC-gated budget transfer request.
// Source/destination categories come from the grant's live line-items; the
// amount is validated against the source category's available balance. Submits
// a PENDING request (requestReallocation) that Finance/Admin must approve.
// ------------------------------------------------------------------
export const ReallocationRequestForm = ({ grantId, lineItems, currentUser, onClose, onCreated }) => {
  // Available balance per category from the (delta-merged) line-items.
  const cats = lineItems.map((l) => l.cat);
  const balances = React.useMemo(() => {
    const m = {};
    for (const l of lineItems) m[l.cat] = l.budgeted - l.spent - l.encumbered;
    return m;
  }, [lineItems]);

  const rules = React.useMemo(() => makeReallocationRules(balances), [balances]);
  const f = useFormState(
    { fromCat: cats[0] || '', toCat: cats[1] || '', amount: '', reason: '' },
    rules,
  );
  const [busy, setBusy] = React.useState(false);

  const amount = Number(f.values.amount) || 0;
  const fromBal = balances[f.values.fromCat] ?? 0;
  const toBal = balances[f.values.toCat] ?? 0;
  const catOptions = cats.map((c) => ({ value: c, label: titleCase(c) }));

  const submit = (e) => {
    e.preventDefault();
    f.setSubmitted(true);
    if (!isValid(f.errors)) return;
    setBusy(true);
    setTimeout(() => {
      requestReallocation(
        {
          grantId,
          fromCat: f.values.fromCat,
          toCat: f.values.toCat,
          amount,
          reason: f.values.reason.trim(),
        },
        currentUser.id,
      );
      setBusy(false);
      onCreated('Reallocation requested — pending Finance approval.');
      onClose();
    }, 600);
  };

  return (
    <Modal
      title="Request Budget Reallocation"
      subtitle="Move funds between categories. Under 2 CFR 200.308 this requires Finance approval before it takes effect."
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate>
        <div className="form-grid cols-2">
          <FormField name="fromCat" label="From category" type="select" required
            value={f.values.fromCat} onChange={f.setField} onBlur={f.blur}
            error={f.visibleError('fromCat')} options={catOptions} />
          <FormField name="toCat" label="To category" type="select" required
            value={f.values.toCat} onChange={f.setField} onBlur={f.blur}
            error={f.visibleError('toCat')} options={catOptions} />
          <FormField name="amount" label="Amount (USD)" type="number" required
            value={f.values.amount} onChange={f.setField} onBlur={f.blur}
            error={f.visibleError('amount')} placeholder="0.00" />
          <div className="form-field">
            <span className="field-label">Available in source</span>
            <div className="mono" style={{ fontSize: 14, fontWeight: 500, paddingTop: 8, color: amount > fromBal ? 'var(--alert)' : 'var(--ink)' }}>
              ${fromBal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
          </div>
          <FormField name="reason" label="Justification" type="textarea" required span={2}
            value={f.values.reason} onChange={f.setField} onBlur={f.blur}
            error={f.visibleError('reason')} placeholder="Why is this transfer needed? (federal prior-approval justification)" />
        </div>

        {/* Live effect preview */}
        <div className="form-preview">
          <div className="form-preview-title">After approval</div>
          <dl className="form-preview-grid cols-2">
            <div><dt>{titleCase(f.values.fromCat || '—')} balance</dt><dd className="mono">${(fromBal - amount).toLocaleString('en-US', { maximumFractionDigits: 0 })}</dd></div>
            <div><dt>{titleCase(f.values.toCat || '—')} balance</dt><dd className="mono">${(toBal + amount).toLocaleString('en-US', { maximumFractionDigits: 0 })}</dd></div>
          </dl>
        </div>

        <FormActions busy={busy} onClose={onClose} idleLabel="Submit request" busyLabel="Submitting…" />
      </form>
    </Modal>
  );
};

// Shared footer: Cancel + submit with loading label.
const FormActions = ({ busy, onClose, idleLabel, busyLabel }) => (
  <div className="form-actions">
    <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
    <button type="submit" className="btn accent" disabled={busy}>
      {busy ? busyLabel : idleLabel}
    </button>
  </div>
);
