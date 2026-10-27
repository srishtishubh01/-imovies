import { useEffect, useState } from 'react';
import { Routes, Route, Link, NavLink, useNavigate, useParams, Navigate } from 'react-router-dom';
import { api } from './api.js';

const fDate = (d) => new Date(d).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
const fTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function Poster({ m, className = '' }) {
  const [bad, setBad] = useState(false);
  if (!m.poster || bad) return <div className={'poster fallback ' + className}>{m.title}</div>;
  return <img className={'poster ' + className} src={m.poster} alt={m.title} onError={() => setBad(true)} />;
}

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const nav = useNavigate();
  const login = ({ token, user }) => { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)); setUser(user); };
  const logout = () => { localStorage.clear(); setUser(null); nav('/'); };
  return (
    <>
      <header className="nav">
        <Link to="/" className="brand">I<b>Movies</b></Link>
        <div className="nav-r">
          <NavLink to="/" end className="link">Movies</NavLink>
          {user ? (<>
            <NavLink to="/bookings" className="link">My tickets</NavLink>
            <div className="avatar" title={user.name}>{user.name[0].toUpperCase()}</div>
            <button className="btn ghost" onClick={logout}>Log out</button>
          </>) : <Link to="/login" className="btn gold">Sign in</Link>}
        </div>
      </header>
      <main className="wrap">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movie/:id" element={<Movie />} />
          <Route path="/showtime/:id" element={user ? <Seats /> : <Navigate to="/login" />} />
          <Route path="/bookings" element={user ? <Bookings /> : <Navigate to="/login" />} />
          <Route path="/login" element={<Auth onAuth={login} />} />
        </Routes>
      </main>
    </>
  );
}

function Home() {
  const [movies, setMovies] = useState(null);
  const [q, setQ] = useState('');
  const [g, setG] = useState('All');
  const [err, setErr] = useState('');
  useEffect(() => { api('/movies').then(setMovies).catch((e) => setErr(e.message)); }, []);
  if (err) return <div className="notice error">{err}</div>;
  if (!movies) return <div className="grid">{[...Array(8)].map((_, i) => <div key={i} className="skeleton" />)}</div>;
  if (!movies.length) return <p>No movies yet. Run <code>npm run seed</code> in the server folder.</p>;
  const genres = ['All', ...new Set(movies.map((m) => m.genre))];
  const list = movies.filter((m) => (g === 'All' || m.genre === g) && m.title.toLowerCase().includes(q.toLowerCase()));
  const hero = [...movies].sort((a, b) => b.rating - a.rating)[0];
  return (<>
    <section className="hero">
      {hero.poster && <img className="bg" src={hero.poster} alt="" />}
      <div>
        <span className="tag">★ {hero.rating} · Top rated</span>
        <h1>{hero.title}</h1>
        <p>{hero.description}</p>
        <Link to={`/movie/${hero._id}`} className="btn gold" style={{ display: 'inline-block', marginTop: 18 }}>Book tickets</Link>
      </div>
    </section>
    <div className="bar">
      <input className="search" placeholder="Search movies…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips">{genres.map((x) => <button key={x} className={'chip' + (g === x ? ' on' : '')} onClick={() => setG(x)}>{x}</button>)}</div>
    </div>
    <div className="grid">
      {list.map((m) => (
        <Link to={`/movie/${m._id}`} key={m._id} className="mcard">
          <span className="badge">★ {m.rating}</span>
          <Poster m={m} />
          <div className="info"><h6>{m.title}</h6><small>{m.genre} · {m.language}</small></div>
        </Link>
      ))}
    </div>
    {!list.length && <p style={{ color: 'var(--muted)' }}>No movies match your search.</p>}
  </>);
}

