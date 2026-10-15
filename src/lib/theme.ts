import { useSyncExternalStore } from 'react'

export type ThemePref = 'system' | 'light' | 'dark'

const KEY = 'turfen:theme'
const listeners = new Set<() => void>()

const read = (): ThemePref => {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {}
  return 'system'
}

let pref = read()
const media = window.matchMedia('(prefers-color-scheme: dark)')

function apply() {
  const root = document.documentElement
  if (pref === 'system') delete root.dataset.theme
  else root.dataset.theme = pref
  const dark = pref === 'dark' || (pref === 'system' && media.matches)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#141211' : '#f6f1ee')
}

export function setTheme(next: ThemePref) {
  pref = next
  try {
    localStorage.setItem(KEY, next)
  } catch {}
  apply()
  listeners.forEach((l) => l())
}

export const useTheme = () =>
  useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => pref,
  )

media.addEventListener('change', apply)
apply()
