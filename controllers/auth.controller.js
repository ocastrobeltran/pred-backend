import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { query } from "../config/database.js"
import { sendResponse, sendError, formatUserData } from "../utils/response.util.js"

// Registro de usuario
export const register = async (req, res) => {
  try {
    const { nombre, apellido, email, password, cedula, telefono, direccion } = req.body

    // Verificar si el usuario ya existe
    const existingUserQuery = await query(
      `
      SELECT id FROM usuarios 
      WHERE email = $1 OR cedula = $2
    `,
      [email, cedula],
    )

    if (existingUserQuery.rows.length > 0) {
      return sendError(res, "El usuario ya existe con ese email o cédula", 400)
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Obtener rol de usuario (por defecto, rol de usuario normal)
    const userRoleQuery = await query(`
      SELECT id FROM roles WHERE nombre = 'usuario'
    `)

    if (userRoleQuery.rows.length === 0) {
      return sendError(res, "Error al asignar rol de usuario", 500)
    }

    const userRoleId = userRoleQuery.rows[0].id

    // Crear usuario - Ahora con estado "activo" directamente
    const userQuery = await query(
      `
      INSERT INTO usuarios (
        nombre, apellido, email, password, cedula, telefono, direccion,
        rol_id, estado, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING id, nombre, apellido, email, cedula, telefono, direccion, rol_id, estado, created_at
    `,
      [nombre, apellido, email, hashedPassword, cedula, telefono, direccion || "", userRoleId, "activo"],
    )

    const user = userQuery.rows[0]

    // Generar token JWT
    const token = jwt.sign({ id: user.id, email: user.email, role: "usuario" }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    })

    // Formatear datos del usuario para la respuesta
    const userData = formatUserData(user)

    return sendResponse(
      res,
      {
        token,
        user: {
          ...userData,
          rol_nombre: "usuario",
        },
      },
      "Usuario registrado exitosamente.",
    )
  } catch (error) {
    console.error("Error en register:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

// Login de usuario
export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    // Buscar usuario por email
    const userQuery = await query(
      `
      SELECT u.*, r.nombre as rol_nombre
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      WHERE u.email = $1
    `,
      [email],
    )

    if (userQuery.rows.length === 0) {
      return sendError(res, "Credenciales inválidas", 401)
    }

    const user = userQuery.rows[0]

    // Verificar contraseña
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return sendError(res, "Credenciales inválidas", 401)
    }

    // Verificar si el usuario está activo
    if (user.estado === "inactivo") {
      return sendError(res, "Tu cuenta está desactivada. Contacta al administrador.", 403)
    }

    // Actualizar último login
    await query(
      `
      UPDATE usuarios
      SET ultimo_login = NOW()
      WHERE id = $1
    `,
      [user.id],
    )

    // Generar token JWT
    const token = jwt.sign({ id: user.id, email: user.email, role: user.rol_nombre }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    })

    // Formatear datos del usuario para la respuesta
    const userData = formatUserData(user)

    return sendResponse(
      res,
      {
        token,
        user: userData,
      },
      "Login exitoso",
    )
  } catch (error) {
    console.error("Error en login:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

// Obtener usuario actual
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id

    const userQuery = await query(
      `
      SELECT u.*, r.nombre as rol_nombre
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      WHERE u.id = $1
    `,
      [userId],
    )

    if (userQuery.rows.length === 0) {
      return sendError(res, "Usuario no encontrado", 404)
    }

    const user = userQuery.rows[0]

    // Formatear datos del usuario para la respuesta
    const userData = formatUserData(user)

    return sendResponse(res, userData, "Usuario obtenido exitosamente")
  } catch (error) {
    console.error("Error en getCurrentUser:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

// Verificar email
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params

    const userQuery = await query(
      `
      SELECT id
      FROM usuarios
      WHERE token_verificacion = $1
      AND token_expiracion > NOW()
    `,
      [token],
    )

    if (userQuery.rows.length === 0) {
      return sendError(res, "Token inválido o expirado", 400)
    }

    const userId = userQuery.rows[0].id

    // Actualizar estado del usuario
    await query(
      `
      UPDATE usuarios
      SET estado = 'activo', token_verificacion = NULL, token_expiracion = NULL
      WHERE id = $1
    `,
      [userId],
    )

    return sendResponse(res, null, "Email verificado exitosamente. Ahora puedes iniciar sesión.")
  } catch (error) {
    console.error("Error en verifyEmail:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

// Solicitar restablecimiento de contraseña
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body

    const userQuery = await query(
      `
      SELECT id, nombre
      FROM usuarios
      WHERE email = $1
    `,
      [email],
    )

    if (userQuery.rows.length === 0) {
      return sendError(res, "No existe un usuario con ese email", 404)
    }

    // Como no podemos enviar emails, simplemente informamos al usuario que contacte al administrador
    return sendResponse(res, null, "Por favor, contacta al administrador para restablecer tu contraseña.")
  } catch (error) {
    console.error("Error en requestPasswordReset:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

// Restablecer contraseña
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body

    const userQuery = await query(
      `
      SELECT id
      FROM usuarios
      WHERE token_verificacion = $1
      AND token_expiracion > NOW()
    `,
      [token],
    )

    if (userQuery.rows.length === 0) {
      return sendError(res, "Token inválido o expirado", 400)
    }

    const userId = userQuery.rows[0].id

    // Encriptar nueva contraseña
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Actualizar contraseña
    await query(
      `
      UPDATE usuarios
      SET password = $1, token_verificacion = NULL, token_expiracion = NULL
      WHERE id = $2
    `,
      [hashedPassword, userId],
    )

    return sendResponse(res, null, "Contraseña restablecida exitosamente")
  } catch (error) {
    console.error("Error en resetPassword:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}
