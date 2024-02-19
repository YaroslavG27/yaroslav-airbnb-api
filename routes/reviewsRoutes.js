import { Router } from 'express'
import db from '../db.js'
const router = Router()

// Define a GET route for fetching the list of reviews
router.get('/reviews', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * From reviews')
    console.log(rows)
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

// Export the router
export default router
