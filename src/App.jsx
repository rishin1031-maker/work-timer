import { useRef, useState } from 'react'
import { ActivityList } from './components/ActivityList'
import { AppHeader } from './components/AppHeader'
import { AtsImportModal } from './components/AtsImportModal'
import { CurrentStatusCard } from './components/CurrentStatusCard'
import { EditEntriesModal } from './components/EditEntriesModal'
import { HistorySection } from './components/HistorySection'
import { Modal } from './components/Modal'
import { OptionalWidgets } from './components/OptionalWidgets'
import { ProgressSummary } from './components/ProgressSummary'
import { TimerActions } from './components/TimerActions'
import { ToastNotification } from './components/ToastNotification'
import { useMediaQuery } from './hooks/useMediaQuery'
import { useSessionShortcuts } from './hooks/useSessionShortcuts'
import { useSoftReminder } from './hooks/useSoftReminder'
import { useToast } from './hooks/useToast'
import { useWorkSession } from './hooks/useWorkSession'
import { formatClock, formatDuration, formatShiftLabel } from './utils/time'

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
    openBreakMs,
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
    restoreSession,
    replaceTodaySession,
    importAtsDay,
  } = useWorkSession()

  const isPhone = useMediaQuery('(max-width: 720px)')
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const { toast, showToast, dismissToast } = useToast()

  const [shiftBlockedOpen, setShiftBlockedOpen] = useState(false)
  const [checkoutConfirmOpen, setCheckoutConfirmOpen] = useState(false)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [atsImportOpen, setAtsImportOpen] = useState(false)
  const [pendingShift, setPendingShift] = useState(null)
  const [checkoutFromShiftModal, setCheckoutFromShiftModal] = useState(false)
  const sessionSnapshotRef = useRef(null)
  const editButtonRef = useRef(null)

  const dayTargetHours = session.targetHours ?? targetHours
  const remainingMs = dayTargetHours * 60 * 60 * 1000 - workMs
  const activeShiftLabel = session.shift === 'night' ? 'night shift' : 'day shift'
  const pendingShiftLabel = pendingShift === 'night' ? 'night shift' : 'day shift'
  const checkingOutEarly = remainingMs > 0
  const estCheckout = checkedOut ? session.checkOut : estimatedCheckout

  const companionMood = !checkedIn
    ? 'idle'
    : checkedOut
      ? 'done'
      : onBreak
        ? 'break'
        : 'working'

  function snapshotSession() {
    sessionSnapshotRef.current = session?.checkIn
      ? {
          ...session,
          breaks: (session.breaks ?? []).map((b) => ({ ...b })),
        }
      : null
  }

  function handleStartWork() {
    if (checkedIn) return
    checkIn()
    showToast('Work started')
  }

  function handleStartBreak() {
    if (!checkedIn || checkedOut || onBreak) return
    breakIn()
    showToast('Break started')
  }

  function handleResumeWork() {
    if (!onBreak) return
    breakOut()
    showToast('Back to work')
  }

  function openEditEntries() {
    if (!session?.checkIn) return
    setEditOpen(true)
  }

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
    if (!checkedIn || checkedOut) return
    setCheckoutFromShiftModal(false)
    setPendingShift(null)
    setCheckoutConfirmOpen(true)
  }

  function handleCheckoutFromShiftModal() {
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
    showToast(
      switchTo
        ? `Workday ended · switched to ${pendingShiftLabel}`
        : 'Workday ended',
    )
  }

  function confirmReset() {
    snapshotSession()
    const snapshot = sessionSnapshotRef.current
    resetDay()
    setResetConfirmOpen(false)
    showToast('Today’s entries were reset', {
      undo: snapshot
        ? () => {
            restoreSession(snapshot)
            showToast('Reset undone')
          }
        : undefined,
      duration: 7000,
    })
  }

  function handleAtsImport({ session: nextSession, targetHours: nextTarget }) {
    snapshotSession()
    const snapshot = sessionSnapshotRef.current
    const hadSession = Boolean(snapshot?.checkIn)
    const ok = importAtsDay({ session: nextSession, targetHours: nextTarget })
    if (!ok) return false
    showToast('ATS data imported into today', {
      undo: () => {
        if (hadSession) restoreSession(snapshot)
        else resetDay()
        showToast('ATS import undone')
      },
      duration: 8000,
    })
    return true
  }

  useSessionShortcuts({
    checkedIn,
    checkedOut,
    onBreak,
    onCheckIn: handleStartWork,
    onBreakIn: handleStartBreak,
    onBreakOut: handleResumeWork,
    onCheckOut: handleCheckoutRequest,
    enabled: !shiftBlockedOpen && !checkoutConfirmOpen && !resetConfirmOpen && !editOpen && !atsImportOpen,
  })

  const { toast: reminderToast, dismissToast: dismissReminder } = useSoftReminder({
    remainingMs,
    checkedIn,
    checkedOut,
    onBreak,
    dateKey: date,
  })

  const activeToast = toast ?? (reminderToast
    ? { message: reminderToast, undo: null }
    : null)

  function handleDismissToast() {
    if (toast) dismissToast()
    else dismissReminder()
  }

  return (
    <div
      className={`app${isPhone ? ' is-phone' : ''}${isDesktop ? ' is-desktop' : ''}`}
    >
      <AppHeader
        dateLabel={formatShiftLabel(date, shift)}
        now={now}
        shift={shift}
        theme={theme}
        onShiftChange={handleShiftChange}
        onThemeToggle={toggleTheme}
        onResetRequest={() => setResetConfirmOpen(true)}
        onAtsImportRequest={() => setAtsImportOpen(true)}
        canReset={checkedIn}
      />

      <main className="app-main">
        <CurrentStatusCard
          checkedIn={checkedIn}
          checkedOut={checkedOut}
          onBreak={onBreak}
          autoBreakActive={autoBreakActive}
          workMs={workMs}
          breakMs={breakMs}
          openBreakMs={openBreakMs}
          remainingMs={remainingMs}
          estimatedCheckout={estimatedCheckout}
          checkInIso={session.checkIn}
          checkOutIso={session.checkOut}
          targetHours={dayTargetHours}
          theme={theme}
          companionMood={companionMood}
          onStartWork={handleStartWork}
          onStartBreak={handleStartBreak}
          onResumeWork={handleResumeWork}
          onEndWorkday={handleCheckoutRequest}
          showInlineActions={!isPhone}
        />

        <div className="app-top-pair">
          <ProgressSummary
            workMs={workMs}
            breakMs={breakMs}
            remainingMs={remainingMs}
            targetHours={dayTargetHours}
            prefTargetHours={targetHours}
            onTargetHoursChange={setTargetHours}
            targetHoursDisabled={checkedOut}
            checkedIn={checkedIn}
            session={session}
            now={now}
            windowStart={window.start}
            windowEnd={window.end}
            shift={shift}
          />

          <ActivityList
            session={session}
            now={now}
            onEdit={openEditEntries}
            editButtonRef={editButtonRef}
          />
        </div>

        <div className="app-columns">
          <div className="app-col app-col-main">
            <HistorySection
              history={history}
              today={{ date, session }}
              todayWorkMs={workMs}
              todayBreakMs={breakMs}
              todayTargetHours={dayTargetHours}
            />
          </div>

          <div className="app-col app-col-side">
            <OptionalWidgets dateKey={date} shift={shift} />
          </div>
        </div>
      </main>

      {isPhone ? (
        <TimerActions
          checkedIn={checkedIn}
          checkedOut={checkedOut}
          onBreak={onBreak}
          onStartWork={handleStartWork}
          onStartBreak={handleStartBreak}
          onResumeWork={handleResumeWork}
          onEndWorkday={handleCheckoutRequest}
          sticky
        />
      ) : null}

      <ToastNotification toast={activeToast} onDismiss={handleDismissToast} />

      <EditEntriesModal
        open={editOpen}
        session={session}
        dateKey={date}
        shift={shift}
        returnFocusRef={editButtonRef}
        onClose={() => setEditOpen(false)}
        onSaveSession={replaceTodaySession}
        onSaved={(message) => showToast(message)}
      />

      <AtsImportModal
        open={atsImportOpen}
        shift={shift}
        hasExistingSession={checkedIn}
        onClose={() => setAtsImportOpen(false)}
        onImport={handleAtsImport}
      />

      <Modal
        open={resetConfirmOpen}
        title="Reset today?"
        cancelLabel="Cancel"
        confirmLabel="Reset"
        danger
        onCancel={() => setResetConfirmOpen(false)}
        onConfirm={confirmReset}
      >
        <p>
          This removes today’s check-in, breaks, and check-out entries for the
          current shift day. You can undo this from the confirmation toast.
        </p>
      </Modal>

      <Modal
        open={shiftBlockedOpen}
        title="Cannot change shift"
        cancelLabel="Got it"
        confirmLabel="End workday"
        danger
        onCancel={closeShiftBlocked}
        onConfirm={handleCheckoutFromShiftModal}
      >
        <p>
          You are currently checked in on the {activeShiftLabel}. End the
          workday first before switching to {pendingShiftLabel}, so today’s
          session stays on the correct timeline.
        </p>
        {onBreak ? (
          <p className="modal-follow">
            You are on break right now. Ending the workday will close the break
            and then switch to {pendingShiftLabel}.
          </p>
        ) : (
          <p className="modal-follow">
            You can end the workday here, then the app will switch to{' '}
            {pendingShiftLabel}.
          </p>
        )}
      </Modal>

      <Modal
        open={checkoutConfirmOpen}
        title={checkingOutEarly ? 'Ending early' : 'End workday?'}
        confirmLabel={
          checkoutFromShiftModal && pendingShift
            ? 'End & switch'
            : 'End workday'
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
                <> (estimated finish {formatClock(estCheckout)})</>
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
              : 'End today’s session now? Work and break totals will stop updating.'}
          </p>
        )}
      </Modal>
    </div>
  )
}
