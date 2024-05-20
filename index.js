import express from 'express'
import bookingsRoutes from './routes/bookingsRoutes.js'
import reviewsRoutes from './routes/reviewsRoutes.js'
import photosRoutes from './routes/photosRoutes.js'
import housesRouters from './routes/housesRoutes.js'
import authRoutes from './routes/authRoutes.js'
import usersRoutes from './routes/userRoutes.js'
import cookieParser from 'cookie-parser'
import 'dotenv/config'

// start app
const app = express()

// middleware
app.use(express.json())
app.use(cookieParser())

// use routes
app.use(authRoutes)
app.use(usersRoutes)
app.use(photosRoutes)
app.use(housesRouters)
app.use(bookingsRoutes)
app.use(reviewsRoutes)

app.listen(4100, () => {
  console.log('Airbnb API ready on localhost:4100')
})
