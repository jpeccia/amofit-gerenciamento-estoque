import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// Asynchronously ensure the new saleGroupId column exists in PostgreSQL
pool.query('ALTER TABLE sales ADD COLUMN IF NOT EXISTS "saleGroupId" TEXT;').catch((err) => {
  console.error('Falha ao garantir que a coluna saleGroupId existe no banco de dados:', err)
})

export const db = drizzle(pool, { schema })
