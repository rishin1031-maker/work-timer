import { useEffect, useState } from 'react'
import { getQuoteForDay, refreshQuoteForDay } from '../utils/quotes'

export function DailyQuote({ dateKey, companion }) {
  const [quote, setQuote] = useState(() => getQuoteForDay(dateKey))
  const [animKey, setAnimKey] = useState(0)

  useEffect(() => {
    setQuote(getQuoteForDay(dateKey))
    setAnimKey(0)
  }, [dateKey])

  const handleRefresh = () => {
    setQuote(refreshQuoteForDay(dateKey, quote.id))
    setAnimKey((n) => n + 1)
  }

  return (
    <section className="quote-row">
      {companion}
      <figure className="daily-quote" key={`${dateKey}-${animKey}`}>
        <div className="quote-heading">
          <p className="quote-label">Quote of the day</p>
          <button
            type="button"
            className="quote-refresh"
            onClick={handleRefresh}
            aria-label="Refresh quote"
            title="New quote"
          >
            Refresh
          </button>
        </div>
        <blockquote>“{quote.text}”</blockquote>
        <figcaption>— {quote.author}</figcaption>
      </figure>
    </section>
  )
}
