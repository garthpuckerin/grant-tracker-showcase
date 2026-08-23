// Document detail drawer + upload form + a real download.
//
// A document row opens a drawer with its metadata and award; "Download" really
// downloads a file (a text manifest of the fixture — the demo ships no binary
// PDFs, and says so in the file rather than pretending); "Upload" is a
// validated form that appends a document to the store, so it shows up in the
// Documents screen, the grant's Documents tab, and the sidebar count at once.
import React from 'react';
import { DATA } from './data.js';
import { Icon } from './atoms.jsx';
import { Drawer } from './drawer.jsx';
import { Modal, FormField } from './forms.jsx';
import { addDocument, useCurrentUser } from './store.js';
import { useToast } from './toast.jsx';
import { isoFromToday } from './dates.js';
import { validate, isValid, documentRules, DOCUMENT_TYPE } from './validate.js';

const titleCase = (s) => s.charAt(0) + s.slice(1).toLowerCase();

// Generate and save a real file for a fixture document.
// Demo-scoped: file storage is outside the cockpit. Downloading explains that
// instead of producing a file (a surprise save dialog is not a demo feature).
export const DOWNLOAD_NOTICE = (doc) =>
  `“${doc.name}” would download here — file storage and retrieval live in the production document store, outside this demo’s scope.`;

export const DocumentDrawer = ({ doc, onClose, navigate }) => {
  const toast = useToast();
  if (!doc) return null;
  const grant = DATA.grants.find((g) => g.id === doc.grantId);
  const download = () => { toast(DOWNLOAD_NOTICE(doc), 'indigo', 'Demo'); };
  const openGrant = () => { onClose(); if (grant) navigate({ name: 'grant', id: grant.id, grant }); };
  return (
    <Drawer open={!!doc} onClose={onClose} title={doc.name} subtitle={grant ? `${grant.agencyShort} · ${grant.number}` : 'Workspace document'}>
      <div className="flex-col gap-24">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--ink-3)' }}>{doc.type}</span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{doc.size}</span>
          <button className="btn accent" style={{ marginLeft: 'auto' }} onClick={download}>
            <Icon name="download" size={12} /> Download
          </button>
        </div>

        {/* Document preview — an honest, designed preview panel */}
        <div style={{ border: '1px solid var(--rule)', background: 'var(--paper)', padding: 22, minHeight: 180 }}>
          <div className="kicker" style={{ marginBottom: 10 }}>Preview · page 1</div>
          <div className="serif" style={{ fontSize: 20, lineHeight: 1.2, marginBottom: 10 }}>{doc.name.replace(/\.(pdf|docx|xlsx)$/i, '')}</div>
          <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
            {grant ? `${grant.agency} · ${grant.number}` : 'Portfolio'} · {titleCase(doc.type)} document uploaded {doc.date} by {doc.by?.name}.
            <br />Full-page rendering is served by the production document store; this demo carries the metadata and a downloadable manifest.
          </div>
        </div>

        <div>
          <div className="drawer-section-label">Details</div>
          <dl className="drawer-dl">
            <div><dt>Type</dt><dd>{titleCase(doc.type)}</dd></div>
            <div><dt>Uploaded by</dt><dd>{doc.by?.name || '—'}</dd></div>
            <div><dt>Date</dt><dd className="mono">{doc.date}</dd></div>
            <div><dt>Size</dt><dd className="mono">{doc.size}</dd></div>
            {grant && <div><dt>Award</dt><dd>{grant.title}</dd></div>}
          </dl>
          {grant && <button className="btn-link" style={{ marginTop: 8 }} onClick={openGrant}>Open grant →</button>}
        </div>
      </div>
    </Drawer>
  );
};

// Upload form — validated; appends to the store on submit.
export const UploadDocumentForm = ({ grantId, onClose, onCreated }) => {
  const user = useCurrentUser();
  const [values, setValues] = React.useState({ name: '', type: 'REPORT', grantId: grantId || '' });
  const [touched, setTouched] = React.useState({});
  const [submitted, setSubmitted] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const errors = validate(values, documentRules);
  const visibleError = (f) => ((touched[f] || submitted) && errors[f] ? errors[f][0] : undefined);
  const setField = (n, v) => setValues((s) => ({ ...s, [n]: v }));
  const blur = (n) => setTouched((t) => ({ ...t, [n]: true }));

  const grantOptions = [
    { value: '', label: 'Select an award…' },
    ...DATA.grants.map((g) => ({ value: g.id, label: `${g.number} — ${g.title}` })),
  ];

  const submit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (!isValid(errors)) return;
    setBusy(true);
    setTimeout(() => {
      const name = /\.[a-z0-9]{2,5}$/i.test(values.name) ? values.name : `${values.name}.pdf`;
      addDocument({
        id: 'd-' + Date.now(),
        name,
        type: values.type,
        size: `${120 + Math.floor(name.length * 7)} KB`,
        date: isoFromToday(0),
        by: user,
        grantId: values.grantId,
      });
      setBusy(false);
      onCreated(`“${name}” added to the library — file storage is outside this demo’s scope.`);
      onClose();
    }, 600);
  };

  return (
    <Modal title="Upload Document" subtitle="Attach a document to an award. It appears in the award’s Documents tab immediately." onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="form-grid cols-2">
          <FormField name="name" label="Document name" required span={2}
            value={values.name} onChange={setField} onBlur={blur}
            error={visibleError('name')} placeholder="e.g., Q2 Progress Report.pdf" />
          <FormField name="type" label="Type" type="select" required
            value={values.type} onChange={setField} onBlur={blur}
            error={visibleError('type')} options={DOCUMENT_TYPE.map((t) => ({ value: t, label: titleCase(t) }))} />
          <FormField name="grantId" label="Award" type="select" required
            value={values.grantId} onChange={setField} onBlur={blur}
            error={visibleError('grantId')} options={grantOptions} disabled={!!grantId} />
        </div>
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn accent" disabled={busy}>{busy ? 'Uploading…' : 'Upload'}</button>
        </div>
      </form>
    </Modal>
  );
};
