import { activity, money, num } from './rates'
import { Period, fmtDay } from './period'
import { Entry, amountOf } from './store'

// Combi blijft hier twee regels (code 10 + 20), net als op de LM Flex-factuur.
const sorted = (entries: Entry[]) => [...entries].sort((a, b) => a.work_date.localeCompare(b.work_date) || a.created_at.localeCompare(b.created_at))
const time = (e: Entry) => new Date(e.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
const dec = (n: number, digits = 2) => n.toFixed(digits).replace('.', ',')
// Prijs met 3 decimalen waar nodig (10,098 voor combi-gas), zoals op de factuur.
const price = (n: number) => `€ ${n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}`
const fileName = (p: Period, ext: string) => `factuurweek-${p.year}-${String(p.week).padStart(2, '0')}.${ext}`

/** Totalen per code, in de volgorde van de factuur. */
export function specLines(entries: Entry[]) {
  const map = new Map<number, { qty: number; sum: number }>()
  for (const e of entries) {
    const l = map.get(e.activity_code) ?? { qty: 0, sum: 0 }
    l.qty += e.quantity
    l.sum += amountOf(e)
    map.set(e.activity_code, l)
  }
  return [...map].sort(([a], [b]) => a - b).map(([code, l]) => ({ a: activity(code), ...l }))
}

/** CSV voor Excel (NL): puntkomma's, komma als decimaalteken, BOM voor de euro en accenten. */
export function weekCsv(entries: Entry[]) {
  const cell = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const rows = [
    ['Datum', 'Tijd', 'Code', 'Omschrijving', 'Adres / werkorder', 'Reden', 'Aantal', 'Prijs', 'Bedrag'],
    ...sorted(entries).map((e) => [
      e.work_date,
      time(e),
      String(e.activity_code),
      activity(e.activity_code).name,
      e.address ?? '',
      e.reason ?? '',
      dec(e.quantity).replace(/,00$/, ''),
      dec(e.unit_price, 3),
      dec(amountOf(e)),
    ]),
    ['', '', '', 'Totaal', '', '', '', '', dec(entries.reduce((s, e) => s + amountOf(e), 0))],
  ]
  return new Blob(['﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
}

export async function weekPdf(p: Period, entries: Entry[], who: string) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const L = 16
  const R = 194
  let y = 22

  const fit = (raw: string, w: number) => {
    const s = raw.replace(/\u00a0/g, ' ') // smalle spatie na € valt weg in Helvetica
    return doc.getTextWidth(s) <= w ? s : doc.splitTextToSize(s, w - doc.getTextWidth('…'))[0] + '…'
  }
  const row = (cols: { t: string; x: number; w: number; right?: boolean }[], bold = false) => {
    if (y > 278) {
      doc.addPage()
      y = 20
    }
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    for (const c of cols) doc.text(fit(c.t, c.w), c.right ? c.x + c.w : c.x, y, { align: c.right ? 'right' : 'left' })
    y += 6
  }
  const rule = () => {
    doc.setDrawColor(200)
    doc.line(L, y - 4, R, y - 4)
    y += 1
  }
  const heading = (t: string) => {
    y += 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(t, L, y)
    doc.setFontSize(9.5)
    y += 8
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(`Factuurweek ${p.week} · ${p.year}`, L, y)
  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(110)
  doc.text(`${fmtDay(p.start)} t/m ${fmtDay(p.end)}${who ? ` · ${who}` : ''}`, L, y)
  doc.setTextColor(0)
  y += 6

  const total = entries.reduce((s, e) => s + amountOf(e), 0)

  heading('Specificatie')
  const spec = { code: L, name: L + 14, qty: 120, price: 140, sum: 164 }
  row(
    [
      { t: 'Code', x: spec.code, w: 12 },
      { t: 'Omschrijving', x: spec.name, w: 88 },
      { t: 'Aantal', x: spec.qty, w: 16, right: true },
      { t: 'Prijs', x: spec.price, w: 20, right: true },
      { t: 'Bedrag', x: spec.sum, w: 30, right: true },
    ],
    true,
  )
  rule()
  for (const l of specLines(entries))
    row([
      { t: String(l.a.code), x: spec.code, w: 12 },
      { t: l.a.name, x: spec.name, w: 88 },
      { t: `${num(l.qty)}${l.a.unit === 'uur' ? ' u' : ''}`, x: spec.qty, w: 16, right: true },
      { t: l.a.unit === 'bedrag' ? '' : price(l.a.price), x: spec.price, w: 20, right: true },
      { t: money(l.sum), x: spec.sum, w: 30, right: true },
    ])
  rule()
  row([{ t: 'Totaal (excl. btw)', x: spec.name, w: 88 }, { t: money(total), x: spec.sum, w: 30, right: true }], true)

  heading('Alle regels')
  const det = { date: L, time: L + 24, code: L + 37, name: L + 50, addr: 124, sum: 164 }
  row(
    [
      { t: 'Datum', x: det.date, w: 22 },
      { t: 'Tijd', x: det.time, w: 12 },
      { t: 'Code', x: det.code, w: 12 },
      { t: 'Omschrijving', x: det.name, w: 56 },
      { t: 'Adres / werkorder', x: det.addr, w: 38 },
      { t: 'Bedrag', x: det.sum, w: 30, right: true },
    ],
    true,
  )
  rule()
  for (const e of sorted(entries)) {
    const a = activity(e.activity_code)
    row([
      { t: fmtDay(e.work_date), x: det.date, w: 22 },
      { t: time(e), x: det.time, w: 12 },
      { t: String(e.activity_code), x: det.code, w: 12 },
      { t: [a.unit === 'uur' ? `${num(e.quantity)} u` : '', a.short, e.reason].filter(Boolean).join(' · '), x: det.name, w: 56 },
      { t: e.address ?? '', x: det.addr, w: 38 },
      { t: money(amountOf(e)), x: det.sum, w: 30, right: true },
    ])
  }

  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(140)
    doc.text(`Gemaakt met Turfen op ${new Date().toLocaleDateString('nl-NL')}`, L, 290)
    doc.text(`${i} / ${pages}`, R, 290, { align: 'right' })
  }
  return doc.output('blob')
}

/** Op de iPhone via het deelmenu (mail, Bestanden, WhatsApp); anders gewoon downloaden. */
export async function shareFile(blob: Blob, p: Period, ext: 'pdf' | 'csv') {
  const file = new File([blob], fileName(p, ext), { type: blob.type })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `Factuurweek ${p.week}` })
    } catch {} // gebruiker sloot het deelmenu
    return
  }
  const url = URL.createObjectURL(file)
  const a = Object.assign(document.createElement('a'), { href: url, download: file.name })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
