import pg from "pg"
import dotenv from "dotenv"

dotenv.config()

const { Pool } = pg

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Necesario para Render.com
  },
})

// Función para verificar la conexión a la base de datos
const testConnection = async () => {
  try {
    const client = await pool.connect()
    console.log("✅ Conexión a la base de datos PostgreSQL establecida correctamente")

    // Verificar que las tablas existen
    const tableQuery = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)

    console.log(
      "Tablas disponibles en la base de datos:",
      tableQuery.rows.map((row) => row.table_name),
    )
    client.release()
    return true
  } catch (error) {
    console.error("❌ Error al conectar con la base de datos PostgreSQL:", error)
    return false
  }
}

// Función para ejecutar consultas
const query = async (text, params) => {
  const start = Date.now()
  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    console.log("Consulta ejecutada", { text, duration, rows: res.rowCount })
    return res
  } catch (error) {
    console.error("Error en consulta:", error)
    throw error
  }
}

export { pool, testConnection, query }
