// Admin create-forms: invite a member, open a new SF-425 filing.
// Both are validated, write to the store on submit, and surface immediately in
// the Members list / the SF-425 index.
import React from 'react';
import { DATA } from './data.js';
import { Modal, FormField } from './forms.jsx';
import { addMember, addFiling } from './store.js';
import { validate, isValid, memberRules, filingRules, MEMBER_ROLE, FILING_TYPE } from './validate.js';
import { isoFromToday } from './dates.js';

const titleCase = (s) => s.charAt(0) + s.slice(1).toLowerCase();

// Shared minimal controlled-form state (mirrors forms.jsx's useFormState).
function useForm(initial, rules) {
  const [values, setValues] = React.useState(initial);
  const [touched, setTouched] = React.useState({});
  const [submitted, setSubmitted] = React.useState(false);
  const errors = validate(values, rules);
  const visibleError = (f) => ((touched[f] || submitted) && errors[f] ? errors[f][0] : undefined);
  const setField = (n, v) => setValues((s) => ({ ...s, [n]: v }));
  const blur = (n) => setTouched((t) => ({ ...t, [n]: true }));
  return { values, errors, visibleError, setField, blur, setSubmitted };
}

const Actions = ({ busy, onClose, idle, working }) => (
  <div className="form-actions">
    <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
    <button type="submit" className="btn accent" disabled={busy}>{busy ? working : idle}</button>
  </div>
);

export const InviteMemberForm = ({ onClose, onCreated }) => {
  const f = useForm({ name: '', email: '', role: 'PI' }, memberRules);
  const [busy, setBusy] = React.useState(false);
  const submit = (e) => {
    e.preventDefault();
    f.setSubmitted(true);
    if (!isValid(f.errors)) return;
    setBusy(true);
    setTimeout(() => {
      const initials = f.values.name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
      addMember({ id: 'u-' + Date.now(), name: f.values.name.trim(), email: f.values.email.trim(), role: f.values.role, initials, invited: true });
      setBusy(false);
      onCreated(`Invitation sent to ${f.values.email.trim()}.`);
      onClose();
    }, 600);
  };
  return (
    <Modal title="Invite Member" subtitle="Add someone to the workspace with a role. Roles scope what they can see and approve." onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="form-grid cols-2">
          <FormField name="name" label="Full name" required span={2} value={f.values.name} onChange={f.setField} onBlur={f.blur} error={f.visibleError('name')} placeholder="e.g., Dr. Priya Natarajan" />
          <FormField name="email" label="Email" required value={f.values.email} onChange={f.setField} onBlur={f.blur} error={f.visibleError('email')} placeholder="name@university.edu" />
          <FormField name="role" label="Role" type="select" required value={f.values.role} onChange={f.setField} onBlur={f.blur} error={f.visibleError('role')} options={MEMBER_ROLE.map((r) => ({ value: r, label: r === 'PI' ? 'Principal Investigator' : titleCase(r) }))} />
        </div>
        <Actions busy={busy} onClose={onClose} idle="Send invitation" working="Sending…" />
      </form>
    </Modal>
  );
};

export const NewFilingForm = ({ onClose, onCreated }) => {
  const f = useForm({ grantId: '', period: '', type: 'Quarterly', due: isoFromToday(30) }, filingRules);
  const [busy, setBusy] = React.useState(false);
  const grantOptions = [
    { value: '', label: 'Select an award…' },
    ...DATA.grants.map((g) => ({ value: g.id, label: `${g.number} — ${g.title}` })),
  ];
  const submit = (e) => {
    e.preventDefault();
    f.setSubmitted(true);
    if (!isValid(f.errors)) return;
    setBusy(true);
    setTimeout(() => {
      const gi = DATA.grants.findIndex((g) => g.id === f.values.grantId);
      addFiling({ id: 'sf-' + Date.now(), gi, period: f.values.period.trim().toUpperCase(), type: f.values.type, status: 'OPEN', due: f.values.due });
      setBusy(false);
      onCreated(`SF-425 filing opened — ${f.values.period.trim().toUpperCase()}.`);
      onClose();
    }, 600);
  };
  return (
    <Modal title="New SF-425 Filing" subtitle="Open a Federal Financial Report for an award and reporting period. Figures derive from the award’s ledger." onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="form-grid cols-2">
          <FormField name="grantId" label="Award" type="select" required span={2} value={f.values.grantId} onChange={f.setField} onBlur={f.blur} error={f.visibleError('grantId')} options={grantOptions} />
          <FormField name="period" label="Reporting period" required value={f.values.period} onChange={f.setField} onBlur={f.blur} error={f.visibleError('period')} placeholder="e.g., FY26 Q1" />
          <FormField name="type" label="Report type" type="select" required value={f.values.type} onChange={f.setField} onBlur={f.blur} error={f.visibleError('type')} options={FILING_TYPE.map((t) => ({ value: t, label: t }))} />
          <FormField name="due" label="Due date" type="date" required value={f.values.due} onChange={f.setField} onBlur={f.blur} error={f.visibleError('due')} />
        </div>
        <Actions busy={busy} onClose={onClose} idle="Open filing" working="Opening…" />
      </form>
    </Modal>
  );
};
