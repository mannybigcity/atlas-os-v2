export const BOOKKEEPING_CATEGORIES = [
  "sales",
  "refunds",
  "fees",
  "payouts",
  "uncategorized",
] as const;

export type BookkeepingCategory = (typeof BOOKKEEPING_CATEGORIES)[number];

export type CategoryMatchField = "stripe_type" | "description" | "record_type";
export type CategoryMatchOperator = "equals" | "contains";

export type CategoryRule = {
  priority: number;
  enabled: boolean;
  matchField: CategoryMatchField;
  matchOperator: CategoryMatchOperator;
  matchValue: string;
  category: BookkeepingCategory;
};

export type CategorizableEntry = {
  stripeType: string;
  description: string;
  recordType: string;
};

export function defaultCategoryRules(): CategoryRule[] {
  return [
    rule(10, "stripe_type", "equals", "charge", "sales"),
    rule(20, "stripe_type", "equals", "payment", "sales"),
    rule(30, "stripe_type", "equals", "refund", "refunds"),
    rule(40, "stripe_type", "equals", "payment_refund", "refunds"),
    rule(50, "stripe_type", "contains", "fee", "fees"),
    rule(60, "stripe_type", "equals", "payout", "payouts"),
    rule(70, "stripe_type", "equals", "payout_failure", "payouts"),
    rule(80, "stripe_type", "equals", "payout_cancel", "payouts"),
  ];
}

export function categorize(
  entry: CategorizableEntry,
  rules: CategoryRule[],
): BookkeepingCategory {
  const ordered = [...rules]
    .filter((item) => item.enabled)
    .sort((left, right) => left.priority - right.priority || left.matchValue.localeCompare(right.matchValue));

  for (const item of ordered) {
    if (ruleMatches(entry, item)) {
      return item.category;
    }
  }

  return "uncategorized";
}

export function isBookkeepingCategory(value: string): value is BookkeepingCategory {
  return (BOOKKEEPING_CATEGORIES as readonly string[]).includes(value);
}

function ruleMatches(entry: CategorizableEntry, item: CategoryRule) {
  const haystack = fieldValue(entry, item.matchField).trim().toLowerCase();
  const needle = item.matchValue.trim().toLowerCase();

  if (!needle) {
    return false;
  }

  if (item.matchOperator === "equals") {
    return haystack === needle;
  }

  return haystack.includes(needle);
}

function fieldValue(entry: CategorizableEntry, field: CategoryMatchField) {
  if (field === "description") {
    return entry.description;
  }

  if (field === "record_type") {
    return entry.recordType;
  }

  return entry.stripeType;
}

function rule(
  priority: number,
  matchField: CategoryMatchField,
  matchOperator: CategoryMatchOperator,
  matchValue: string,
  category: BookkeepingCategory,
): CategoryRule {
  return {
    priority,
    enabled: true,
    matchField,
    matchOperator,
    matchValue,
    category,
  };
}
