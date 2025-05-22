import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { pool } from "../config/database.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function initializeDatabase() {
  console.log("Inicializando base de datos...")

  try {
    // Leer el archivo SQL
    const sqlFilePath = path.join(__dirname, "..", "database", "init.sql")
    const sqlContent = fs.readFileSync(sqlFilePath, "utf8")

    // Ejecutar las consultas SQL
    const client = await pool.connect()
    try {
      await client.query(sqlContent)
      console.log("✅ Base de datos inicializada correctamente")
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("❌ Error al inicializar la base de datos:", error)
    process.exit(1)
  }
}

// Ejecutar la inicialización
initializeDatabase().then(() => {
  console.log("Proceso completado")
  process.exit(0)
})
