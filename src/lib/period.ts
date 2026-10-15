// Factuurperiode: vrijdag t/m donderdag (LM Flex self-billing).
// Weeknummer = ISO-week van de afsluitende donderdag (zo staat het op de factuur).

export const pad = (n: number) => String(n).padStart(2, '0')
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (s: string, n: number) => {
  const d = parse(s)
  d.setDate(d.getDate() + n)
  return iso(d)
}
export const today = () => iso(new Date())

export function isoWeek(s: string) {
  const d = parse(s)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const jan4 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - jan4.getTime()) / 864e5 - 3 + ((jan4.getDay() + 6) % 7)) / 7)
}

export interface Period {
  start: string
  end: string
  week: number
  year: number
}

/** endDow: 0=zo … 4=do … 6=za. De periode eindigt op die dag (inclusief). */
export function periodFor(date: string, endDow = 4): Period {
  const d = parse(date)
  const diff = (endDow - d.getDay() + 7) % 7
  const end = addDays(date, diff)
  return { start: addDays(end, -6), end, week: isoWeek(end), year: parse(end).getFullYear() }
}

export const shiftPeriod = (p: Period, n: number, endDow = 4) => periodFor(addDays(p.end, 7 * n), endDow)

export const daysOf = (p: Period) => Array.from({ length: 7 }, (_, i) => addDays(p.start, i))

const dayFmt = new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
const longFmt = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
export const fmtDay = (s: string) => dayFmt.format(parse(s))
export const fmtLong = (s: string) => longFmt.format(parse(s))
export const weekdayShort = (s: string) => new Intl.DateTimeFormat('nl-NL', { weekday: 'short' }).format(parse(s))
