import 'dotenv/config'
import { syncDatabase } from '../models/index'

async function main() {
  console.log('WARNING: This will drop all tables and recreate them!')
  console.log('Resetting database...')
  
  await syncDatabase({ force: true })
  
  console.log('Database reset successfully!')
  process.exit(0)
}

main().catch((error) => {
  console.error('Error resetting database:', error)
  process.exit(1)
})
