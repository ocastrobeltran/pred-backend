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
} from "../controllers/scene.controller.js"
import { verificarDisponibilidad, getAvailableDays, getAvailableHours } from "../controllers/request.controller.js"
import { authenticate, isAdmin } from "../middlewares/auth.middleware.js"
import { validate, validateParams } from "../middlewares/validation.middleware.js"
import { sceneSchema, sceneIdSchema } from "../utils/validation.util.js"

const router = express.Router()

// Rutas públicas (sin autenticación)
router.get("/", getAllScenes)
router.get("/localidades", getLocations)
router.get("/deportes", getSports)
router.get("/amenidades", getAmenities)

// Días disponibles para un escenario en un rango de fechas
router.get("/dias-disponibles", getAvailableDays)

// Horas disponibles para un escenario y fecha
router.get("/horas-disponibles", getAvailableHours)

// Verificar disponibilidad para un horario específico
router.post("/verificar-disponibilidad", verificarDisponibilidad)

router.get("/:id", validateParams(sceneIdSchema), getSceneById)
router.get("/:id/horas-reservadas", validateParams(sceneIdSchema), getReservedHours)

// Rutas que requieren autenticación
router.post("/disponibilidad", authenticate, verificarDisponibilidad)

// Rutas que requieren autenticación de admin
router.post("/", authenticate, isAdmin, validate(sceneSchema), createScene)
router.put("/:id", authenticate, isAdmin, validateParams(sceneIdSchema), updateScene)
router.delete("/:id", authenticate, isAdmin, validateParams(sceneIdSchema), deleteScene)

export default router
