import { Router } from 'express'
import db from '../db.js'
import jwt from 'jsonwebtoken'
const secret = process.env.secret
const router = Router()

// Define a POST route for creating a list of bookings
router.post('/bookings', async (req, res) => {
  try {
    //Validate token
    const decodedToken = jwt.verify(req.cookies.jwt, secret)
    if (!decodedToken || !decodedToken.user_id || !decodedToken.email) {
      throw new Error('Invalid authentication token')
    }
    //Validate fieds
    let { house_id, arrival_date, departure_date, comment } = req.body
    if (!house_id || !arrival_date || !departure_date) {
      throw new Error('House id, arrival date and departure date are required')
    }
    //Find house to get price
    let houseFound = await db.query(
      `SELECT house_id, nightly_price FROM houses WHERE house_id = ${house_id}`
    )
    if (!houseFound.rows.length) {
      throw new Error(`House id ${house_id} not found`)
    }
    const house = houseFound.rows[0]
    //Calculate total nights
    let checkingDate = new Date(req.body.arrival_date)
    let checkOutDate = new Date(req.body.departure_date)
    if (checkOutDate <= checkingDate) {
      throw new Error('arrival_date must be before departure_date')
    }
    const totalNights = Math.round(
      (checkOutDate - checkingDate) / (1000 * 60 * 60 * 24)
    )
    //Calculate total price
    const totalPrice = totalNights * house.nightly_price
    //Create a booking
    let { rows } = await db.query(
      `INSERT INTO bookings (house_id, user_id, price, arrival_date, departure_date, comment, total_night)
      VALUES('${house_id}', '${decodedToken.user_id}', ${totalPrice}, '${arrival_date}', '${departure_date}', '${comment}', ${totalNights}) RETURNING *`
    )
    //Respond
    res.json(rows[0])
  } catch (err) {
    res.json({ error: err.message })
  }
  // try {
  //   const { house_id, price, arrival_date, departure_date, comment } = req.body
  //   const token = req.cookies.jwt
  //   if (!token) {
  //     throw new Error('Invalid authentication token')
  //   }
  //   const decoded = jwt.verify(token, secret)
  //   const insertBookingQuery = `
  //     INSERT INTO bookings (house_id, user_id, price, arrival_date, departure_date, comment)
  //     VALUES (${house_id}, ${decoded.user_id}, ${price}, '${arrival_date}', '${departure_date}', '${comment}')
  //     RETURNING *
  //   `
  //   const { rows } = await db.query(insertBookingQuery)
  //   res.json(rows[0])
  // } catch (err) {
  //   res.json({ error: err.message })
  // }
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
      SELECT
        bookings.booking_id,
        TO_CHAR(bookings.arrival_date, 'DD Mon YYYY') AS arrival_date,
    TO_CHAR(bookings.departure_date, 'DD Mon YYYY') AS departure_date,
        bookings.price,
        bookings.total_night,
        houses.house_id,
        houses.location,
        houses.bedrooms,
        houses.bathrooms,
        houses.reviews_count,
        houses.nightly_price,
        houses.rating,
        photos.url
      FROM bookings
      LEFT JOIN houses ON houses.house_id = bookings.house_id
      LEFT JOIN (
          SELECT DISTINCT ON (house_id) house_id, url
          FROM photos
      ) AS photos ON photos.house_id = houses.house_id
      WHERE bookings.user_id = ${user_id}
      ORDER BY bookings.arrival_date DESC
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
