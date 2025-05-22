import express from "express"
import {
  getAllRequests,
  getRequestById,
  createRequest,
  changeRequestStatus,
  findByReservationCode,
  getRequestStatuses,
  getRequestPurposes,
} from "../controllers/request.controller.js"
import { authenticate, isSupervisorOrAdmin } from "../middlewares/auth.middleware.js"
import { validate, validateParams, validateQuery } from "../middlewares/validation.middleware.js"
import { requestSchema, requestIdSchema, statusChangeSchema, reservationCodeSchema } from "../utils/validation.util.js"

const router = express.Router()

// Rutas protegidas
router.get("/", authenticate, getAllRequests)
router.get("/:id", authenticate, validateParams(requestIdSchema), getRequestById)
router.post("/", authenticate, validate(requestSchema), createRequest)
router.get("/buscar", authenticate, validateQuery(reservationCodeSchema), findByReservationCode)
router.get("/estados", authenticate, getRequestStatuses)
router.get("/propositos", authenticate, getRequestPurposes)

// Rutas protegidas por supervisor o admin
router.put(
  "/:id/cambiar-estado",
  authenticate,
  isSupervisorOrAdmin,
  validateParams(requestIdSchema),
  validate(statusChangeSchema),
  changeRequestStatus,
)

export default router
