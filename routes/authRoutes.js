import { Router } from 'express'
import db from '../db.js'
const router = Router()
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
const secret = process.env.secret

router.post('/signup', async (req, res) => {
  //1. Check if the new user is not registered
  //1.1 search in the data base for an user that is using the email that is trying to register
  try {
    const userAlreadyExist = await db.query(
      `SELECT * FROM users WHERE users.email = '${req.body.email}'`
    )

    const userFound = userAlreadyExist.rows[0]
    //1.2 if the users already exist thorw an error message otherwise step 2
    if (userFound) {
      throw new Error('This user already exist')
    }

    //2. Hash the passworde before store it in the data base
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(req.body.password, salt)

    //3. create a new user using the data that the client provides
    const newUser = await db.query(
      `INSERT INTO users (first_name, last_name, email, password, profile_photo) 
      VALUES ('${req.body.first_name}','${req.body.last_name}', '${req.body.email}', '${hashedPassword}', '${req.body.profile_photo}') RETURNING *`
    )

    const userCreated = newUser.rows[0]

    //4. create the token
    //4.1 extract the data to create the token
    const user = { user_id: userCreated.user_id, email: userCreated.email }

    //4.2 add a secret word

    //4.3 create it
    const token = jwt.sign(user, secret)

    //5. send it via cookies and a message that the user was register succesfully
    res.cookie('jwt', token)
    res.json({ message: 'user succesfully register' })
  } catch (error) {
    res.json({ error: error.message })
  }
})

router.post('/login', async (req, res) => {
  //find user
  try {
    const { rows } = await db.query(
      `SELECT * FROM users WHERE email = '${req.body.email}'`
    )
    if (!rows.length) {
      throw new Error("Email doesn't exist")
    }
    const user = rows[0]
    //validate password
    const isPasswordValid = await bcrypt.compare(
      req.body.password,
      user.password
    )
    if (!isPasswordValid) {
      throw new Error('Your password is not correct')
    }
    //generate the token
    const token = jwt.sign({ user_id: user.user_id, email: user.email }, secret)
    //compose response
    res.cookie('jwt', token, { httpOnly: true, secure: true, sameSite: 'none' })
    //Respond
    res.json({ message: 'You are logged in' })
  } catch (err) {
    res.json({ error: err.message })
  }
})

router.get('/logout', (req, res) => {
  res.clearCookie('jwt')
  res.send('You are logged out')
})

router.get('/profile', async (req, res) => {
  try {
    // Validate Token
    const decodedToken = jwt.verify(req.cookies.jwt, secret)
    if (!decodedToken || !decodedToken.user_id || !decodedToken.email) {
      throw new Error('Invalid authentication token')
    }
    const { rows: userRows } = await db.query(`
      SELECT user_id, first_name, last_name, email, profile_photo
      FROM users WHERE user_id = ${decodedToken.user_id}
    `)
    res.json(userRows[0])
  } catch (err) {
    res.json({ error: err.message })
  }
})

router.patch('/profile', async (req, res) => {
  try {
    // Validate Token
    const decodedToken = jwt.verify(req.cookies.jwt, secret)
    if (!decodedToken || !decodedToken.user_id || !decodedToken.email) {
      throw new Error('Invalid authentication token')
    }
    // Validate fields
    if (
      !req.body.first_name &&
      !req.body.last_name &&
      !req.body.email &&
      !req.body.profile_photo
    ) {
      throw new Error('at least 1 field must be modified')
    }
    // Update user
    let query = `UPDATE users SET `
    if (req.body.first_name) {
      query += `first_name = '${req.body.first_name}', `
    }
    if (req.body.last_name) {
      query += `last_name = '${req.body.last_name}', `
    }
    if (req.body.email) {
      query += `email = '${req.body.email}', `
    }
    if (req.body.profile_photo) {
      query += `profile_photo = '${req.body.profile_photo}', `
    }
    query = query.slice(0, -2)
    query += `WHERE user_id = ${decodedToken.user_id} RETURNING profile_photo, first_name, last_name, email, user_id`
    const { rows: userRows } = await db.query(query)
    // Respond
    res.json(userRows[0])
  } catch (err) {
    res.json({ error: err.message })
  }
})

export default router
