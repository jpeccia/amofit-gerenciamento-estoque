import {
  pgTable,
  text,
  timestamp,
  boolean,
  serial,
  integer,
  numeric,
  index,
} from 'drizzle-orm/pg-core'

// --- Better Auth required tables -------------------------------------------
// Column names are camelCase to match Better Auth's defaults. Do not rename.

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

// --- App tables ------------------------------------------------------------

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  size: text('size').notNull(),
  quantity: integer('quantity').notNull().default(0),
  price: numeric('price', { precision: 10, scale: 2 }).notNull().default('0'),
  colors: text('colors'),
  sku: text('sku'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => [
  index('products_user_id_idx').on(table.userId),
])

export const sales = pgTable('sales', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  productId: integer('productId'),
  productName: text('productName').notNull(),
  category: text('category').notNull(),
  size: text('size').notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: numeric('unitPrice', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  total: numeric('total', { precision: 10, scale: 2 }).notNull().default('0'),
  paymentMethod: text('paymentMethod').notNull(),
  type: text('type').notNull().default('sale'),
  color: text('color'),
  installments: integer('installments').notNull().default(1),
  paymentStatus: text('paymentStatus').notNull().default('paid'),
  customerName: text('customerName'),
  sku: text('sku'),
  amountPaid: numeric('amountPaid', { precision: 10, scale: 2 })
    .notNull()
    .default('0.00'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => [
  index('sales_user_id_idx').on(table.userId),
  index('sales_created_at_idx').on(table.createdAt),
])
