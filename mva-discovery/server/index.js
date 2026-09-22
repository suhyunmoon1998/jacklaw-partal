import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import generateRoute from './routes/generate.js'
import respondRoute from './routes/respond.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))

// Routes
app.post('/api/generate-interrogatories', generateRoute)
app.post('/api/generate-responses', respondRoute)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`🏢 Labor Discovery Server running on http://localhost:${PORT}`)
  console.log(`📡 CORS enabled for http://localhost:5173`)
})
