// Month drill-down for the dashboard expenditure chart — the numbers behind a
// bar. The month TOTAL is the same fixture value that draws the bar; the
// per-award allocation is derived (allocate.js) and cross-foots to that total
// to the dollar; the drawer says exactly what production does differently.
import React from 'react';
import { DATA } from './data.js';
import { fmt } from './atoms.jsx';
import { Drawer } from './drawer.jsx';
import { allocateMonth } from './allocate.js';

export const MonthDrawer = ({ month, months, onClose, navigate }) => {
  if (!month) return null;
  const idx = months.findIndex((x) => x === month);
  const prev = idx > 0 ? months[idx - 1] : null;
  const windowTotal = months.reduce((s, x) => s + x.v, 0);
  const delta = prev ? month.v - prev.v : null;
  const rank = 1 + months.filter((x) => x.v > month.v).length;
  const rows = allocateMonth(month.v, DATA.grants);

  return (
    <Drawer
      open={!!month}
      onClose={onClose}
      title={`${month.m} ${month.yy} expenditure`}
      subtitle="The numbers behind this bar"
    >
      <div className="flex-col gap-24">
        <div className="onb-figures" style={{ margin: 0 }}>
          <div>
            <span className="kicker">Month total</span>
            <span className="serif onb-fig">{fmt.money(month.v, { compact: true })}</span>
            <span className="muted mono" style={{ fontSize: 11 }}>{fmt.money(month.v)}</span>
          </div>
          <div>
            <span className="kicker">Vs prior month</span>
            <span className="serif onb-fig" style={{ color: delta == null ? 'var(--ink)' : delta >= 0 ? 'var(--alert)' : 'var(--fund)' }}>
              {delta == null ? '—' : `${delta >= 0 ? '+' : '−'}${fmt.money(Math.abs(delta), { compact: true })}`}
            </span>
            <span className="muted">{prev ? `${prev.m} was ${fmt.money(prev.v, { compact: true })}` : 'first month shown'}</span>
          </div>
          <div>
            <span className="kicker">In this window</span>
            <span className="serif onb-fig">{fmt.pct(month.v / windowTotal, 1)}</span>
            <span className="muted">of {fmt.money(windowTotal, { compact: true })} · #{rank} of {months.length} months</span>
          </div>
        </div>

        <div>
          <div className="drawer-section-label">Allocation across active awards</div>
          <div className="table-scroll"><table className="ledger">
            <thead>
              <tr><th>Award</th><th className="r">Amount</th><th className="r">Share</th></tr>
            </thead>
            <tbody>
              {rows.map(({ grant, amount, share }) => (
                <tr key={grant.id} className="row-h" style={{ cursor: 'pointer' }} onClick={() => { onClose(); navigate({ name: 'grant', id: grant.id, grant, tab: 'budget' }); }}>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{grant.title}</div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>{grant.agencyShort} · {grant.number}</div>
                  </td>
                  <td className="num r">{fmt.money(amount)}</td>
                  <td className="num r muted">{fmt.pct(share, 1)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '1px solid var(--ink)' }}>
                <td className="mono" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em' }}>TOTAL</td>
                <td className="num r" style={{ fontWeight: 600 }} data-month-total>{fmt.money(rows.reduce((s, r) => s + r.amount, 0))}</td>
                <td className="num r muted">100%</td>
              </tr>
            </tfoot>
          </table></div>
        </div>

        <div className="flag indigo">
          <div className="lbl">Derived breakdown</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>
            The month total is real fixture data — the same number that draws the bar. Its
            allocation across active awards is illustrative (proportional to each award’s
            cumulative burn) and cross-foots to the total exactly. In the production build this
            drawer opens the month’s actual transaction ledger, filterable by award and category.
          </div>
        </div>

        <button className="btn-link" onClick={() => { onClose(); navigate({ name: 'reports' }); }}>Portfolio burn-rate report →</button>
      </div>
    </Drawer>
  );
};
