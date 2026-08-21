// Tiny plain-JS validation rule runner.
//
// Replicates the *behavior* of the reference Zod schemas (lib/validations.ts)
// without the dependency. Given a `values` object and a `rules` config, returns
// a map of `{ field: [messages] }`. An empty map means the form is valid.
//
// Supported per-field rule keys:
//   required                         — non-empty (after trim for strings)
//   minLength / maxLength            — string length bounds
//   min / max                        — numeric bounds (coerced via Number)
//   integer: true                    — whole-number check
//   pattern: { re, message }         — regex test (skipped when empty)
//   oneOf: { values:[...], message } — enum membership
//   multipleOf: { step, message }    — currency-grade step (0.01 → cents)
//   dateRange: { min, max, ... }     — ISO date bounds (inclusive)
//
// Cross-field rules live under the top-level `custom` array on a rule set:
//   custom: [ (values) => msg|null, ... ] applied to a named `field`.

// True when a value is "empty" for validation purposes.
const isEmpty = (v) =>
  v == null || (typeof v === 'string' && v.trim() === '');

// multipleOf for currency: avoid float drift by working in integer units.
// step 0.01 → value*100 must be a (near-)integer.
const isMultipleOf = (value, step) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return false;
  const scaled = n / step;
  return Math.abs(scaled - Math.round(scaled)) < 1e-9;
};

// Validate a single field's value against its rule object. Returns string[].
function runField(value, rule, values) {
  const msgs = [];

  if (rule.required && isEmpty(value)) {
    msgs.push(rule.requiredMessage || 'This field is required.');
    // No point running further checks on an empty required field.
    return msgs;
  }

  // Optional + empty → valid, skip the rest.
  if (!rule.required && isEmpty(value)) return msgs;

  if (typeof value === 'string') {
    if (rule.minLength != null && value.length < rule.minLength) {
      msgs.push(rule.minLengthMessage || `Must be at least ${rule.minLength} characters.`);
    }
    if (rule.maxLength != null && value.length > rule.maxLength) {
      msgs.push(rule.maxLengthMessage || `Must be ${rule.maxLength} characters or fewer.`);
    }
    if (rule.pattern && value !== '' && !rule.pattern.re.test(value)) {
      msgs.push(rule.pattern.message || 'Invalid format.');
    }
  }

  if (rule.min != null || rule.max != null || rule.integer || rule.multipleOf) {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      msgs.push(rule.numberMessage || 'Must be a valid number.');
    } else {
      if (rule.integer && !Number.isInteger(n)) {
        msgs.push(rule.integerMessage || 'Must be a whole number.');
      }
      if (rule.min != null && n < rule.min) {
        msgs.push(rule.minMessage || `Must be at least ${rule.min}.`);
      }
      if (rule.max != null && n > rule.max) {
        msgs.push(rule.maxMessage || `Must be at most ${rule.max}.`);
      }
      if (rule.multipleOf && !isMultipleOf(n, rule.multipleOf.step)) {
        msgs.push(rule.multipleOf.message || 'Invalid increment.');
      }
    }
  }

  if (rule.oneOf && !rule.oneOf.values.includes(value)) {
    msgs.push(rule.oneOf.message || 'Invalid selection.');
  }

  if (rule.dateRange) {
    const t = Date.parse(value);
    if (Number.isNaN(t)) {
      msgs.push(rule.dateRange.invalidMessage || 'Invalid date.');
    } else {
      if (rule.dateRange.min != null && t < Date.parse(rule.dateRange.min)) {
        msgs.push(rule.dateRange.minMessage || `Date cannot be before ${rule.dateRange.min}.`);
      }
      if (rule.dateRange.max != null && t > Date.parse(rule.dateRange.max)) {
        msgs.push(rule.dateRange.maxMessage || `Date cannot be after ${rule.dateRange.max}.`);
      }
    }
  }

  return msgs;
}

/**
 * Validate a values object against a rule set.
 * @param {object} values
 * @param {{ fields: object, custom?: {field:string, fn:(v)=>string|null}[] }} ruleSet
 * @returns {Record<string, string[]>} errors keyed by field (empty = valid)
 */
