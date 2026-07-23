import { useEffect, useState } from 'react'
import { NotchAction } from './NotchAction'
import { getQuoteForDay, refreshQuoteForDay } from '../utils/quotes'

export function DailyQuote({ dateKey }) {
  const [quote, setQuote] = useState(() => getQuoteForDay(dateKey))
  const [animKey, setAnimKey] = useState(0)
  const [spinning, setSpinning] = useState(false)

  useEffect(() => {
    setQuote(getQuoteForDay(dateKey))
    setAnimKey(0)
  }, [dateKey])

  const handleRefresh = () => {
    setSpinning(true)
    setQuote(refreshQuoteForDay(dateKey, quote.id))
    setAnimKey((n) => n + 1)
    window.setTimeout(() => setSpinning(false), 650)
  }

  return (
    <div className="notch-card quote-card">
      <NotchAction
        variant="refresh"
        label="Refresh quote"
        onClick={handleRefresh}
        spinning={spinning}
      />
      <div className="notch-shell quote-shell">
        <p className="quote-label">Quote of the day</p>
        <figure className="daily-quote" key={`${dateKey}-${animKey}`}>
          <blockquote>“{quote.text}”</blockquote>
          <figcaption>— {quote.author}</figcaption>
        </figure>
      </div>
    </div>
  )
}
