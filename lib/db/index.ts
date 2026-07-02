import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// Asynchronously ensure the new saleGroupId column exists in PostgreSQL and retroactively group old sales
pool
  .query('ALTER TABLE sales ADD COLUMN IF NOT EXISTS "saleGroupId" TEXT;')
  .then(() => {
    return pool.query(`
      WITH grouped_sales AS (
        SELECT 
          "userId", 
          "createdAt", 
          "customerName", 
          "paymentMethod", 
          md5("userId" || "createdAt"::text || COALESCE("customerName", '') || "paymentMethod") AS generated_group_id
        FROM sales
        WHERE "saleGroupId" IS NULL AND "type" = 'sale'
      )
      UPDATE sales s
      SET "saleGroupId" = gs.generated_group_id
      FROM grouped_sales gs
      WHERE s."userId" = gs."userId"
        AND s."createdAt" = gs."createdAt"
        AND COALESCE(s."customerName", '') = COALESCE(gs."customerName", '')
        AND s."paymentMethod" = gs."paymentMethod"
        AND s."saleGroupId" IS NULL
        AND s."type" = 'sale';
    `)
  })
  .catch((err) => {
    console.error('Falha ao rodar schema check / migrações retroativas:', err)
  })

export const db = drizzle(pool, { schema })
