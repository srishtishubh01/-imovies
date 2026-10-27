const { Schema, model } = require('mongoose');

const User = model('User', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
}, { timestamps: true }));

const Movie = model('Movie', new Schema({
  title: { type: String, required: true },
  description: String,
  genre: String,
  duration: Number, // minutes
  language: String,
  rating: Number,
  poster: String,
}, { timestamps: true }));

const Showtime = model('Showtime', new Schema({
  movie: { type: Schema.Types.ObjectId, ref: 'Movie', required: true },
  screen: { type: String, default: 'Screen 1' },
  time: { type: Date, required: true },
  price: { type: Number, default: 200 },
  bookedSeats: { type: [String], default: [] }, // e.g. "A1", "C7"
}));

const Booking = model('Booking', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  movie: { type: Schema.Types.ObjectId, ref: 'Movie', required: true },
  showtime: { type: Schema.Types.ObjectId, ref: 'Showtime', required: true },
  seats: [String],
  total: Number,
  status: { type: String, enum: ['booked', 'cancelled'], default: 'booked' },
}, { timestamps: true }));

module.exports = { User, Movie, Showtime, Booking };
