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
router.get("/verify/:token", verifyEmail)
router.post("/forgot-password", validate(passwordResetRequestSchema), requestPasswordReset)
router.post("/reset-password", validate(passwordResetSchema), resetPassword)

// Login de usuario
// router.post("/login", async (req, res) => {
//   try {
//     const { email, password } = req.body

//     // Validar datos requeridos
//     if (!email || !password) {
//       return sendError(res, "Email y contraseña son requeridos", 400)
//     }

//     // Buscar usuario
//     const users = readData("users")
//     const user = users.find((u) => u.email === email)

//     if (!user) {
//       return sendError(res, "Credenciales inválidas", 401)
//     }

//     // Verificar contraseña
//     const isMatch = await bcrypt.compare(password, user.password)
//     if (!isMatch) {
//       return sendError(res, "Credenciales inválidas", 401)
//     }

//     // Verificar estado
//     if (user.estado !== "activo") {
//       return sendError(res, "Tu cuenta está desactivada. Contacta al administrador.", 403)
//     }

//     // Obtener rol
//     const roles = readData("roles")
//     const role = roles.find((r) => r.id === user.rolId)

//     // Generar token JWT
//     const token = generateJWT({
//       id: user.id,
//       email: user.email,
//       role: role.nombre,
//     })

//     // Actualizar último login
//     const updatedUsers = users.map((u) => {
//       if (u.id === user.id) {
//         return {
//           ...u,
//           ultimoLogin: new Date().toISOString(),
//           updatedAt: new Date().toISOString(),
//         }
//       }
//       return u
//     })

//     writeData("users", updatedUsers)

//     // Eliminar datos sensibles
//     const { password: _, tokenVerificacion: __, tokenExpiracion: ___, ...userData } = user

//     return sendResponse(res, { token, user: { ...userData, rol: role } }, "Login exitoso")
//   } catch (error) {
//     console.error("Error en login:", error)
//     return sendError(res, "Error en el servidor", 500)
//   }
// })

// Obtener usuario actual
router.get("/me", authenticate, getCurrentUser)

export default router
