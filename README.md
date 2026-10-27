# IMovies – Movie ticket booking (MERN + MongoDB Atlas)

## 1. Setup the database
1. In MongoDB Atlas: create a cluster, a database user, and under Network Access allow your IP (or 0.0.0.0/0 for testing).
2. Click Connect > Drivers and copy the connection string.
3. Copy `server/.env.example` to `server/.env` and paste your string into `MONGO_URI` (replace user, password and keep `/imovies` as the database name).

## 2. Run the backend
```
cd server
npm install
npm run seed     # adds sample movies and showtimes
npm run dev      # http://localhost:5000
```

## 3. Run the frontend (new terminal)
```
cd client
npm install
npm run dev      # http://localhost:5173
```
Open imovies-git-main-srishtishubh01.vercel.app, register an account, pick a movie, a showtime and your seats.
