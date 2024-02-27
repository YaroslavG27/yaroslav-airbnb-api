import { Router } from 'express'
import db from '../db.js'
import jwt from 'jsonwebtoken'
import { secret } from '../secrets.js'
const router = Router()

// Define a POST route for creating a list of bookings
router.post('/bookings', async (req, res) => {
  try {
    const { house_id, price, arrival_date, departure_date, comment } = req.body
    const token = req.cookies.jwt

    if (!token) {
      throw new Error('Invalid authentication token')
    }

    const decoded = jwt.verify(token, secret)

    const insertBookingQuery = `
      INSERT INTO bookings (house_id, user_id, price, arrival_date, departure_date, comment)
      VALUES (${house_id}, ${decoded.user_id}, ${price}, '${arrival_date}', '${departure_date}', '${comment}')
      RETURNING *
    `

    const { rows } = await db.query(insertBookingQuery)
    res.json(rows[0])
  } catch (err) {
    res.json({ error: err.message })
  }
})

// Define a GET route for fetching the list of bookings
router.get('/bookings', async (req, res) => {
  try {
    const token = req.cookies.jwt

    if (!token) {
      throw new Error('Invalid authentication token')
    }

    const decoded = jwt.verify(token, secret)

    const user_id = decoded.user_id

    const userSearch = `
      SELECT * FROM bookings
      WHERE user_id = '${user_id}'
      ORDER BY arrival_date DESC
    `

    const { rows } = await db.query(userSearch)
    res.json(rows)
  } catch (err) {
    res.json({ error: err.message })
  }
})

// Define a GET route for fetching a specific booking by ID
router.get('/bookings/:booking_id', async (req, res) => {
  try {
    const token = req.cookies.jwt

    if (!token) {
      throw new Error('Invalid authentication token')
    }

    const decoded = jwt.verify(token, secret)

    const user_id = decoded.user_id
    const booking_id = req.params.booking_id

    const bookingSearch = `
      SELECT * FROM bookings
      WHERE booking_id = '${booking_id}'
    `

    const { rows } = await db.query(bookingSearch)

    if (rows.length === 0) {
      throw new Error('Booking not found')
    }

    const booking = rows[0]

    if (booking.user_id !== user_id) {
      throw new Error('You are not authorized')
    }

    res.json(booking)
  } catch (err) {
    console.error(err.message)
    res.json({ error: err.message })
  }
})

router.delete('/bookings/:booking_id', async (req, res) => {
  try {
    const token = req.cookies.jwt
    if (!token) {
      throw new Error('Invalid authentication token')
    }
    const decoded = jwt.verify(token, secret)
    const bookingId = req.params.booking_id
    const query = `SELECT * FROM bookings WHERE booking_id = ${bookingId}`
    const result = await db.query(query)
    const booking = result.rows[0]

    if (!booking) {
      throw new Error(`Booking with ID ${bookingId} not found`)
    }

    if (booking.user_id !== decoded.user_id) {
      throw new Error('You are not authorized to delete this booking')
    }
    const { rowCount } = await db.query(
      `DELETE FROM bookings WHERE booking_id = ${bookingId}`
    )
    res.json(rowCount)
  } catch (error) {
    res.json({ error: error.message })
  }
})

// Export the router
export default router
