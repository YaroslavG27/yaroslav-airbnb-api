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
      throw new Error('Invalid authentication tokenen')
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
  console.log(req.query)
  try {
    const { house } = req.query
    const houseSearch = `
      SELECT * FROM reviews
      WHERE house_id = $1
    `
    const { rows } = await db.query(houseSearch, [house])
    res.json(rows)
  } catch (err) {
    console.error(err.message)
    res.json({ error: 'we are down' })
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