function Movie() {
  const { id } = useParams();
  const [m, setM] = useState(null);
  const [times, setTimes] = useState([]);
  useEffect(() => { api('/movies/' + id).then(setM); api(`/movies/${id}/showtimes`).then(setTimes); }, [id]);
  if (!m) return null;
  const days = times.reduce((a, t) => { (a[fDate(t.time)] ||= []).push(t); return a; }, {});
  return (
    <div className="detail">
      <Poster m={m} />
      <div>
        <h1 style={{ fontSize: '2.6rem' }}>{m.title}</h1>
        <div className="meta">
          <span className="tag">★ {m.rating}</span><span className="tag">{m.genre}</span>
          <span className="tag">{m.duration} min</span><span className="tag">{m.language}</span>
        </div>
        <p style={{ color: '#cfcabf', lineHeight: 1.7 }}>{m.description}</p>
        <h4 style={{ marginTop: 34 }}>Select a showtime</h4>
        {!times.length && <p style={{ color: 'var(--muted)' }}>No upcoming shows.</p>}
        {Object.entries(days).map(([day, ts]) => (
          <div className="day" key={day}>
            <h6>{day}</h6>
            <div className="slots">
              {ts.map((t) => <Link key={t._id} to={`/showtime/${t._id}`} className="slot"><b>{fTime(t.time)}</b><small>{t.screen} · ₹{t.price}</small></Link>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const ROWS = 'ABCDEFGH'.split('');
const COLS = Array.from({ length: 10 }, (_, i) => i + 1);

function Seats() {
  const { id } = useParams();
  const nav = useNavigate();
  const [st, setSt] = useState(null);
  const [sel, setSel] = useState([]);
  const [msg, setMsg] = useState('');
  const load = () => api('/showtimes/' + id).then(setSt).catch((e) => setMsg(e.message));
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [id]);
  if (!st) return <p>{msg || 'Loading…'}</p>;
  const toggle = (s) => setSel((p) => (p.includes(s) ? p.filter((x) => x !== s) : p.length < 8 ? [...p, s] : p));
  const book = async () => {
    try { await api('/bookings', { method: 'POST', body: { showtimeId: id, seats: sel } }); nav('/bookings'); }
    catch (e) { setMsg(e.message); setSel((p) => p.filter((s) => !st.bookedSeats.includes(s))); load(); }
  };
  return (
    <div className="seat-layout">
      <div className="panel">
        {msg && <div className="notice error">{msg}</div>}
        <div className="screen" />
        {ROWS.map((r) => (
          <div className="srow" key={r}>
            <span className="rl">{r}</span>
            {COLS.map((c) => { const s = r + c; return (
              <button key={s} disabled={st.bookedSeats.includes(s)} className={'seat' + (sel.includes(s) ? ' sel' : '') + (c === 5 ? ' aisle' : '')} onClick={() => toggle(s)}>{c}</button>
            ); })}
          </div>
        ))}
        <div className="legend"><span><i />Available</span><span><i className="s" />Selected</span><span><i className="b" />Booked</span></div>
      </div>
      <div className="panel summary">
        <h4>{st.movie.title}</h4>
        <p style={{ color: 'var(--muted)', margin: '6px 0 0' }}>{fDate(st.time)} · {fTime(st.time)} · {st.screen}</p>
        <hr />
        <div className="line"><span>Seats</span><b>{sel.length ? sel.join(', ') : '—'}</b></div>
        <div className="line"><span>Price per seat</span><b>₹{st.price}</b></div>
        <hr />
        <div className="line"><span>Total</span><span className="total">₹{sel.length * st.price}</span></div>
        <button className="btn gold block" style={{ marginTop: 14 }} disabled={!sel.length} onClick={book}>Confirm booking</button>
      </div>
    </div>
  );
}

function Bookings() {
  const [list, setList] = useState(null);
  const load = () => api('/bookings/mine').then(setList);
  useEffect(() => { load(); }, []);
  const cancel = async (id) => { if (confirm('Cancel this booking?')) { await api('/bookings/' + id, { method: 'DELETE' }); load(); } };
  if (!list) return null;
  if (!list.length) return <div className="panel" style={{ textAlign: 'center' }}><h3>No tickets yet</h3><p style={{ color: 'var(--muted)' }}>Your bookings will appear here.</p><Link to="/" className="btn gold">Browse movies</Link></div>;
  return (<>
    <h2 style={{ marginBottom: 22 }}>My tickets</h2>
    <div className="tickets">
      {list.map((b) => (
        <div className="ticket" key={b._id} style={b.status === 'cancelled' ? { opacity: .55 } : {}}>
          <div className="l">
            <span className={'pill ' + (b.status === 'booked' ? 'ok' : 'no')}>{b.status === 'booked' ? 'Confirmed' : 'Cancelled'}</span>
            <h4 style={{ margin: '10px 0 6px' }}>{b.movie?.title}</h4>
            <p style={{ color: 'var(--muted)', margin: 0 }}>{b.showtime && `${fDate(b.showtime.time)} · ${fTime(b.showtime.time)}`} · {b.showtime?.screen}</p>
            <p style={{ margin: '10px 0' }}>Seats <b>{b.seats.join(', ')}</b> · ₹{b.total}</p>
            {b.status === 'booked' && <button className="btn danger" onClick={() => cancel(b._id)}>Cancel booking</button>}
          </div>
          <div className="r"><small style={{ color: 'var(--muted)' }}>BOOKING ID</small><span className="code">{b._id.slice(-6).toUpperCase()}</span></div>
        </div>
      ))}
    </div>
  </>);
}

function Field({ label, type = 'text', value, onChange, children }) {
  return <div className="field"><input type={type} placeholder=" " value={value} onChange={onChange} required /><label>{label}</label>{children}</div>;
}

function Auth({ onAuth }) {
  const nav = useNavigate();
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { onAuth(await api('/auth/' + mode, { method: 'POST', body: f })); nav('/'); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const isLogin = mode === 'login';
  return (
    <div className="auth">
      <div className="auth-art">
        <span className="tag" style={{ alignSelf: 'flex-start', marginBottom: 20 }}>Premium cinema booking</span>
        <h1>Your seat is <span>waiting.</span></h1>
        <p>Pick a film, choose the perfect seats and walk in with your ticket in seconds.</p>
        <div className="feat">
          <div>🎬 &nbsp;Latest movies, every showtime</div>
          <div>💺 &nbsp;Live seat availability</div>
          <div>🔒 &nbsp;Secure account and instant tickets</div>
        </div>
      </div>
      <div className="auth-form">
        <form className="card-auth" onSubmit={submit}>
          <h2>{isLogin ? 'Welcome back' : 'Create account'}</h2>
          <p className="sub">{isLogin ? 'Sign in to manage your tickets.' : 'Join IMovies and start booking.'}</p>
          {err && <div className="notice error">{err}</div>}
          {!isLogin && <Field label="Full name" value={f.name} onChange={set('name')} />}
          <Field label="Email address" type="email" value={f.email} onChange={set('email')} />
          <Field label="Password (6+ characters)" type={show ? 'text' : 'password'} value={f.password} onChange={set('password')}>
            <button type="button" className="eye" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
          </Field>
          <button className="btn gold block" disabled={busy}>{busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}</button>
          <div className="switch">{isLogin ? 'New to IMovies? ' : 'Already a member? '}
            <button type="button" onClick={() => { setMode(isLogin ? 'register' : 'login'); setErr(''); }}>{isLogin ? 'Create an account' : 'Sign in'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
