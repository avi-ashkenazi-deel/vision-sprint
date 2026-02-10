import { Sequelize } from 'sequelize'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Detect if using Supabase pooler (port 6543) or direct connection
const isSupabasePooler = databaseUrl.includes('pooler.supabase.com')
const isProduction = process.env.NODE_ENV === 'production'

// Parse the connection string to extract components for Sequelize
const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: isProduction ? false : console.log,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {
    // Supabase pooler and production direct connections need SSL
    ...(isProduction || isSupabasePooler ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    } : {})
  }
})

export default sequelize
