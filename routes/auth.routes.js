import express from "express"
import { authenticate } from "../middlewares/auth.middleware.js"
import { validate } from "../middlewares/validation.middleware.js"
import {
  loginSchema,
  registerSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
} from "../utils/validation.util.js"
import {
  register,
  login,
  getCurrentUser,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
} from "../controllers/auth.controller.js"

const router = express.Router()

// Rutas públicas
router.post("/register", validate(registerSchema), register)
router.post("/login", validate(loginSchema), login)

// Mantenemos estas rutas por si se quieren implementar en el futuro
router.get("/verify/:token", verifyEmail)
router.post("/forgot-password", validate(passwordResetRequestSchema), requestPasswordReset)
router.post("/reset-password", validate(passwordResetSchema), resetPassword)

// Obtener usuario actual
router.get("/me", authenticate, getCurrentUser)

export default router
