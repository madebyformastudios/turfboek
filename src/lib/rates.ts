export type Unit = 'stuks' | 'uur' | 'bedrag'

import type { IconName } from '../components/Icon'

export interface Activity {
  icon: IconName
  code: number
  name: string
  short: string
  unit: Unit
  price: number
  tone: 'elec' | 'gas' | 'fail' | 'paid-fail' | 'hour' | 'cost'
  reasons?: string[]
}

// Tarieven Circet – STEDIN 2026 (ZZP). Houd gelijk met public.activity_types.
export const ACTIVITIES: Activity[] = [
  { icon: 'bolt', code: 30, name: 'Solo-plaatsing: E-meter', short: 'E-meter', unit: 'stuks', price: 32.3, tone: 'elec' },
  { icon: 'bolt', code: 10, name: 'Combi-plaatsing: E-meter', short: 'Combi E', unit: 'stuks', price: 32.3, tone: 'elec' },
  { icon: 'flame', code: 20, name: 'Combi-plaatsing: G-meter', short: 'Combi G', unit: 'stuks', price: 10.098, tone: 'gas' },
  { icon: 'flame', code: 40, name: 'Solo-plaatsing: G-meter', short: 'Solo gas', unit: 'stuks', price: 27.46, tone: 'gas' },
  {
    icon: 'house', code: 0, name: 'Niet uitgevoerd (€0)', short: 'Niet thuis', unit: 'stuks', price: 0, tone: 'fail',
    reasons: ['Klant niet thuis', 'Klant wil nieuwe afspraak', 'Geen medewerking klant'],
  },
  {
    icon: 'ban', code: 50, name: 'Niet uitvoerbaar', short: 'Niet uitvoerbaar', unit: 'stuks', price: 15.3, tone: 'paid-fail',
    reasons: ['Pand onbewoond', 'Pand wordt gesloopt', 'Overig'],
  },
  { icon: 'warn', code: 60, name: 'TNU - asbest', short: 'TNU asbest', unit: 'stuks', price: 19.18, tone: 'paid-fail' },
  { icon: 'lock', code: 70, name: 'TNU - geen toegang meterkast', short: 'TNU meterkast', unit: 'stuks', price: 19.18, tone: 'paid-fail' },
  { icon: 'clock', code: 80, name: 'Regie-uur VOP-m', short: 'VOP-m regie', unit: 'uur', price: 42.5, tone: 'hour' },
  { icon: 'clock', code: 90, name: 'Regie-uur VP', short: 'VP regie', unit: 'uur', price: 46.75, tone: 'hour' },
  { icon: 'car', code: 100, name: 'Reis / transportkosten', short: 'Reis / parkeren', unit: 'bedrag', price: 0, tone: 'cost' },
]

export const byCode = new Map(ACTIVITIES.map((a) => [a.code, a]))
export const activity = (code: number) => byCode.get(code) ?? ACTIVITIES[0]

const eur = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' })
export const money = (n: number) => eur.format(Math.round(n * 100) / 100)
export const num = (n: number) => n.toLocaleString('nl-NL', { maximumFractionDigits: 2 })
