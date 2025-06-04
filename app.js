import express from "express"
import debugRoutes from "./routes/debug.routes.js"

const app = express()

// Añadir esta línea donde se configuran las rutas
app.use("/api/debug", debugRoutes)

// /** rest of code here **/
