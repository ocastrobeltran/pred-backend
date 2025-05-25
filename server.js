import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import { testConnection } from "./config/database.js"
import path from "path"
import { fileURLToPath } from "url"
import { errorHandler } from "./middlewares/error.middleware.js"

// Importar rutas
import authRoutes from "./routes/auth.routes.js"
import userRoutes from "./routes/user.routes.js"
import sceneRoutes from "./routes/scene.routes.js"
import requestRoutes from "./routes/request.routes.js"
import notificationRoutes from "./routes/notification.routes.js"
import fileRoutes from "./routes/file.routes.js"

// Configurar variables de entorno
dotenv.config()

// Obtener __dirname en módulos ES
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Inicializar Express
const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Middleware para logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`)
  next()
})

// Servir archivos estáticos
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// Verificar conexión a la base de datos
testConnection()
  .then((connected) => {
    if (!connected) {
      console.error("No se pudo conectar a la base de datos. Verificar configuración.")
    }
  })
  .catch((error) => {
    console.error("Error al verificar conexión a la base de datos:", error)
  })

// Rutas en inglés (mantenemos compatibilidad)
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/scenes", sceneRoutes)
app.use("/api/requests", requestRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api/files", fileRoutes)

// Rutas en español (para compatibilidad con el frontend)
app.use("/api/autenticacion", authRoutes)
app.use("/api/usuarios", userRoutes)
app.use("/api/escenarios", sceneRoutes)
app.use("/api/solicitudes", requestRoutes)
app.use("/api/notificaciones", notificationRoutes)
app.use("/api/archivos", fileRoutes)

// Ruta de prueba
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "API funcionando correctamente" })
})

// Middleware de manejo de errores
app.use(errorHandler)

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`)
})

export default app
