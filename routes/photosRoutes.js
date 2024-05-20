import { Router } from 'express'
import db from '../db.js'
import jwt from 'jsonwebtoken'
const secret = process.env.secret
const router = Router()

// Post to photos data
router.post('/photos', async (req, res) => {
  try {
    const { url, house_id } = req.body
    const token = req.cookies.jwt
    if (!token) {
      throw new Error('Invalid authentication token')
    }

    const decoded = jwt.verify(token, secret)
    const userFoundQuery = `
      SELECT * FROM houses WHERE host_id = '${decoded.user_id}'
    `
    const userFound = await db.query(userFoundQuery)
    if (!userFound.rows.length > 0) {
      throw new Error('Invalid authentication token or host not found')
    }

    const insertPhotoQuery = `
      INSERT INTO photos (url, house_id)
      VALUES ('${url}', '${house_id}')
      RETURNING *
    `

    const { rows } = await db.query(insertPhotoQuery)
    res.json(rows[0])
  } catch (err) {
    res.json({ error: err.message })
  }
})

// Route to access all photos data
router.get('/photos', async (req, res) => {
  try {
    const { house } = req.query
    const houseSearch = `
      SELECT * FROM photos
    `
    const { rows } = await db.query(houseSearch)
    res.json(rows)
  } catch (err) {
    console.error(err.message)
    res.json({ error: 'we are down' })
  }
})

// Route to access data of a specific photo (photo_id = 1)
router.get('/photos/:photo_id', async (req, res) => {
  // Sample data for a specific house
  const numbId = Number(req.params.photo_id)
  try {
    if (!numbId) {
      throw new Error(`photo id most be a number`)
    }
    const result = await db.query(
      `SELECT * FROM photos WHERE photos.photo_id = ${numbId}`
    )
    // Send the specific photo data as JSON response
    let resultArr = result.rows
    if (!resultArr.length) {
      throw new Error(`Sorry, photo not found`)
    }
    res.json(resultArr[0])
  } catch (err) {
    res.json({ error: err.message })
  }
})

// PATCH: Route for clients to update existing data
router.patch('/photos/:photo_id', async (req, res) => {
  try {
    const { rows } = await db.query(`
    UPDATE photos
    SET url = '${req.body.url}'
    WHERE photo_id = ${req.params.photo_id}
    RETURNING *
  `)
    res.json(rows)
  } catch (err) {
    res.json({ error: err.error })
  }
})

// Delete Route for clients to delete existing data
router.delete('/photos/:photo_id', async (req, res) => {
  try {
    const token = req.cookies.jwt
    if (!token) {
      throw new Error('Invalid authentication token')
    }
    const decoded = jwt.verify(token, secret)
    const photoId = req.params.photo_id
    const query = `SELECT * FROM photos WHERE photo_id = ${photoId}`
    const result = await db.query(query)
    const photo = result.rows[0]

    if (!photo) {
      throw new Error(`Photo with ID ${photoId} not found`)
    }
    const houseQuery = `SELECT * FROM houses WHERE house_id = ${photo.house_id} AND host_id = ${decoded.user_id}`
    const houseResult = await db.query(houseQuery)
    const house = houseResult.rows[0]

    if (!house) {
      throw new Error('You are not authorized to delete this photo')
    }

    const deleteQuery = `DELETE FROM photos WHERE photo_id = ${photoId}`
    const { rowCount } = await db.query(deleteQuery)
    if (!rowCount) {
      throw new Error('Delete operation failed')
    }

    res.json({ message: 'Photo deleted successfully' })
  } catch (error) {
    res.json({ error: error.message })
  }
})

export default router
