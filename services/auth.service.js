import bcrypt from "bcrypt"
import { query } from "../config/database.js"
import { generateToken, generateRefreshToken, verifyToken } from "../utils/jwt.util.js"

// Servicio para autenticar un usuario
export const authenticateUser = async (email, password) => {
  try {
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

    // Verificar si el usuario existe
    if (userQuery.rows.length === 0) {
      return { success: false, message: "Credenciales inválidas" }
    }

    const user = userQuery.rows[0]

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return { success: false, message: "Credenciales inválidas" }
    }

    // Verificar estado del usuario
    if (user.estado !== "activo") {
      return { success: false, message: "Usuario inactivo o pendiente de activación" }
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

    // Generar tokens
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.rol_nombre,
    })

    const refreshToken = generateRefreshToken({
      id: user.id,
    })

    // Preparar datos del usuario
    const userData = {
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      rol: user.rol_nombre,
      rol_id: user.rol_id,
    }

    return {
      success: true,
      data: {
        token,
        refresh_token: refreshToken,
        user: userData,
      },
    }
  } catch (error) {
    console.error("Error en authenticateUser:", error)
    return { success: false, message: "Error en el servidor" }
  }
}

// Servicio para registrar un nuevo usuario
export const registerUser = async (userData) => {
  try {
    const { nombre, apellido, email, password, cedula, telefono, direccion } = userData

    // Verificar si el correo ya está registrado
    const existingUserQuery = await query(
      `
      SELECT id FROM usuarios
      WHERE email = $1
    `,
      [email],
    )

    if (existingUserQuery.rows.length > 0) {
      return { success: false, message: "El correo electrónico ya está registrado" }
    }

    // Obtener rol de usuario
    const userRoleQuery = await query(`
      SELECT id FROM roles WHERE nombre = 'usuario'
    `)

    if (userRoleQuery.rows.length === 0) {
      return { success: false, message: "Error al asignar rol de usuario" }
    }

    const userRoleId = userRoleQuery.rows[0].id

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10)

    // Crear usuario
    const newUserQuery = await query(
      `
      INSERT INTO usuarios (
        nombre, apellido, email, password, cedula, telefono, direccion,
        rol_id, estado, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING id
    `,
      [
        nombre,
        apellido,
        email,
        hashedPassword,
        cedula,
        telefono,
        direccion || "",
        userRoleId,
        "activo", // Cambiado a activo para simplificar
      ],
    )

    return {
      success: true,
      data: { user_id: newUserQuery.rows[0].id },
    }
  } catch (error) {
    console.error("Error en registerUser:", error)
    return { success: false, message: "Error en el servidor" }
  }
}

// Servicio para renovar el token
export const refreshUserToken = async (refreshToken) => {
  try {
    // Verificar refresh token
    const decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET)

    // Buscar usuario
    const userQuery = await query(
      `
      SELECT u.*, r.nombre as rol_nombre
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      WHERE u.id = $1
    `,
      [decoded.id],
    )

    if (userQuery.rows.length === 0) {
      return { success: false, message: "Usuario no encontrado" }
    }

    const user = userQuery.rows[0]

    // Generar nuevo token
    const newToken = generateToken({
      id: user.id,
      email: user.email,
      role: user.rol_nombre,
    })

    return {
      success: true,
      data: { token: newToken },
    }
  } catch (error) {
    console.error("Error en refreshUserToken:", error)

    if (error.name === "TokenExpiredError") {
      return { success: false, message: "Refresh token expirado" }
    }

    return { success: false, message: "Refresh token inválido" }
  }
}

// Servicio para obtener información del usuario actual
export const getCurrentUser = async (userId) => {
  try {
    // Buscar usuario
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
      return { success: false, message: "Usuario no encontrado" }
    }

    const user = userQuery.rows[0]

    // Preparar datos del usuario
    const userData = {
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      cedula: user.cedula,
      telefono: user.telefono,
      direccion: user.direccion,
      rol: user.rol_nombre,
      rol_id: user.rol_id,
      estado: user.estado,
      ultimo_login: user.ultimo_login,
    }

    return {
      success: true,
      data: userData,
    }
  } catch (error) {
    console.error("Error en getCurrentUser:", error)
    return { success: false, message: "Error en el servidor" }
  }
}