export function validate(values, ruleSet) {
  const errors = {};
  const { fields = {}, custom = [] } = ruleSet;

  for (const [field, rule] of Object.entries(fields)) {
    const msgs = runField(values[field], rule, values);
    if (msgs.length) errors[field] = msgs;
  }

  // Cross-field validators run regardless of single-field state, but only add a
  // message when they return one. They attach to a named field for display.
  for (const { field, fn } of custom) {
    const msg = fn(values);
    if (msg) {
      errors[field] = errors[field] ? [...errors[field], msg] : [msg];
    }
  }

  return errors;
}

export const isValid = (errors) => Object.keys(errors).length === 0;

// ------------------------------------------------------------------
// Encoded rule sets — EXACT values mirrored from lib/validations.ts.
// ------------------------------------------------------------------

export const GRANT_STATUS = ['DRAFT', 'ACTIVE', 'CLOSED', 'NOT_AWARDED'];
export const TASK_STATUS = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
export const TASK_PRIORITY = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
export const BUDGET_CATEGORY = [
  'PERSONNEL', 'FRINGE_BENEFITS', 'TRAVEL', 'EQUIPMENT', 'SUPPLIES',
  'CONTRACTUAL', 'TOTAL_DIRECT_COSTS', 'INDIRECT_COSTS', 'OTHER',
];

// Create Grant — createGrantSchema
export const grantRules = {
  fields: {
    title: {
      required: true,
      requiredMessage: 'Grant title is required.',
      minLength: 5,
      minLengthMessage: 'Grant title must be at least 5 characters.',
      maxLength: 200,
      maxLengthMessage: 'Grant title must be less than 200 characters.',
      pattern: {
        re: /^[a-zA-Z0-9\s\-:().,&]+$/,
        message: 'Grant title contains invalid characters.',
      },
    },
    grantNumber: {
      required: true,
      requiredMessage: 'Grant number is required.',
      minLength: 3,
      minLengthMessage: 'Grant number must be at least 3 characters.',
      maxLength: 50,
      maxLengthMessage: 'Grant number must be less than 50 characters.',
      pattern: {
        re: /^[A-Z0-9\-]+$/,
        message: 'Grant number must contain only uppercase letters, numbers, and hyphens.',
      },
    },
    agency: {
      required: true,
      requiredMessage: 'Agency name is required.',
      minLength: 2,
      minLengthMessage: 'Agency name must be at least 2 characters.',
      maxLength: 100,
      maxLengthMessage: 'Agency name must be less than 100 characters.',
    },
    pi: {
      required: true,
      requiredMessage: 'A Principal Investigator is required.',
    },
    startDate: {
      required: true,
      requiredMessage: 'Start date is required.',
      dateRange: {
        min: '2020-01-01',
        max: '2030-12-31',
        minMessage: 'Start date cannot be before 2020.',
        maxMessage: 'Start date cannot be after 2030.',
      },
    },
    endDate: {
      required: true,
      requiredMessage: 'End date is required.',
      dateRange: {
        min: '2020-01-01',
        max: '2035-12-31',
        minMessage: 'End date cannot be before 2020.',
        maxMessage: 'End date cannot be after 2035.',
      },
    },
    totalYears: {
      required: true,
      requiredMessage: 'Total years is required.',
      integer: true,
      integerMessage: 'Total years must be a whole number.',
      min: 1,
      minMessage: 'Grant must be at least 1 year.',
      max: 5,
      maxMessage: 'Grant cannot exceed 5 years.',
    },
    status: {
      required: true,
      oneOf: { values: GRANT_STATUS, message: 'Invalid status.' },
    },
    description: {
      maxLength: 1000,
      maxLengthMessage: 'Description must be less than 1000 characters.',
    },
  },
  custom: [
    {
      field: 'endDate',
      fn: (v) => {
        if (!v.startDate || !v.endDate) return null;
        return Date.parse(v.endDate) > Date.parse(v.startDate)
          ? null
          : 'End date must be after start date.';
      },
    },
  ],
};

