const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function toKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Monday of the week containing `date`, offset by `weekOffset` weeks. */
export function weekStart(date = new Date(), weekOffset = 0) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - diff + weekOffset * 7);
  return d;
}

export function weekDays(weekOffset = 0) {
  const start = weekStart(new Date(), weekOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function dayLabel(d) {
  return DAY_NAMES[d.getDay()];
}

export function shortDate(d) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function weekRangeLabel(days) {
  const a = days[0];
  const b = days[days.length - 1];
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${MONTHS[a.getMonth()]}` : `${shortDate(a)} – ${shortDate(b)}`;
}

export function isToday(d) {
  return toKey(d) === toKey(new Date());
}
