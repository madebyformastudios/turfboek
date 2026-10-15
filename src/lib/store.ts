import { useSyncExternalStore } from 'react'
import { supabase } from './supabase'
import { activity } from './rates'

export interface Entry {
  id: string
  work_date: string
  activity_code: number
  quantity: number
  unit_price: number
  reason: string | null
  address: string | null
  note: string | null
  created_at: string
}

type Op = { kind: 'upsert'; entry: Entry } | { kind: 'delete'; id: string }

interface State {
  entries: Entry[]
  outbox: Op[]
  syncing: boolean
  online: boolean
  lastSync: string | null
  error: string | null
}

const KEY = 'turfen:v1'
const load = (): Pick<State, 'entries' | 'outbox' | 'lastSync'> => {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { entries: [], outbox: [], lastSync: null }
}

let state: State = { ...load(), syncing: false, online: navigator.onLine, error: null }
const listeners = new Set<() => void>()

function set(patch: Partial<State>) {
  state = { ...state, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify({ entries: state.entries, outbox: state.outbox, lastSync: state.lastSync }))
  } catch {}
  listeners.forEach((l) => l())
}

export const useStore = () =>
  useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => state,
  )

export const amountOf = (e: Entry) => e.quantity * e.unit_price

const uuid = () =>
  crypto.randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })

// In lokale modus is er geen server, dus ook geen wachtrij.
const queue = (outbox: Op[], op: Op) => (supabase ? [...outbox, op] : [])

export function addEntry(input: { work_date: string; activity_code: number; quantity?: number; unit_price?: number; reason?: string | null; address?: string | null }) {
  const a = activity(input.activity_code)
  const entry: Entry = {
    id: uuid(),
    work_date: input.work_date,
    activity_code: a.code,
    quantity: input.quantity ?? 1,
    unit_price: input.unit_price ?? a.price,
    reason: input.reason ?? null,
    address: input.address ?? null,
    note: null,
    created_at: new Date().toISOString(),
  }
  set({ entries: [...state.entries, entry], outbox: queue(state.outbox, { kind: 'upsert', entry }) })
  void sync()
  return entry
}

export function updateEntry(id: string, patch: Partial<Omit<Entry, 'id'>>) {
  const entries = state.entries.map((e) => (e.id === id ? { ...e, ...patch } : e))
  const entry = entries.find((e) => e.id === id)
  if (!entry) return
  set({ entries, outbox: queue(state.outbox.filter((o) => !(o.kind === 'upsert' && o.entry.id === id)), { kind: 'upsert', entry }) })
  void sync()
}

export function removeEntry(id: string) {
  const outbox = state.outbox.filter((o) => !(o.kind === 'upsert' && o.entry.id === id))
  set({ entries: state.entries.filter((e) => e.id !== id), outbox: queue(outbox, { kind: 'delete', id }) })
  void sync()
}

/** Zet verwijderde regels terug (ongedaan maken), met hun oorspronkelijke id. */
export function restoreEntries(list: Entry[]) {
  const ids = new Set(list.map((e) => e.id))
  const outbox = list.reduce((o, entry) => queue(o, { kind: 'upsert', entry }), state.outbox)
  set({ entries: [...state.entries.filter((e) => !ids.has(e.id)), ...list], outbox })
  void sync()
}

/** Stuurt de wachtrij naar Supabase en haalt daarna de server-stand op. */
export async function sync() {
  if (!supabase || state.syncing || !navigator.onLine) return
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) return
  set({ syncing: true, error: null })
  try {
    while (state.outbox.length) {
      const op = state.outbox[0]
      const { error } =
        op.kind === 'upsert'
          ? await supabase.from('turf_entries').upsert({
              id: op.entry.id,
              work_date: op.entry.work_date,
              activity_code: op.entry.activity_code,
              quantity: op.entry.quantity,
              unit_price: op.entry.unit_price,
              reason: op.entry.reason,
              address: op.entry.address,
              note: op.entry.note,
              created_at: op.entry.created_at,
            })
          : await supabase.from('turf_entries').delete().eq('id', op.id)
      if (error) throw error
      set({ outbox: state.outbox.slice(1) })
    }
    const since = new Date()
    since.setDate(since.getDate() - 120)
    const { data, error } = await supabase
      .from('turf_entries')
      .select('id, work_date, activity_code, quantity, unit_price, reason, address, note, created_at')
      .gte('work_date', since.toISOString().slice(0, 10))
      .order('created_at')
    if (error) throw error
    const pending = new Set(state.outbox.map((o) => (o.kind === 'upsert' ? o.entry.id : o.id)))
    const server = (data ?? []).map((r) => ({ ...r, quantity: Number(r.quantity), unit_price: Number(r.unit_price) })) as Entry[]
    const older = state.entries.filter((e) => e.work_date < since.toISOString().slice(0, 10))
    const local = state.entries.filter((e) => pending.has(e.id))
    set({ entries: [...older, ...server.filter((e) => !pending.has(e.id)), ...local], lastSync: new Date().toISOString() })
  } catch (e) {
    set({ error: e instanceof Error ? e.message : String(e) })
  } finally {
    set({ syncing: false })
  }
}

export function clearLocal() {
  set({ entries: [], outbox: [], lastSync: null })
}

window.addEventListener('online', () => {
  set({ online: true })
  void sync()
})
window.addEventListener('offline', () => set({ online: false }))
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void sync()
})
