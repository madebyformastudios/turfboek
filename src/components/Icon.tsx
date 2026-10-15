const PATHS = {
  bolt: 'M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2z',
  flame: 'M12 22c3.9 0 7-2.9 7-7 0-2.6-1.4-4.6-2.6-6.1-.4 1.4-1.3 2.6-2.4 2.9C14 8 12.6 4.6 9.6 2.5 9.8 6 5 8.6 5 15c0 4.1 3.1 7 7 7z',
  combi: 'M9 2 3.5 10H8l-.7 6L13 8H9l.7-6zM17 22c2.2 0 4-1.6 4-4 0-1.5-.8-2.6-1.5-3.5-.2.8-.7 1.5-1.4 1.7-.1-1.9-.9-3.9-2.6-5.1.1 2-2.5 3.5-2.5 6.9 0 2.4 1.8 4 4 4z',
  house: 'M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z',
  ban: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM5.6 5.6l12.8 12.8',
  warn: 'M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9.5v4M12 17h.01',
  lock: 'M5.5 11h13a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM8 11V7.5a4 4 0 0 1 8 0V11',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5V12l3 2',
  car: 'M5 16.5h14v-4.2L17.2 7.5a1.5 1.5 0 0 0-1.4-1H8.2a1.5 1.5 0 0 0-1.4 1L5 12.3zM5 12.5h14M7 16.5V19M17 16.5V19M8 14.5h.01M16 14.5h.01',
  tally: 'M6 4.5v15M10 4.5v15M14 4.5v15M18 4.5v15M3.5 15.5l17-7',
  chart: 'M5 20V11M12 20V4M19 20v-6',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 21a7.5 7.5 0 0 1 15 0',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  close: 'M6 6l12 12M18 6 6 18',
  share: 'M12 15V3.5M7.5 8 12 3.5 16.5 8M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z',
  phone: 'M8 2.5h8a1.5 1.5 0 0 1 1.5 1.5v16a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 20V4A1.5 1.5 0 0 1 8 2.5zM11 18.5h2',
  sync: 'M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4',
  tag: 'M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1l8 8a1.5 1.5 0 0 1 0 2.1l-6 6a1.5 1.5 0 0 1-2.1 0zM8 8h.01',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 22, stroke = 2 }: { name: IconName; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  )
}
