import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Clock3, LogIn, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useShift } from '../../contexts/ShiftContext';
import { stations } from '../../utils/stations';
import '../../styles/workspace.css';

const time = (value?: string | null) => value ? new Date(value).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '—';

export default function ClockInOut({ entrance = false }: { entrance?: boolean }) {
  const { user, logout } = useAuth();
  const { record, loading, busy, error: statusError, onDuty, refresh, punch } = useShift();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [error, setError] = useState('');
  const [confirmOut, setConfirmOut] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!user) return null;
  const station = stations[user.role];
  const completed = Boolean(record?.clockIn && record.clockOut);
  const elapsedMinutes = record?.clockIn ? Math.max(0, Math.floor((now.getTime() - new Date(record.clockIn).getTime()) / 60000)) : 0;
  const submit = async (action: 'in' | 'out') => {
    setError('');
    try {
      await punch(action);
      setConfirmOut(false);
      if (action === 'in' && entrance) navigate(station.path, { replace: true });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Your attendance could not be saved. Please try again.');
      void refresh();
    }
  };
  return (
    <div className={`shift-page ${entrance ? 'shift-entrance' : ''}`}>
      {entrance && <header className="shift-brand"><img src="/logo.jpg" alt="JAPZ" /><div><strong>JAPZ POS</strong><span>Employee check-in</span></div><button className="workspace-quiet" disabled={busy} onClick={() => void logout()}><LogOut size={16} /> Sign out</button></header>}
      <div className="shift-wrap" role="region" aria-label="Employee attendance">
        <div className="shift-intro"><p className="workspace-eyebrow">{station.label}</p><h1>{completed ? 'Your shift is complete' : onDuty ? 'You’re on the clock' : `Ready for your shift, ${user.name.split(' ')[0]}?`}</h1><p>{completed ? 'Your attendance has been saved. Contact your manager if a correction is needed.' : onDuty ? 'Your attendance is recorded. You can continue to your station.' : 'Clock in to record your attendance and open your station.'}</p></div>
        {entrance && <ol className="shift-steps" aria-label="Start your shift"><li className="done"><Check size={14} /> Sign in</li><li className={onDuty || completed ? 'done' : 'current'}><span>2</span> Clock in</li><li><span>3</span> Open station</li></ol>}
        <section className="shift-card">
          <div className="shift-card-top"><span className={`shift-badge ${onDuty ? 'on-duty' : completed ? 'completed' : ''}`}><span />{loading ? 'Checking attendance' : statusError ? 'Status unavailable' : onDuty ? 'On duty' : completed ? record?.autoClockedOutAt ? 'Auto clocked out' : 'Shift completed' : 'Not clocked in'}</span><Clock3 size={22} /></div>
          <p className="shift-date">{now.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
          <div className="shift-clock" aria-label="Current time">{now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
          <p className="shift-clock-note">Local time · Attendance is recorded by the server</p>
          <div className="shift-details"><div><span>Employee</span><strong>{user.name}</strong></div><div><span>Clocked in</span><strong>{time(record?.clockIn)}</strong></div><div><span>{completed ? 'Clocked out' : 'Time on shift'}</span><strong>{completed ? time(record?.clockOut) : onDuty ? `${Math.floor(elapsedMinutes / 60)}h ${elapsedMinutes % 60}m` : '—'}</strong></div></div>
          {completed && <p className="shift-summary"><ShieldCheck size={18} /> Recorded work hours: <strong>{Number(record?.totalHours || 0).toFixed(2)} hrs</strong></p>}
          {(error || statusError) && <div className="shift-error" role="alert"><p>{error || statusError}</p><button disabled={busy} onClick={() => { setError(''); void refresh(); }}><RefreshCw size={15} /> Retry attendance check</button></div>}
          {!completed && !onDuty && <button className="shift-primary" disabled={busy || loading || Boolean(statusError)} onClick={() => void submit('in')}><LogIn size={20} />{busy ? 'Recording clock-in…' : entrance ? 'Clock in & open station' : 'Clock in'}<ArrowRight size={18} /></button>}
          {onDuty && <><Link className="shift-primary" to={station.path}>Continue to {station.label.toLowerCase()}<ArrowRight size={20} /></Link>{!confirmOut ? <button className="shift-out" disabled={busy || loading || Boolean(statusError)} onClick={() => setConfirmOut(true)}><LogOut size={17} /> End shift & clock out</button> : <div className="shift-confirm" role="group" aria-label="Confirm clock-out"><strong>Finish your shift?</strong><p>Clocking out closes your station access. You can clock in once per day.</p><div><button disabled={busy} onClick={() => setConfirmOut(false)}>Keep working</button><button className="shift-out" disabled={busy || Boolean(statusError)} onClick={() => void submit('out')}>{busy ? 'Recording clock-out…' : 'Confirm clock out'}</button></div></div>}</>}
          {completed && <button className="shift-primary" disabled={busy} onClick={() => void logout()}><LogOut size={18} /> Sign out</button>}
          <p className="shift-footnote"><ShieldCheck size={16} /> {completed ? 'Need another shift today? Ask your manager to review your attendance.' : 'Your clock-in and clock-out are saved to your payroll attendance.'}</p>
        </section>
      </div>
    </div>
  );
}
