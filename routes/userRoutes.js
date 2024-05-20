import { Router } from 'express'
import db from '../db.js'
import jwt from 'jsonwebtoken'
const secret = process.env.secret
const router = Router()

// Route to fetch the authenticated user
router.get('/users', async (req, res) => {
  try {
    const token = req.cookies.jwt
    if (!token) {
      throw new Error('Invalid authentication token')
    }
    const decoded = jwt.verify(token, secret)
    const query = `SELECT * FROM users WHERE user_id = '${decoded.user_id}'`
    const result = await db.query(query)
    const user = result.rows[0]

    if (!user) {
      throw new Error('Authenticated user not found')
    }

    res.json(user)
  } catch (err) {
    res.json({ error: err.message })
  }
})

/// Route to fetch a specific user by ID
router.get('/users/:user_Id', async (req, res) => {
  try {
    const token = req.cookies.jwt
    if (!token) {
      throw new Error('Invalid authentication token')
    }
    const decoded = jwt.verify(token, secret)
    const requestedUserId = Number(req.params.user_Id)
    if (decoded.user_id !== requestedUserId) {
      throw new Error('You are not authorized')
    }

    const numId = Number(req.params.user_Id)
    if (!numId) {
      throw new Error('User ID must be a number')
    }
    const query = `SELECT * FROM users WHERE user_id = '${numId}'`
    const result = await db.query(query)
    const usersArray = result.rows
    if (usersArray.length === 0) {
      throw new Error(`User ${numId} does not exist`)
    }
    res.json(usersArray[0])
  } catch (err) {
    res.json({ error: err.message })
  }
})

// UPDATE users data
router.patch('/users/:user_id', async (req, res) => {
  let queryString = 'UPDATE users SET'
  try {
    if (req.body.first_name) {
      queryString += ` first_name = '${req.body.first_name}',`
    }
    if (req.body.last_name) {
      queryString += ` last_name = '${req.body.last_name}',`
    }
    if (req.body.email) {
      queryString += ` email = '${req.body.email}',`
    }
    if (req.body.password) {
      queryString += ` password = '${req.body.password}',`
    }
    if (req.body.profile_photo) {
      queryString += ` profile_photo = '${req.body.profile_photo}' `
    }
    if (queryString.endsWith(',')) {
      queryString = queryString.slice(0, -1)
    }
    queryString += ` WHERE user_id = ${req.params.user_id} RETURNING first_name, last_name, email, profile_photo`
    console.log(queryString)

    const result = await db.query(queryString)

    res.json(result.rows)
  } catch (err) {
    res.json({ error: err.message })
  }
})
export default router
