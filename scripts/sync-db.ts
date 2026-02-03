import 'dotenv/config'
import { syncDatabase } from '../models/index'

async function main() {
  console.log('Syncing database...')
  
  // Use alter: true to modify existing tables without dropping data
  // Use force: true to drop and recreate tables (WARNING: data loss)
  await syncDatabase({ alter: true })
  
  console.log('Database synced successfully!')
  process.exit(0)
}

main().catch((error) => {
  console.error('Error syncing database:', error)
  process.exit(1)
})
