// Shared atoms & icons (inline SVG, no dependencies)
import React from 'react';
import {
  useVizColor,
  scoreColor,
  trendColor,
  deltaColor,
  utilizationColor,
  washOf,
} from './viz-color.js';
import { TODAY } from './dates.js';

export const fmt = {
  money: (n, opts = {}) => {
    if (n == null) return '—';
    if (opts.compact) {
      if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
      if (n >= 1_000) return '$' + (n / 1_000).toFixed(0) + 'K';
      return '$' + n.toFixed(0);
    }
    return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  },
  pct: (n, d = 0) => (n * 100).toFixed(d) + '%',
  date: (s) => {
    const d = new Date(s + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },
  shortDate: (s) => {
    const d = new Date(s + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },
  monthYear: (s) => {
    const d = new Date(s + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  },
  daysUntil: (s) => {
    const d = new Date(s + 'T00:00:00');
    // Relative to the REAL today (shared module-eval value), so "X days late"
    // and "due in N days" track the real clock. The whole dataset is shifted
    // by the same offset, so every relationship is preserved.
    return Math.round((d - TODAY) / (1000 * 60 * 60 * 24));
  },
};

// Tiny SVG icon set — geometric, low chroma, matching system
export const Icon = ({ name, size = 14, stroke = 1.5 }) => {
  const paths = {
    home:    <path d="M3 10l7-6 7 6v8a1 1 0 0 1-1 1h-3v-6h-6v6H4a1 1 0 0 1-1-1z" />,
    grid:    <g><rect x="3" y="3" width="6" height="6"/><rect x="11" y="3" width="6" height="6"/><rect x="3" y="11" width="6" height="6"/><rect x="11" y="11" width="6" height="6"/></g>,
    check:   <g><rect x="3" y="3" width="14" height="14" rx="1"/><path d="M6 10l3 3 5-6"/></g>,
    file:    <path d="M5 2h7l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z M12 2v4h4"/>,
    sparkle: <path d="M10 2l1.5 5L17 8l-5.5 1L10 14l-1.5-5L3 8l5.5-1z"/>,
    shield:  <path d="M10 2l7 3v6c0 5-3.5 7.5-7 8-3.5-.5-7-3-7-8V5z"/>,
    chart:   <g><path d="M3 17V3"/><path d="M3 17h14"/><path d="M6 13l3-4 3 2 4-6"/></g>,
    bell:    <g><path d="M5 14V9a5 5 0 0 1 10 0v5l1.5 2h-13z"/><path d="M8 17a2 2 0 0 0 4 0"/></g>,
    search:  <g><circle cx="9" cy="9" r="5"/><path d="M13 13l4 4"/></g>,
    plus:    <g><path d="M10 4v12"/><path d="M4 10h12"/></g>,
    arrowR:  <g><path d="M5 10h10"/><path d="M11 6l4 4-4 4"/></g>,
    arrowL:  <g><path d="M15 10H5"/><path d="M9 6l-4 4 4 4"/></g>,
    chevR:   <path d="M8 5l5 5-5 5"/>,
    chevD:   <path d="M5 8l5 5 5-5"/>,
    download:<g><path d="M10 3v10"/><path d="M5 9l5 4 5-4"/><path d="M3 17h14"/></g>,
    filter:  <path d="M3 5h14l-5 6v5l-4-2v-3z"/>,
    user:    <g><circle cx="10" cy="7" r="3"/><path d="M3 17a7 7 0 0 1 14 0"/></g>,
    settings:<g><circle cx="10" cy="10" r="2"/><path d="M10 2v2 M10 16v2 M18 10h-2 M4 10H2 M15.6 4.4l-1.4 1.4 M5.8 14.2l-1.4 1.4 M15.6 15.6l-1.4-1.4 M5.8 5.8L4.4 4.4"/></g>,
    inbox:   <g><path d="M3 12V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v8"/><path d="M3 12l3 4h8l3-4"/><path d="M3 12h4l1 2h4l1-2h4"/></g>,
    moon:    <path d="M16 11A6 6 0 1 1 9 4a5 5 0 0 0 7 7z"/>,
    sun:     <g><circle cx="10" cy="10" r="4"/><path d="M10 2v2 M10 16v2 M18 10h-2 M4 10H2 M15.6 4.4l-1.4 1.4 M5.8 14.2l-1.4 1.4 M15.6 15.6l-1.4-1.4 M5.8 5.8L4.4 4.4"/></g>,
    book:    <g><path d="M3 4v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z"/><path d="M10 3v15"/></g>,
    flag:    <g><path d="M4 17V3"/><path d="M4 3h10l-2 4 2 4H4"/></g>,
    dots:    <g><circle cx="5" cy="10" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="15" cy="10" r="1.5"/></g>,
    close:   <g><path d="M5 5l10 10"/><path d="M15 5L5 15"/></g>,
    star:    <path d="M10 2l2.5 5 5.5.8-4 3.9.9 5.5L10 14.5 5.1 17.2 6 11.7 2 7.8l5.5-.8z"/>,
    play:    <path d="M5 4l11 6-11 6z"/>,
    menu:    <g><path d="M3 6h14"/><path d="M3 10h14"/><path d="M3 14h14"/></g>,
  };
  const p = paths[name];
  return (
    <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{display:'block'}}>
      {p}
    </svg>
  );
};

// Editorial shimmer placeholder — token-driven, no generic gray.
// Honors prefers-reduced-motion (the shimmer keyframe is disabled in CSS).
export const Skeleton = ({ width = '100%', height = 16, radius = 2, style = {} }) => (
  <span
    className="skeleton"
    aria-hidden="true"
    style={{ display: 'block', width, height, borderRadius: radius, ...style }}
  />
);

// Status component
export const Status = ({ s }) => {
  const map = {
    ACTIVE:      { c: 'active',  l: 'Active' },
    DRAFT:       { c: 'draft',   l: 'Draft' },
    CLOSED:      { c: 'closed',  l: 'Closed' },
    OPEN:        { c: 'active',  l: 'Open' },
    IN_PROGRESS: { c: 'draft',   l: 'In progress' },
    COMPLETE:    { c: 'closed',  l: 'Complete' },
    NOT_AWARDED: { c: 'alert',   l: 'Not awarded' },
  };
  const v = map[s] || { c: '', l: s };
  return (
    <span className={`status ${v.c}`}>
      <span className="dot"></span>{v.l}
    </span>
  );
};

// Donut
export const Donut = ({ pct, size = 140, label, valueText, centerLabel, color }) => {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(pct, 1));
  const { on } = useVizColor();
  // Explicit color always wins; otherwise color mode tints the arc by score.
  const fill = color || (on ? scoreColor(pct) : 'var(--ink)');
  // The center block is clamped to the ring's inner circle so text can never
  // collide with the arc: the number scales with the ring, and only the short
  // uppercase centerLabel may join it. Long captions (valueText) render BELOW
  // the ring — framework enumerations used to spill across the arc.
  const inner = size - stroke * 2 - 16;
  const numSize = Math.max(26, Math.min(40, Math.round(size * 0.22)));
  return (
    <div className="ring-wrap">
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg
          className="donut-svg"
          width={size}
          height={size}
          role="img"
          aria-label={`${(pct * 100).toFixed(0)}%${centerLabel ? ` ${centerLabel}` : ''}${label ? ` — ${label}` : ''}`}
        >
          <circle className="track" cx={size/2} cy={size/2} r={r} strokeWidth={stroke} />
          <circle className="fill"  cx={size/2} cy={size/2} r={r} strokeWidth={stroke} stroke={fill} strokeDasharray={c} strokeDashoffset={off} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <div style={{ maxWidth: inner, overflow: 'hidden' }}>
            <div className="serif" style={{ fontSize: numSize, lineHeight: 1 }}>{(pct * 100).toFixed(0)}<span style={{ fontSize: Math.round(numSize * 0.55), color: 'var(--ink-3)' }}>%</span></div>
            {centerLabel && <div className="mono" style={{ fontSize: 9, color: 'var(--small-text-accessible)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 5, whiteSpace: 'nowrap' }}>{centerLabel}</div>}
          </div>
        </div>
      </div>
      {(label || valueText) && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          {label && <div className="kicker">{label}</div>}
          {valueText && <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em', textAlign: 'center' }}>{valueText}</div>}
        </div>
      )}
    </div>
  );
};

// Sparkline
export const Sparkline = ({ data, height = 60, fillColor = null, strokeColor = 'var(--ink)' }) => {
  const { on } = useVizColor();
  // Color mode: stroke follows the series trend (rising = accent, falling =
  // indigo) and the area becomes a translucent wash of that color.
  const trendCol = on ? trendColor(data) : null;
  const stroke = trendCol ?? strokeColor;
  // No hardcoded light fill: default to a wash of the stroke so the area
  // reads correctly in every theme (the literal broke dark mode).
  const fill = trendCol ? washOf(trendCol) : (fillColor || washOf(stroke, 12));
  const w = 600;
  const max = Math.max(...data) * 1.1;
  const min = 0;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, height - ((v - min) / (max - min)) * (height - 8) - 4]);
  const path = pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ');
  const area = path + ` L ${w} ${height} L 0 ${height} Z`;
  const last = data[data.length - 1];
  const first = data[0];
  const trend = last > first ? 'trending up' : last < first ? 'trending down' : 'flat';
  return (
    <svg
      className="spark"
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Trend over ${data.length} periods, ${trend}`}
    >
      <path d={area} fill={fill} />
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.2" />
    </svg>
  );
};

// Bar group
export const BarGroup = ({ data, height = 120, color = 'var(--ink)' }) => {
  const { on } = useVizColor();
  const max = Math.max(...data.map(d => d.v)) * 1.15;
  const peak = data.reduce((a, b) => (b.v > a.v ? b : a), data[0]);
  return (
    <div
      role="img"
      aria-label={`Bar chart across ${data.length} periods, peak in ${peak?.m}`}
      style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height, paddingBottom: 18, position: 'relative' }}>
      {data.map((d, i) => {
        // In color mode each bar is tinted by its direction vs the prior period
        // (first bar has no predecessor → accent); otherwise the ink fallback.
        const barColor = on ? deltaColor(d.v, data[i - 1]?.v ?? null) : color;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
            <div style={{ height: ((d.v / max) * (height - 26)) + 'px', background: barColor, alignSelf: 'stretch', marginTop: 'auto' }}></div>
            <div className="mono" style={{ fontSize: 9, color: 'var(--ink-4)', textAlign: 'center', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{d.m}</div>
          </div>
        );
      })}
    </div>
  );
};

// Line / area chart over labeled months — hand-rolled SVG, no deps.
// Mirrors BarGroup's data shape ({ m, v }) so the dashboard can toggle between
// the two. In color mode the stroke + area follow the series trend color
// (rising = accent, falling = indigo); off, it falls back to ink.
export const LineArea = ({ data, height = 180, color }) => {
  const { on } = useVizColor();
  const trend = on ? trendColor(data.map((d) => d.v)) : (color || 'var(--ink)');
  const stroke = color || trend;
  const w = 600;
  const padY = 22; // room for the month labels under the plot
  const plotH = height - padY;
  const max = Math.max(...data.map((d) => d.v)) * 1.1;
  const step = data.length > 1 ? w / (data.length - 1) : 0;
  const y = (v) => plotH - (v / max) * (plotH - 8) - 4;
  const pts = data.map((d, i) => [i * step, y(d.v)]);
  const path = pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ');
  const area = `${path} L ${w} ${plotH} L 0 ${plotH} Z`;
  const peak = data.reduce((a, b) => (b.v > a.v ? b : a), data[0]);
  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height, display: 'block' }}
        role="img"
        aria-label={`Line chart across ${data.length} periods, peak in ${peak?.m}`}
      >
        <path d={area} fill={washOf(stroke, 14)} />
        <path d={path} fill="none" stroke={stroke} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="2" fill={stroke} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: -16 }}>
        {data.map((d, i) => (
          <span key={i} className="mono" style={{ fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{d.m}</span>
        ))}
      </div>
    </div>
  );
};

// Stacked utilization bar (spent / encumbered / remaining)
export const Utilization = ({ spent, encumbered, total }) => {
  const { on } = useVizColor();
  const ps = (spent / total) * 100;
  const pe = (encumbered / total) * 100;
  // Color mode: tint the spent segment by utilization threshold (spent/total)
  // and render the encumbered segment as a lighter wash of the same color.
  const spentColor = on ? utilizationColor(ps / 100) : 'var(--ink)';
  const encumberedColor = on ? washOf(spentColor, 45) : 'var(--ink-3)';
  return (
    <div
      className="stacked"
      role="img"
      aria-label={`${ps.toFixed(0)}% spent, ${pe.toFixed(0)}% encumbered`}
      title={`${ps.toFixed(0)}% spent, ${pe.toFixed(0)}% encumbered`}>
      <span style={{ width: ps + '%', background: spentColor }}></span>
      <span style={{ width: pe + '%', background: encumberedColor }}></span>
    </div>
  );
};
