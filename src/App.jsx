import { lazy, Suspense, useState } from 'react'
import { AutoRules } from './components/AutoRules'
import { DailyQuote } from './components/DailyQuote'
import { Controls } from './components/Controls'
import { DayTimeline } from './components/DayTimeline'
import { History } from './components/History'
import { Modal } from './components/Modal'
import { OverviewPanel } from './components/OverviewPanel'
import { PrefsBar } from './components/PrefsBar'
import { Stats } from './components/Stats'
import { Timeline } from './components/Timeline'
import { useMediaQuery } from './hooks/useMediaQuery'
import { useSessionShortcuts } from './hooks/useSessionShortcuts'
import { useSoftReminder } from './hooks/useSoftReminder'
import { useWorkSession } from './hooks/useWorkSession'
import { formatClock, formatDuration, formatShiftLabel } from './utils/time'

const Companion = lazy(() =>
  import('./components/Companion').then((mod) => ({ default: mod.Companion })),
)

export default function App() {
  const {
    date,
    shift,
    theme,
    window,
    session,
    targetHours,
    workMs,
    breakMs,
    estimatedCheckout,
    onBreak,
    autoBreakActive,
    checkedIn,
    checkedOut,
    history,
    now,
    setTargetHours,
    setShift,
    toggleTheme,
    checkIn,
    breakIn,
    breakOut,
    checkOut,
    resetDay,
    deleteBreak,
    updateStamp,
    updateBreakRange,
  } = useWorkSession()

  const isPhone = useMediaQuery('(max-width: 720px)')
  const isWide = useMediaQuery('(min-width: 1100px)')
  const [shiftBlockedOpen, setShiftBlockedOpen] = useState(false)
  const [checkoutConfirmOpen, setCheckoutConfirmOpen] = useState(false)
  const [pendingShift, setPendingShift] = useState(null)
  const [checkoutFromShiftModal, setCheckoutFromShiftModal] = useState(false)
  const [mobilePanel, setMobilePanel] = useState('today')
  const [prefsOpen, setPrefsOpen] = useState(false)

  const status = !checkedIn
    ? 'Not checked in'
    : checkedOut
      ? 'Checked out'
      : autoBreakActive
        ? 'Auto break — 8h continuous work'
        : onBreak
          ? 'On break'
          : 'Working'

  const dayTargetHours = session.targetHours ?? targetHours
  const remainingMs = dayTargetHours * 60 * 60 * 1000 - workMs
  const activeShiftLabel = session.shift === 'night' ? 'night shift' : 'day shift'
  const pendingShiftLabel = pendingShift === 'night' ? 'night shift' : 'day shift'
  const checkingOutEarly = remainingMs > 0
  const estCheckout = checkedOut ? session.checkOut : estimatedCheckout

  function closeShiftBlocked() {
    setShiftBlockedOpen(false)
    setPendingShift(null)
  }

  function handleShiftChange(nextShift) {
    if (nextShift === shift) return
    if (checkedIn && !checkedOut) {
      setPendingShift(nextShift)
      setShiftBlockedOpen(true)
      return
    }
    setShift(nextShift)
  }

  function handleCheckoutRequest() {
    if (!checkedIn || checkedOut || onBreak) return
    setCheckoutFromShiftModal(false)
    setPendingShift(null)
    setCheckoutConfirmOpen(true)
  }

  function handleCheckoutFromShiftModal() {
    if (onBreak) return
    setShiftBlockedOpen(false)
    setCheckoutFromShiftModal(true)
    setCheckoutConfirmOpen(true)
  }

  function cancelCheckoutConfirm() {
    setCheckoutConfirmOpen(false)
    if (checkoutFromShiftModal && pendingShift) {
      setShiftBlockedOpen(true)
    } else {
      setPendingShift(null)
    }
    setCheckoutFromShiftModal(false)
  }

  function confirmCheckout() {
    const switchTo = checkoutFromShiftModal ? pendingShift : null
    setCheckoutConfirmOpen(false)
    setCheckoutFromShiftModal(false)
    setPendingShift(null)
    checkOut(switchTo ? { switchToShift: switchTo } : undefined)
  }

  useSessionShortcuts({
    checkedIn,
    checkedOut,
    onBreak,
    onCheckIn: checkIn,
    onBreakIn: breakIn,
    onBreakOut: breakOut,
    onCheckOut: handleCheckoutRequest,
    enabled: !shiftBlockedOpen && !checkoutConfirmOpen,
  })

  const { toast, dismissToast } = useSoftReminder({
    remainingMs,
    checkedIn,
    checkedOut,
    onBreak,
    dateKey: date,
  })

  const companionMood = !checkedIn
    ? 'idle'
    : checkedOut
      ? 'done'
      : onBreak
        ? 'break'
        : 'working'

  const todayPanel = (
    <Timeline
      session={session}
      onUpdateStamp={updateStamp}
      onUpdateBreakRange={updateBreakRange}
      onDeleteBreak={deleteBreak}
    />
  )

  const historyPanel = (
    <History
      history={history}
      today={{ date, session }}
      todayWorkMs={workMs}
      todayBreakMs={breakMs}
      todayTargetHours={dayTargetHours}
    />
  )

  return (
    <div
      className={`app${isPhone ? ' is-phone' : ''}${isWide ? ' is-wide' : ''}`}
    >
      <div className="top-chrome">
        <div className="top-chrome-row">
          <div className="header-title">
            <p className="brand">Work Timer</p>
            <h1>{formatShiftLabel(date, shift)}</h1>
            <p className="status">{status}</p>
          </div>

          {isPhone ? (
            <button
              type="button"
              className="prefs-disclosure"
              onClick={() => setPrefsOpen((v) => !v)}
              aria-expanded={prefsOpen}
            >
              {prefsOpen ? 'Hide settings' : 'Settings'}
            </button>
          ) : null}

          <div className="controls-shell">
            <Controls
              checkedIn={checkedIn}
              checkedOut={checkedOut}
              onBreak={onBreak}
              onCheckIn={checkIn}
              onBreakIn={breakIn}
              onBreakOut={breakOut}
              onCheckOut={handleCheckoutRequest}
              onReset={resetDay}
            />
          </div>

          <div
            className={`header-aside${isPhone && !prefsOpen ? ' is-collapsed' : ''}`}
          >
            <PrefsBar
              shift={shift}
              theme={theme}
              onShiftChange={handleShiftChange}
              onThemeToggle={toggleTheme}
            />
          </div>
        </div>
      </div>

      <div className="workspace">
        {isWide ? (
          <aside className="rail rail-today" aria-label="Today’s stamps">
            {todayPanel}
          </aside>
        ) : null}

        <main className="main-flow">
          <Stats
            workMs={workMs}
            breakMs={breakMs}
            remainingMs={remainingMs}
            estimatedCheckout={
              checkedOut ? session.checkOut : estimatedCheckout
            }
            checkedIn={checkedIn}
            checkedOut={checkedOut}
          />

          <DayTimeline
            session={session}
            now={now}
            workMs={workMs}
            breakMs={breakMs}
            checkedIn={checkedIn}
            windowStart={window.start}
            windowEnd={window.end}
            shift={shift}
          />

          <DailyQuote
            dateKey={date}
            companion={
              <Suspense
                fallback={<div className="companion companion-fallback" />}
              >
                <Companion mood={companionMood} theme={theme} />
              </Suspense>
            }
          />

          <OverviewPanel
            now={now}
            dateKey={date}
            workMs={workMs}
            breakMs={breakMs}
            remainingMs={remainingMs}
            targetHours={dayTargetHours}
            prefTargetHours={targetHours}
            onTargetHoursChange={setTargetHours}
            targetHoursDisabled={checkedOut}
            history={history}
            checkedIn={checkedIn}
          />

          {isPhone ? (
            <div
              className="mobile-panel-tabs"
              role="tablist"
              aria-label="Session details"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mobilePanel === 'today'}
                className={`mobile-tab${mobilePanel === 'today' ? ' active' : ''}`}
                onClick={() => setMobilePanel('today')}
              >
                Today
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mobilePanel === 'history'}
                className={`mobile-tab${mobilePanel === 'history' ? ' active' : ''}`}
                onClick={() => setMobilePanel('history')}
              >
                History
              </button>
            </div>
          ) : null}

          {!isWide ? (
            <div className={`panels${isPhone ? ` show-${mobilePanel}` : ''}`}>
              <div className="panel-slot panel-today">{todayPanel}</div>
              <div className="panel-slot panel-history">{historyPanel}</div>
            </div>
          ) : null}

          <AutoRules shift={shift} />
        </main>

        {isWide ? (
          <aside className="rail rail-history" aria-label="Last 30 days">
            {historyPanel}
          </aside>
        ) : null}
      </div>

      {toast ? (
        <div className="soft-toast" role="status">
          <p>{toast}</p>
          <button type="button" className="soft-toast-dismiss" onClick={dismissToast}>
            Dismiss
          </button>
        </div>
      ) : null}

      <Modal
        open={shiftBlockedOpen}
        title="Cannot change shift"
        cancelLabel="Got it"
        confirmLabel="Check out"
        danger
        confirmDisabled={onBreak}
        onCancel={closeShiftBlocked}
        onConfirm={handleCheckoutFromShiftModal}
      >
        <p>
          You are currently checked in on the {activeShiftLabel}. Check out
          first before switching to {pendingShiftLabel}, so today’s session
          stays on the correct timeline.
        </p>
        {onBreak ? (
          <p className="modal-follow">
            You are on break right now. Break out first, then you can check out
            and change shift.
          </p>
        ) : (
          <p className="modal-follow">
            You can check out here, then the app will switch to {pendingShiftLabel}.
          </p>
        )}
      </Modal>

      <Modal
        open={checkoutConfirmOpen}
        title={checkingOutEarly ? 'Checking out early' : 'Confirm check out'}
        confirmLabel={
          checkoutFromShiftModal && pendingShift
            ? 'Check out & switch'
            : 'Check out'
        }
        cancelLabel="Cancel"
        danger
        onConfirm={confirmCheckout}
        onCancel={cancelCheckoutConfirm}
      >
        {checkingOutEarly ? (
          <>
            <p>
              You still have{' '}
              <strong className="modal-emphasis">
                {formatDuration(remainingMs)}
              </strong>{' '}
              of target work time left
              {estCheckout ? (
                <>
                  {' '}
                  (estimated check out {formatClock(estCheckout)})
                </>
              ) : null}
              .
            </p>
            <p className="modal-follow">
              {checkoutFromShiftModal && pendingShift
                ? `End today’s session and switch to ${pendingShiftLabel}?`
                : 'End today’s session anyway? Work and break totals will stop updating.'}
            </p>
          </>
        ) : (
          <p>
            {checkoutFromShiftModal && pendingShift
              ? `End today’s session and switch to ${pendingShiftLabel}?`
              : 'End today’s session now? Work and break totals will stop updating, and you’ll need to start a new day to check in again.'}
          </p>
        )}
      </Modal>
    </div>
  )
}
