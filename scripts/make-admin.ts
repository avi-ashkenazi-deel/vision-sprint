import 'dotenv/config'
import { Sequelize } from 'sequelize'
import pg from 'pg'

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}

const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  dialectModule: pg,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
})

async function main() {
  const email = 'avi.ashkenazi@deel.com'
  
  const [results] = await sequelize.query(
    `SELECT id, email, "isAdmin" FROM "User" WHERE email = $1`,
    { bind: [email] }
  )
  
  console.log('User found:', results)
  
  if ((results as any[]).length > 0) {
    await sequelize.query(
      `UPDATE "User" SET "isAdmin" = true WHERE email = $1`,
      { bind: [email] }
    )
    console.log('Updated to admin!')
  } else {
    console.log('User not found yet. Listing all users:')
    const [allUsers] = await sequelize.query(`SELECT id, email, "isAdmin" FROM "User"`)
    console.log(allUsers)
  }
  
  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
