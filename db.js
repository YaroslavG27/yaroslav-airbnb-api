// db.js
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const DBURL = process.env.DBURL

const { Pool } = pg

// Database connection parameters
const db = new Pool({
  ssl: {
    rejectUnauthorized: false
  },
  connectionString: DBURL
})

export default db
