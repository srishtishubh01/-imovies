const { connect } = require('./db');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Movie, Showtime, Booking } = require('./models');

const app = express();
app.use(cors(), express.json());

// Serverless: connect to MongoDB once and reuse the connection
let ready;
app.use((req, res, next) => {
  ready = ready || connect();
  ready.then(() => next()).catch((e) => {
    ready = null;
    res.status(500).json({ message: e.message });
  });
});

const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const safe = (u) => ({ id: u._id, name: u.name, email: u.email });
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => res.status(500).json({ message: e.message }));

const auth = async (req, res, next) => {
  try {
    const token = (req.headers.authorization || '').split(' ')[1];
    req.user = await User.findById(jwt.verify(token, process.env.JWT_SECRET).id);
    if (!req.user) throw new Error();
    next();
  } catch {
    res.status(401).json({ message: 'Please log in to continue' });
  }
};

// ---- Auth ----
app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6)
    return res.status(400).json({ message: 'Name, email and a password of 6+ characters are required' });
  if (await User.findOne({ email: email.toLowerCase() }))
    return res.status(400).json({ message: 'This email is already registered' });
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: sign(user), user: safe(user) });
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const user = await User.findOne({ email: (req.body.email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(req.body.password || '', user.password)))
    return res.status(400).json({ message: 'Incorrect email or password' });
  res.json({ token: sign(user), user: safe(user) });
}));

// ---- Movies & showtimes ----
app.get('/api/movies', wrap(async (req, res) => res.json(await Movie.find().sort('title'))));

app.get('/api/movies/:id', wrap(async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie) return res.status(404).json({ message: 'Movie not found' });
  res.json(movie);
}));

app.get('/api/movies/:id/showtimes', wrap(async (req, res) =>
  res.json(await Showtime.find({ movie: req.params.id, time: { $gt: new Date() } }).sort('time'))));

app.get('/api/showtimes/:id', wrap(async (req, res) => {
  const st = await Showtime.findById(req.params.id).populate('movie', 'title');
  if (!st) return res.status(404).json({ message: 'Showtime not found' });
  res.json(st);
}));

// ---- Bookings ----
const SEAT = /^[A-H]([1-9]|10)$/;

app.post('/api/bookings', auth, wrap(async (req, res) => {
  const seats = [...new Set(req.body.seats || [])];
  if (!seats.length || seats.length > 8 || !seats.every((s) => SEAT.test(s)))
    return res.status(400).json({ message: 'Select between 1 and 8 valid seats' });

  // Atomic: only succeeds if none of the requested seats is already booked (prevents double booking)
  const st = await Showtime.findOneAndUpdate(
    { _id: req.body.showtimeId, time: { $gt: new Date() }, bookedSeats: { $nin: seats } },
    { $push: { bookedSeats: { $each: seats } } },
    { new: true }
  );
  if (!st) return res.status(409).json({ message: 'Some seats were just taken. Please pick different seats.' });

  const booking = await Booking.create({
    user: req.user._id, movie: st.movie, showtime: st._id, seats, total: seats.length * st.price,
  });
  res.status(201).json(booking);
}));

app.get('/api/bookings/mine', auth, wrap(async (req, res) =>
  res.json(await Booking.find({ user: req.user._id }).sort('-createdAt')
    .populate('movie', 'title').populate('showtime', 'time screen'))));

app.delete('/api/bookings/:id', auth, wrap(async (req, res) => {
  const b = await Booking.findOne({ _id: req.params.id, user: req.user._id, status: 'booked' });
  if (!b) return res.status(404).json({ message: 'Booking not found' });
  await Showtime.updateOne({ _id: b.showtime }, { $pull: { bookedSeats: { $in: b.seats } } });
  b.status = 'cancelled';
  await b.save();
  res.json(b);
}));

// Local / Render: start a normal server. On Vercel the app is exported instead.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  ready = ready || connect();
  ready.then(() => app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`)));
}

module.exports = app;