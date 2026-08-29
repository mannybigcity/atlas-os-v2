export type DeskFollowUpItem = {
  id: string;
  title: string;
  detail: string | null;
  dueAt: string;
  href?: string;
};

export type DeskFollowUpQueues = {
  overdue: DeskFollowUpItem[];
  today: DeskFollowUpItem[];
  tomorrow: DeskFollowUpItem[];
  later: DeskFollowUpItem[];
};

export function parseDeskDate(value: string | null | undefined): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function startOfLocalDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addLocalDays(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

export function isSameLocalDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function bucketFollowUpQueues(
  items: DeskFollowUpItem[],
  now = new Date(),
): DeskFollowUpQueues {
  const today = startOfLocalDay(now);
  const tomorrow = addLocalDays(today, 1);
  const queues: DeskFollowUpQueues = {
    overdue: [],
    today: [],
    tomorrow: [],
    later: [],
  };

  for (const item of items) {
    const due = parseDeskDate(item.dueAt);
    if (!due) continue;

    const dueDay = startOfLocalDay(due);
    if (dueDay.getTime() < today.getTime()) {
      queues.overdue.push(item);
    } else if (isSameLocalDay(dueDay, today)) {
      queues.today.push(item);
    } else if (isSameLocalDay(dueDay, tomorrow)) {
      queues.tomorrow.push(item);
    } else {
      queues.later.push(item);
    }
  }

  const byDue = (left: DeskFollowUpItem, right: DeskFollowUpItem) =>
    (parseDeskDate(left.dueAt)?.getTime() ?? 0) - (parseDeskDate(right.dueAt)?.getTime() ?? 0);

  queues.overdue.sort(byDue);
  queues.today.sort(byDue);
  queues.tomorrow.sort(byDue);
  queues.later.sort(byDue);
  return queues;
}
