// Pure month-allocation math for the expenditure drill-down.
//
// The demo has REAL monthly totals (data.js `monthly`) but no transaction-level
// history behind them — and fabricating a year of grant activity would be a
// coherence trap. So the drawer derives an ILLUSTRATIVE allocation of a month's
// total across the active awards, proportional to each award's cumulative burn,
// with largest-remainder rounding so the rows cross-foot to the month's total
// to the dollar. Deterministic: same inputs → same rows.

/**
 * @param {number} total   the month's expenditure total (dollars)
 * @param {Array<{id:string,title:string,agencyShort:string,number:string,spent:number,status:string}>} grants
 * @returns {Array<{grant:object, amount:number, share:number}>} rows summing exactly to `total`
 */
export function allocateMonth(total, grants) {
  const active = grants.filter((g) => g.status === 'ACTIVE' && g.spent > 0);
  const weightSum = active.reduce((s, g) => s + g.spent, 0);
  if (!active.length || weightSum <= 0 || !(total > 0)) return [];

  // Ideal (fractional) shares, floored — then hand out the remaining dollars to
  // the largest remainders so the column sums exactly.
  const ideal = active.map((g) => (g.spent / weightSum) * total);
  const floors = ideal.map(Math.floor);
  let leftover = Math.round(total) - floors.reduce((s, v) => s + v, 0);
  const order = ideal
    .map((v, i) => ({ i, frac: v - floors[i] }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  const amounts = floors.slice();
  for (let k = 0; k < order.length && leftover > 0; k++, leftover--) amounts[order[k].i] += 1;

  return active
    .map((g, i) => ({ grant: g, amount: amounts[i], share: amounts[i] / Math.round(total) }))
    .sort((a, b) => b.amount - a.amount);
}
