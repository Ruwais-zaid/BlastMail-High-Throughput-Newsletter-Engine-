import { PoolClient, Pool, QueryResult, QueryResultRow } from 'pg'
import 'dotenv/config'
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

pool.on('error', (err: Error) => {
  console.log('Unexpected error on idle client', err)
  process.exit(-1)
})

export const query = async <T extends QueryResultRow>(
  text: string,
  params: readonly unknown[] = []
): Promise<T[]> => {
  const start = Date.now()
  try {
    const res: QueryResult<T> = await pool.query<T>(text, [...params])
    const duration = Date.now() - start
    console.log('executed query', { text, duration, rows: res.rowCount })
    return res.rows
  } catch (error) {
    console.log('Database query error', { text, error })
    throw error
  }
}
export const getClient = async (): Promise<PoolClient> => {
  return await pool.connect()
}

export const closePool = async (): Promise<void> => {
  await pool.end()
}
export default { query, getClient, closePool }
