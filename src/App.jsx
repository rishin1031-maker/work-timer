import { Controls } from './components/Controls'
import { History } from './components/History'
import { Stats } from './components/Stats'
import { TargetHours } from './components/TargetHours'
import { Timeline } from './components/Timeline'
import { useWorkSession } from './hooks/useWorkSession'
import { formatDateLabel } from './utils/time'

export default function App() {
  const {
    date,
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
    setTargetHours,
    checkIn,
    breakIn,
    breakOut,
    checkOut,
    resetDay,
    deleteBreak,
    updateStamp,
  } = useWorkSession()

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

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="brand">Work Timer</p>
          <h1>{formatDateLabel(date)}</h1>
          <p className="status">{status}</p>
        </div>
        <TargetHours
          value={targetHours}
          onChange={setTargetHours}
          disabled={checkedOut}
        />
      </header>

      <Stats
        workMs={workMs}
        breakMs={breakMs}
        remainingMs={remainingMs}
        estimatedCheckout={checkedOut ? session.checkOut : estimatedCheckout}
        checkedIn={checkedIn}
        checkedOut={checkedOut}
      />

      <Controls
        checkedIn={checkedIn}
        checkedOut={checkedOut}
        onBreak={onBreak}
        onCheckIn={checkIn}
        onBreakIn={breakIn}
        onBreakOut={breakOut}
        onCheckOut={checkOut}
        onReset={resetDay}
      />

      <div className="panels">
        <Timeline
          session={session}
          onUpdateStamp={updateStamp}
          onDeleteBreak={deleteBreak}
        />
        <History history={history} />
      </div>
    </div>
  )
}
