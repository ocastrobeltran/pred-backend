import jwt from "jsonwebtoken"
import { query } from "../config/database.js"
import { sendError } from "../utils/response.util.js"

// Middleware para autenticar usuarios
export const authenticate = async (req, res, next) => {
  try {
    // Obtener token del header
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(res, "Acceso denegado. Token no proporcionado", 401)
    }

    const token = authHeader.split(" ")[1]

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Verificar si el usuario existe y está activo
    const userQuery = await query(
      `
      SELECT u.id, u.email, u.estado, r.nombre as rol
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      WHERE u.id = $1
    `,
      [decoded.id],
    )

    if (userQuery.rows.length === 0) {
      return sendError(res, "Usuario no encontrado", 401)
    }

    const user = userQuery.rows[0]

    if (user.estado !== "activo") {
      return sendError(res, "Usuario inactivo", 403)
    }

    // Añadir usuario al request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.rol,
    }

    next()
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return sendError(res, "Token inválido o expirado", 401)
    }

    console.error("Error en authenticate middleware:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

// Middleware para verificar rol de administrador
export const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return sendError(res, "Acceso denegado. Se requiere rol de administrador", 403)
  }

  next()
}

// Middleware para verificar rol de supervisor o administrador
export const isSupervisorOrAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "supervisor")) {
    return sendError(res, "Acceso denegado. Se requiere rol de supervisor o administrador", 403)
  }

  next()
}
