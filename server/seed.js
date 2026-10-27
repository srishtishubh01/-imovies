const { connect } = require('./db');
const mongoose = require('mongoose');
const { Movie, Showtime } = require('./models');

const movies = [
  ['Midnight Express', 'A late-night train, a missing passenger and one detective with a single night to solve it.', 'Thriller', 124, 'Hindi', 8.1],
  ['Monsoon Melodies', 'Two street musicians in Mumbai chase a shot at the big stage.', 'Romance', 138, 'Hindi', 7.6],
  ['Orbit Zero', 'A crew stranded near Saturn has 48 hours of oxygen and one repair to make.', 'Sci-Fi', 142, 'English', 8.4],
  ['The Last Inning', 'A retired cricketer coaches a village team through one impossible season.', 'Drama', 129, 'Hindi', 7.9],
  ['Laugh Riot', 'Four cousins, one wedding, and a catering order that goes badly wrong.', 'Comedy', 115, 'Hindi', 7.2],
  ['Shadow Fort', 'A historian uncovers a hidden chamber under an old Rajasthan fort.', 'Adventure', 133, 'English', 7.8],
];

(async () => {
  await connect();
  await Movie.deleteMany(); await Showtime.deleteMany();
  const docs = await Movie.insertMany(movies.map(([title, description, genre, duration, language, rating], i) => ({
    title, description, genre, duration, language, rating,
    poster: `https://picsum.photos/seed/imovies${i}/400/560`,
  })));
  const showtimes = [];
  for (const m of docs) for (let d = 0; d < 4; d++) for (const [h, screen, price] of [[11, 'Screen 1', 180], [15, 'Screen 2', 220], [20, 'Screen 1', 280]]) {
    const t = new Date(); t.setDate(t.getDate() + d); t.setHours(h, 0, 0, 0);
    if (t > new Date()) showtimes.push({ movie: m._id, screen, time: t, price });
  }
  await Showtime.insertMany(showtimes);
  console.log(`Seeded ${docs.length} movies and ${showtimes.length} showtimes`);
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
