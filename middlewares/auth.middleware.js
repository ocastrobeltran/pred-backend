import jwt from "jsonwebtoken"
import { query } from "../config/database.js"

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Token de acceso requerido",
      })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Obtener información actualizada del usuario
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
      return res.status(401).json({
        success: false,
        message: "Usuario no encontrado",
      })
    }

    const user = userQuery.rows[0]

    if (user.estado !== "activo") {
      return res.status(401).json({
        success: false,
        message: "Usuario inactivo",
      })
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.rol,
    }

    console.log("🔐 Usuario autenticado:", req.user)
    next()
  } catch (error) {
    console.error("Error en autenticación:", error)
    return res.status(401).json({
      success: false,
      message: "Token inválido",
    })
  }
}

export const isSupervisorOrAdmin = (req, res, next) => {
  console.log("🔍 Verificando permisos de supervisor/admin para usuario:", req.user)

  // ✅ CORRECCIÓN: Verificar múltiples variantes del rol de administrador
  const userRole = req.user.role?.toLowerCase()
  const allowedRoles = ["admin", "administrador", "supervisor"]

  console.log("🔍 Rol del usuario:", userRole)
  console.log("🔍 Roles permitidos:", allowedRoles)

  if (!allowedRoles.includes(userRole)) {
    console.log("❌ Acceso denegado - Rol no autorizado:", userRole)
    return res.status(403).json({
      success: false,
      message: "No tienes permisos para realizar esta acción",
    })
  }

  console.log("✅ Acceso autorizado para rol:", userRole)
  next()
}

export const isAdmin = (req, res, next) => {
  console.log("🔍 Verificando permisos de admin para usuario:", req.user)

  // ✅ CORRECCIÓN: Verificar múltiples variantes del rol de administrador
  const userRole = req.user.role?.toLowerCase()
  const allowedRoles = ["admin", "administrador"]

  console.log("🔍 Rol del usuario:", userRole)
  console.log("🔍 Roles permitidos:", allowedRoles)

  if (!allowedRoles.includes(userRole)) {
    console.log("❌ Acceso denegado - Rol no autorizado:", userRole)
    return res.status(403).json({
      success: false,
      message: "Solo los administradores pueden realizar esta acción",
    })
  }

  console.log("✅ Acceso autorizado para admin:", userRole)
  next()
}
