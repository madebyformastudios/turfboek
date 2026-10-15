import { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'

// iOS legt het toetsenbord over de pagina heen zonder de layout te verkleinen.
// Daarom volgen we het zichtbare deel (visualViewport), zodat de sheet erboven blijft.
function useVisibleViewport() {
  const [vp, setVp] = useState<{ top: number; height: number; keyboard: boolean } | null>(null)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setVp({ top: vv.offsetTop, height: vv.height, keyboard: window.innerHeight - vv.height > 120 })
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])
  return vp
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const vp = useVisibleViewport()
  const sheet = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Na het openen van het toetsenbord het actieve veld in beeld houden.
  useEffect(() => {
    const el = document.activeElement
    if (vp?.keyboard && el instanceof HTMLElement && sheet.current?.contains(el)) el.scrollIntoView({ block: 'nearest' })
  }, [vp?.keyboard, vp?.height])

  const style: CSSProperties | undefined = vp ? { top: vp.top, height: vp.height, bottom: 'auto' } : undefined

  return (
    <div className="sheet-backdrop" style={style} onClick={onClose}>
      <div ref={sheet} className={`sheet ${vp?.keyboard ? 'has-keyboard' : ''}`} role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="round-btn" onClick={onClose} aria-label="Sluiten">
            <Icon name="close" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
