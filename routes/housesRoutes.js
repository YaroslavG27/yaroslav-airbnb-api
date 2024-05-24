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
  let queryString = `SELECT * FROM (SELECT DISTINCT ON (houses.house_id) houses.*, photos.url FROM houses LEFT JOIN photos ON houses.house_id = photos.house_id`

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
    if (queryString.endsWith('AND')) {
      queryString = queryString.slice(0, -4)
    }
    queryString += `) AS distinct_houses`
    if (req.query.sort === 'rooms') {
      queryString += ` ORDER BY bedrooms DESC`
    } else {
      queryString += ` ORDER BY nightly_price ASC`
    }
    console.log('query-->', queryString)
    const result = await db.query(queryString)

    console.log('respuesta->', result.rows)
    res.json(result.rows)
  } catch (err) {
    res.json({ error: err.message })
  }
})
// Route to access data of a specific house (house_id = 1)
router.get('/houses/:house_id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM houses WHERE houses.house_id = ${req.params.house_id}`
    )
    if (!result.rows[0]) {
      throw new Error(`Sorry, house not found`)
    }

    let house = result.rows[0]
    let { rows: hostRows } = await db.query(
      `SELECT user_id, profile_photo, first_name, last_name FROM users WHERE user_id = ${house.host_id}`
    )
    house.host = {
      user_id: hostRows[0].user_id,
      profile_photo: hostRows[0].profile_photo,
      firstName: hostRows[0].first_name,
      lastName: hostRows[0].last_name
    }

    let { rows: photosRows } = await db.query(
      `SELECT * FROM photos WHERE house_id = ${house.house_id}`
    )
    house.images = photosRows.map((p) => p.url)
    delete house.user_id
    res.json(house)
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

    const rows = await db.query(
      (queryString =
        queryString + ` WHERE house_id = ${req.params.house_id} RETURNING *`)
    )
    res.json(rows.rows[0])
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

router.get('/locations', async (req, res) => {
  try {
    let query = `SELECT DISTINCT(location) FROM houses`
    let { rows } = await db.query(query)
    rows = rows.map((r) => r.location)
    res.json(rows)
  } catch (err) {
    res.json({ error: err.message })
  }
})

router.get('/listings', async (req, res) => {
  try {
    // Validate Token
    const decodedToken = jwt.verify(req.cookies.jwt, secret)
    if (!decodedToken || !decodedToken.user_id || !decodedToken.email) {
      throw new Error('Invalid authentication token')
    }
    // Get houses
    let query = `
      SELECT
        houses.house_id,
        houses.location,
        houses.bedrooms,
        houses.bathrooms,
        houses.reviews_count,
        houses.rating,
        houses.nightly_price AS price,
        photos.url
      FROM houses
      LEFT JOIN (
          SELECT DISTINCT ON (house_id) house_id, url
          FROM photos
      ) AS photos ON photos.house_id = houses.house_id
      WHERE houses.host_id = ${decodedToken.user_id}
    `
    let { rows } = await db.query(query)
    // Respond
    res.json(rows)
  } catch (err) {
    res.json({ error: err.message })
  }
})

export default router
