import { Router } from 'express'
import db from '../db.js'
import jwt from 'jsonwebtoken'
const secret = process.env.secret
const router = Router()

// Post to reviews data
router.post('/reviews', async (req, res) => {
  try {
    const { user_id, house_id, rating, content, date } = req.body
    const token = req.cookies.jwt

    if (!token) {
      throw new Error('Invalid authentication token')
    }

    const decoded = jwt.verify(token, secret)

    const queryString = `
      INSERT INTO reviews (user_id, house_id, rating, content, date)
      VALUES (${decoded.user_id}, ${house_id}, ${rating}, '${content}', '${date}')
      RETURNING *
    `

    const { rows } = await db.query(queryString)
    res.json(rows[0])
  } catch (err) {
    res.json({ error: err.message })
  }
})

// Define a GET route for fetching the list of reviews
router.get('/reviews', async (req, res) => {
  try {
    if (!req.query.house_id) {
      throw new Error('house_id is required')
    }
    let sqlquery = `
      SELECT reviews.*, users.first_name, users.last_name, users.profile_photo FROM reviews
      LEFT JOIN users ON users.user_id = reviews.user_id
      WHERE house_id = ${req.query.house_id}
      ORDER BY date DESC
    `
    console.log('sql', sqlquery)
    let { rows } = await db.query(sqlquery)
    const formatter = new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
    let reviews = rows.map((r) => {
      r.author = {
        firstName: r.first_name,
        lastName: r.last_name,
        profile_photo: r.profile_photo
      }
      r.date = formatter.format(new Date(r.date))
      delete r.first_name
      delete r.last_name
      delete r.profile_photo
      return r
    })
    res.json(reviews)
    console.log('reviews', reviews)
  } catch (err) {
    res.json({ error: err.message })
  }
})

// Define a GET route for fetching a single review
router.get('/reviews/:review_id', async (req, res) => {
  const numbId = Number(req.params.review_id)
  try {
    if (!numbId) {
      throw new Error(`Review id most be a number`)
    }
    const result = await db.query(
      `SELECT * FROM reviews WHERE review_id = ${numbId}`
    )
    let resultArr = result.rows
    if (!resultArr.length) {
      throw new Error(`Sorry, review not found`)
    }
    res.json(resultArr[0])
  } catch (err) {
    res.json({ error: err.message })
  }
})

// DELETE route for reviews
router.delete('/reviews/:review_id', async (req, res) => {
  try {
    const { rowCount } = await db.query(`
    DELETE FROM reviews WHERE review_id = ${req.params.review_id}
  `)
    if (!rowCount) {
      throw new Error('Delete Failed')
    }
    res.json(rowCount)
  } catch (err) {
    res.json({ error: err.message })
  }
})
// Export the router
export default router
