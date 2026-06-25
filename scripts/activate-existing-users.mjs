// One-time migration: set isActive=true for all users that existed before OTP verification
// was introduced, so they aren't locked out.
import pkg from 'pg'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const { Pool } = pkg

// Load .env
const env = readFileSync(resolve(process.cwd(), '.env'), 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([^#=\s][^=]*)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '')
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const { rowCount } = await pool.query(`UPDATE users SET "isActive" = true WHERE "isActive" = false`)
console.log(`✓ Activated ${rowCount} existing user(s).`)
await pool.end()
