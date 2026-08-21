// Initial-load workspace skeleton.
// Layout-matching shell shown ONCE on first mount (~500ms) while the real
// product would hydrate its data. Editorial shimmer via the .skeleton token
// class; purely decorative (aria-hidden) with a polite status for AT.
import React from 'react';
import { Skeleton } from './atoms.jsx';

const SidebarShell = () => (
  <aside className="sidebar" aria-hidden="true">
    <div className="sidebar-brand">
      <span className="mark">G</span>
      <span className="word">Grant Tracker</span>
      <span className="ver">v2.0</span>
    </div>
    <div className="sidebar-section">
      <Skeleton width="40%" height={10} style={{ marginBottom: 14 }} />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} height={14} style={{ margin: '0 8px 10px 0', width: `${78 - i * 6}%` }} />
      ))}
    </div>
    <div className="sidebar-section">
      <Skeleton width="46%" height={10} style={{ marginBottom: 14 }} />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} height={14} style={{ margin: '0 8px 10px 0', width: `${72 - i * 8}%` }} />
      ))}
    </div>
  </aside>
);

export const WorkspaceSkeleton = () => (
  <div className="app">
    <SidebarShell />
    <div className="main">
      <div className="topbar" aria-hidden="true">
        <Skeleton width={160} height={12} />
        <div className="tb-search"><Skeleton width="100%" height={14} /></div>
      </div>
      <div className="main-inner" role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">Loading workspace…</span>
        {/* Page head */}
        <div style={{ marginBottom: 28, paddingBottom: 22, borderBottom: '1px solid var(--rule)' }}>
          <Skeleton width={120} height={11} style={{ marginBottom: 14 }} />
          <Skeleton width="42%" height={40} style={{ marginBottom: 16 }} />
          <Skeleton width="56%" height={13} />
        </div>
        {/* Metric strip */}
        <div className="bento" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }} aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="metric" key={i} style={{ minHeight: 90 }}>
              <Skeleton width="50%" height={10} style={{ marginBottom: 12 }} />
              <Skeleton width="60%" height={30} />
            </div>
          ))}
        </div>
        {/* Card rows */}
        <div className="card" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderBottom: i < 5 ? '1px solid var(--rule)' : 'none' }}>
              <Skeleton width={28} height={28} radius="50%" />
              <Skeleton width="32%" height={14} />
              <Skeleton width="14%" height={12} style={{ marginLeft: 'auto' }} />
              <Skeleton width="10%" height={12} />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
