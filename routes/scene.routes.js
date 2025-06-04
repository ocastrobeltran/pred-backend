import express from "express"
import {
  getAllScenes,
  getSceneById,
  createScene,
  updateScene,
  deleteScene,
  getLocations,
  getSports,
  getAmenities,
  getReservedHours,
  getAvailableDays,
  getAvailableHours,
  checkAvailability,
} from "../controllers/scene.controller.js"
import { verificarDisponibilidad } from "../controllers/request.controller.js"
import { authenticate, isAdmin } from "../middlewares/auth.middleware.js"
import { validate, validateParams } from "../middlewares/validation.middleware.js"
import { sceneSchema, sceneIdSchema } from "../utils/validation.util.js"

const router = express.Router()

console.log("🔧 SCENE ROUTES - Configurando rutas...")

// Rutas públicas (sin autenticación)
router.get("/", getAllScenes)
router.get("/localidades", getLocations)
router.get("/deportes", getSports)
router.get("/amenidades", getAmenities)

// ✅ RUTAS CRÍTICAS: Disponibilidad con logging detallado
console.log("🔧 SCENE ROUTES - Configurando ruta /dias-disponibles")
router.get("/dias-disponibles", getAvailableDays)

console.log("🔧 SCENE ROUTES - Configurando ruta /horas-disponibles")
router.get(
  "/horas-disponibles",
  (req, res, next) => {
    console.log("🚨 SCENE ROUTES - Interceptando /horas-disponibles")
    console.log("📥 Query params:", req.query)
    console.log("📥 URL completa:", req.originalUrl)
    next()
  },
  getAvailableHours,
)

// Verificar disponibilidad para un horario específico
router.post("/verificar-disponibilidad", checkAvailability)

router.get("/:id", validateParams(sceneIdSchema), getSceneById)
router.get("/:id/horas-reservadas", validateParams(sceneIdSchema), getReservedHours)

// Rutas que requieren autenticación
router.post("/disponibilidad", authenticate, verificarDisponibilidad)

// Rutas que requieren autenticación de admin
router.post("/", authenticate, isAdmin, validate(sceneSchema), createScene)
router.put("/:id", authenticate, isAdmin, validateParams(sceneIdSchema), updateScene)
router.delete("/:id", authenticate, isAdmin, validateParams(sceneIdSchema), deleteScene)

console.log("✅ SCENE ROUTES - Todas las rutas configuradas")

export default router