// Create Task — createTaskSchema
export const taskRules = {
  fields: {
    title: {
      required: true,
      requiredMessage: 'Task title is required.',
      minLength: 5,
      minLengthMessage: 'Task title must be at least 5 characters.',
      maxLength: 200,
      maxLengthMessage: 'Task title must be less than 200 characters.',
    },
    description: {
      maxLength: 1000,
      maxLengthMessage: 'Task description must be less than 1000 characters.',
    },
    status: {
      required: true,
      oneOf: { values: TASK_STATUS, message: 'Invalid status.' },
    },
    priority: {
      required: true,
      oneOf: { values: TASK_PRIORITY, message: 'Invalid priority.' },
    },
    // assignee + dueDate are optional → no rules.
  },
  custom: [
    {
      field: 'status',
      fn: (v) => {
        if (!v.dueDate) return null;
        const overdue = Date.parse(v.dueDate) < Date.now();
        if (!overdue) return null;
        return v.status === 'COMPLETED' || v.status === 'CANCELLED'
          ? null
          : 'Overdue tasks must be completed or cancelled.';
      },
    },
  ],
};

// Budget Line Item — createBudgetLineItemSchema
const amountRule = (label) => ({
  required: true,
  requiredMessage: `${label} is required.`,
  min: 0,
  minMessage: `${label} cannot be negative.`,
  max: 10000000,
  maxMessage: `${label} cannot exceed $10,000,000.`,
  multipleOf: { step: 0.01, message: `${label} must be a valid currency amount.` },
});

// Reallocation request — validated against the LIVE source-category balance.
// `balances` maps category → available balance (budgeted − spent − encumbered).
// Amount may not exceed the source balance, and source ≠ destination.
export function makeReallocationRules(balances) {
  const usd = (n) => '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
  return {
    fields: {
      fromCat: { required: true, requiredMessage: 'Select a source category.' },
      toCat: { required: true, requiredMessage: 'Select a destination category.' },
      amount: {
        required: true,
        requiredMessage: 'Enter an amount.',
        min: 0.01,
        minMessage: 'Amount must be greater than zero.',
        max: 10000000,
        maxMessage: 'Amount cannot exceed $10,000,000.',
        multipleOf: { step: 0.01, message: 'Amount must be a valid currency amount.' },
      },
      reason: {
        required: true,
        requiredMessage: 'A justification is required.',
        minLength: 5,
        minLengthMessage: 'Justification must be at least 5 characters.',
        maxLength: 500,
        maxLengthMessage: 'Justification must be under 500 characters.',
      },
    },
    custom: [
      {
        field: 'toCat',
        fn: (v) => (v.fromCat && v.toCat && v.fromCat === v.toCat
          ? 'Source and destination categories must differ.'
          : null),
      },
      {
        field: 'amount',
        fn: (v) => {
          const amt = Number(v.amount);
          if (!Number.isFinite(amt) || !v.fromCat) return null;
          const avail = balances[v.fromCat] ?? 0;
          return amt > avail
            ? `Exceeds available balance in ${v.fromCat} (${usd(avail)}).`
            : null;
        },
      },
    ],
  };
}

export const budgetRules = {
  fields: {
    category: {
      required: true,
      oneOf: { values: BUDGET_CATEGORY, message: 'Invalid category.' },
    },
    description: {
      required: true,
      requiredMessage: 'Description is required.',
      minLength: 5,
      minLengthMessage: 'Description must be at least 5 characters.',
      maxLength: 500,
      maxLengthMessage: 'Description must be less than 500 characters.',
    },
    budgetedAmount: amountRule('Budgeted amount'),
    actualSpent: amountRule('Actual spent'),
    encumberedAmount: amountRule('Encumbered amount'),
  },
  custom: [
    {
      field: 'actualSpent',
      fn: (v) => {
        const budgeted = Number(v.budgetedAmount);
        const actual = Number(v.actualSpent);
        const encumbered = Number(v.encumberedAmount);
        if (![budgeted, actual, encumbered].every(Number.isFinite)) return null;
        return actual + encumbered <= budgeted * 1.1
          ? null
          : 'Total spent and encumbered cannot exceed 110% of budgeted amount.';
      },
    },
  ],
};
