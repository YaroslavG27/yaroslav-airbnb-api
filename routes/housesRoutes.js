import { Router } from 'express'
import db from '../db.js'
import jwt from 'jsonwebtoken'
const secret = process.env.secret
const router = Router()

// Post router
router.post('/houses', async (req, res) => {
  try {
    const { location, bedrooms, bathrooms, nightly_price, description } =
      req.body
    const token = req.cookies.jwt

    if (!token) {
      throw new Error('Invalid authentication token')
    }

    const decoded = jwt.verify(token, secret)

    const insertHouseQuery = `
      INSERT INTO houses (location, bedrooms, bathrooms, nightly_price, description, host_id)
      VALUES ('${location}', ${bedrooms}, ${bathrooms}, ${nightly_price}, '${description}', ${decoded.user_id})
      RETURNING *
    `

    const result = await db.query(insertHouseQuery)
    res.json(result.rows[0])
  } catch (err) {
    res.json({ error: err.message })
  }
})

// Route to access all houses data
router.get('/houses', async (req, res) => {
  // Sample data for houses
  let queryString = 'SELECT * FROM houses'

  try {
    if (
      req.query.location ||
      req.query.max_price ||
      req.query.min_rooms ||
      req.query.search
    ) {
      queryString += ' WHERE'
    }
    if (req.query.location) {
      queryString += ` houses.location ILIKE '%${req.query.location}%' AND`
    }
    if (req.query.max_price) {
      queryString += ` houses.nightly_price <= '${req.query.max_price}' AND`
    }
    if (req.query.search) {
      queryString += ` houses.description ILIKE '%${req.query.search}%' AND`
    }
    if (req.query.min_rooms) {
      queryString += ` houses.bedrooms >= '${req.query.min_rooms}' AND`
    }
    if (req.query.sort && req.query.order) {
      queryString += ` ORDER BY houses.${req.query.sort} ${req.query.order}`
    }

    if (queryString.endsWith('AND')) {
      queryString = queryString.slice(0, -4)
    }

    const result = await db.query(queryString)

    res.json(result.rows)
  } catch (err) {
    res.json({ error: err.message })
  }
})
// Route to access data of a specific house (house_id = 1)
router.get('/houses/:house_id', async (req, res) => {
  // Sample data for a specific house
  const numbId = Number(req.params.house_id)
  try {
    if (!numbId) {
      throw new Error(`house id most be a number`)
    }
    const result = await db.query(
      `SELECT * FROM houses WHERE houses.house_id = ${numbId}`
    )
    // Send the specific house data as JSON response
    let resultArr = result.rows
    if (!resultArr.length) {
      throw new Error(`Sorry, house not found`)
    }
    res.json(resultArr[0])
  } catch (err) {
    res.json({ error: err.message })
  }
})
//Route to updete fields of houses
router.patch('/houses/:house_id', async (req, res) => {
  let queryString = `UPDATE houses SET `
  try {
    if (req.body.location) {
      queryString += `location = '${req.body.location}', `
    }
    if (req.body.bedrooms) {
      queryString += `bedrooms = ${req.body.bedrooms}, `
    }
    if (req.body.bathrooms) {
      queryString += `bathrooms = ${req.body.bathrooms}, `
    }
    if (req.body.nightly_price) {
      queryString += `nightly_price = ${req.body.nightly_price}, `
    }
    if (req.body.description) {
      queryString += `description = '${req.body.description}', `
    }
    if (req.body.host_id) {
      queryString += `host_id = ${req.body.host_id}, `
    }
    if (queryString.endsWith(', ')) {
      queryString = queryString.slice(0, -2)
    }
    console.log(queryString)
    const rows = await db.query(
      (queryString = queryString + ` WHERE house_id = ${req.params.house_id}`)
    )
    res.json(rows)
  } catch (error) {
    res.json({ error: error.message })
  }
})

router.delete('/houses/:house_id', async (req, res) => {
  try {
    const token = req.cookies.jwt
    if (!token) {
      throw new Error('Invalid authentication token')
    }
    const decoded = jwt.verify(token, secret)

    const houseId = req.params.house_id
    const query = `SELECT * FROM houses WHERE house_id = ${houseId}`
    const result = await db.query(query)
    const house = result.rows[0]

    if (!house) {
      throw new Error(`House with ID ${houseId} not found`)
    }

    if (house.host_id !== decoded.user_id) {
      throw new Error('You are not authorized to delete this house')
    }

    const { rowCount } = await db.query(
      `DELETE FROM houses WHERE house_id = ${houseId}`
    )
    res.json(rowCount)
  } catch (error) {
    res.json({ error: error.message })
  }
})

export default router
