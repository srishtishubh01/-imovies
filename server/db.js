const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') }); // always reads server/.env
const dns = require('dns');
const mongoose = require('mongoose');
dns.setServers(['8.8.8.8', '8.8.4.4']); // avoids "querySrv ECONNREFUSED" DNS errors

function getUri() {
  const e = process.env;
  const full = (e.MONGO_URI || '').trim();
  if (full && !full.includes('<')) return full;
  if (e.DB_USER && e.DB_PASS && e.DB_HOST)
    return `mongodb+srv://${encodeURIComponent(e.DB_USER.trim())}:${encodeURIComponent(e.DB_PASS.trim())}@${e.DB_HOST.trim()}/imovies?retryWrites=true&w=majority`;
  return null;
}

function explain(err) {
  const m = err.message || '';
  if (/bad auth|Authentication failed/i.test(m))
    return 'Wrong database username or password.\n -> Atlas > Database Access: use that user (not your Atlas login email). Click Edit > set a new password using only letters and numbers, then update DB_PASS in server/.env.';
  if (/whitelist|Could not connect to any servers|ReplicaSetNoPrimary|timed out|selection/i.test(m))
    return 'Atlas is blocking your computer.\n -> Atlas > Network Access > Add IP Address > "Allow access from anywhere" > Confirm. Wait 2 minutes, then run again.';
  if (/querySrv|ENOTFOUND|ECONNREFUSED/i.test(m))
    return 'Cannot find the cluster address.\n -> DB_HOST must look like cluster0.abcde.mongodb.net (no mongodb+srv://, no @, no /). Also try a mobile hotspot.';
  return m;
}

async function connect() {
  const uri = getUri();
  if (!uri) {
    console.error('\nNo database details found. Open server/.env and fill DB_USER, DB_PASS and DB_HOST.');
    process.exit(1);
  }
  console.log('Connecting to', uri.replace(/\/\/.*@/, '//***@').split('?')[0], '...');
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('\nCONNECTION FAILED:\n' + explain(err) + '\n');
    process.exit(1);
  }
}

module.exports = { connect };
