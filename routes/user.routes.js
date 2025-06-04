import express from "express"
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getRoles,
} from "../controllers/user.controller.js"
import { authenticate, isAdmin } from "../middlewares/auth.middleware.js"
import { validate, validateParams } from "../middlewares/validation.middleware.js"
import { userSchema, userUpdateSchema, userIdSchema } from "../utils/validation.util.js"
import { query } from "../config/database.js"
import bcrypt from "bcrypt"
import { sendError, sendResponse } from "../utils/response.util.js"

const router = express.Router()

// Rutas de roles (debe ir antes de las rutas con parámetros)
router.get("/roles", authenticate, isAdmin, getRoles)

// Rutas protegidas por admin
router.get("/", authenticate, isAdmin, getAllUsers)
router.post("/", authenticate, isAdmin, validate(userSchema), createUser)

// Rutas con parámetros (deben ir después de las rutas específicas)
router.get("/:id", authenticate, validateParams(userIdSchema), getUserById)
router.put("/:id", authenticate, validateParams(userIdSchema), validate(userUpdateSchema), updateUser)
router.delete("/:id", authenticate, isAdmin, validateParams(userIdSchema), deleteUser)

// Cambiar contraseña
router.put("/cambiar-password", authenticate, async (req, res) => {
  try {
    const { current_password, password } = req.body
    const userId = req.user.id

    // Validar datos requeridos
    if (!current_password || !password) {
      return sendError(res, "Contraseña actual y nueva son requeridas", 400)
    }

    // Obtener usuario actual
    const userQuery = await query("SELECT password FROM usuarios WHERE id = $1", [userId])

    if (userQuery.rows.length === 0) {
      return sendError(res, "Usuario no encontrado", 404)
    }

    // Verificar contraseña actual
    const isMatch = await bcrypt.compare(current_password, userQuery.rows[0].password)
    if (!isMatch) {
      return sendError(res, "Contraseña actual incorrecta", 400)
    }

    // Encriptar nueva contraseña
    const hashedPassword = await bcrypt.hash(password, 10)

    // Actualizar contraseña
    await query("UPDATE usuarios SET password = $1, updated_at = NOW() WHERE id = $2", [hashedPassword, userId])

    return sendResponse(res, null, "Contraseña actualizada exitosamente")
  } catch (error) {
    console.error("Error en changePassword:", error)
    return sendError(res, "Error en el servidor", 500)
  }
})

export default router
