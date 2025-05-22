import bcrypt from "bcrypt"
import { query } from "../config/database.js"
import { sendResponse, sendError } from "../utils/response.util.js"
import { sendEmail, getEmailTemplate } from "../utils/email.util.js"

export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, rol_id, estado, search } = req.query
    const pageNumber = Number.parseInt(page)
    const limitNumber = Number.parseInt(limit)
    const offset = (pageNumber - 1) * limitNumber

    // Construir la consulta base
    let queryText = `
      SELECT u.*, r.nombre as rol_nombre
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      WHERE 1=1
    `

    const queryParams = []
    let paramIndex = 1

    // Añadir filtros
    if (rol_id) {
      queryText += ` AND u.rol_id = $${paramIndex++}`
      queryParams.push(Number.parseInt(rol_id))
    }

    if (estado) {
      queryText += ` AND u.estado = $${paramIndex++}`
      queryParams.push(estado)
    }

    if (search) {
      queryText += ` AND (u.nombre ILIKE $${paramIndex} OR u.apellido ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.cedula ILIKE $${paramIndex})`
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    // Añadir ordenamiento
    queryText += ` ORDER BY u.id DESC`

    // Consulta para contar el total de registros
    const countQuery = `SELECT COUNT(*) FROM (${queryText}) AS count_query`

    // Añadir paginación
    queryText += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    queryParams.push(limitNumber, offset)

    // Ejecutar consultas
    const [usersResult, countResult] = await Promise.all([
      query(queryText, queryParams),
      query(countQuery, queryParams.slice(0, -2)), // Excluir los parámetros de LIMIT y OFFSET
    ])

    const users = usersResult.rows
    const total = Number.parseInt(countResult.rows[0].count)

    // Formatear datos para la respuesta
    const formattedUsers = users.map((user) => ({
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      cedula: user.cedula,
      telefono: user.telefono,
      direccion: user.direccion,
      rol_id: user.rol_id,
      rol_nombre: user.rol_nombre,
      estado: user.estado,
      ultimo_login: user.ultimo_login,
      created_at: user.created_at,
    }))

    return sendResponse(
      res,
      {
        data: formattedUsers,
        pagination: {
          total,
          per_page: limitNumber,
          current_page: pageNumber,
          last_page: Math.ceil(total / limitNumber),
        },
      },
      "Usuarios obtenidos exitosamente",
    )
  } catch (error) {
    console.error("Error en getAllUsers:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params

    // Verificar permisos (solo el propio usuario o un administrador puede ver los detalles)
    if (req.user.id !== Number.parseInt(id) && req.user.role !== "admin") {
      return sendError(res, "No tienes permisos para realizar esta acción", 403)
    }

    // Buscar usuario
    const userQuery = await query(
      `
      SELECT u.*, r.nombre as rol_nombre
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      WHERE u.id = $1
    `,
      [Number.parseInt(id)],
    )

    if (userQuery.rows.length === 0) {
      return sendError(res, "Usuario no encontrado", 404)
    }

    const user = userQuery.rows[0]

    // Formatear datos para la respuesta
    const userData = {
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      cedula: user.cedula,
      telefono: user.telefono,
      direccion: user.direccion,
      rol_id: user.rol_id,
      rol_nombre: user.rol_nombre,
      estado: user.estado,
      ultimo_login: user.ultimo_login,
      created_at: user.created_at,
      updated_at: user.updated_at,
    }

    return sendResponse(res, userData, "Usuario obtenido exitosamente")
  } catch (error) {
    console.error("Error en getUserById:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

export const createUser = async (req, res) => {
  try {
    const { nombre, apellido, email, password, cedula, telefono, direccion, rol_id } = req.body

    // Validar datos
    const requiredFields = ["nombre", "apellido", "email", "password", "rol_id"]
    const missingFields = requiredFields.filter((field) => !req.body[field])

    if (missingFields.length > 0) {
      return sendError(
        res,
        "Datos incompletos",
        400,
        missingFields.map((field) => `El campo ${field} es requerido`),
      )
    }

    // Verificar si el correo ya está registrado
    const existingUserQuery = await query(
      `
      SELECT id FROM usuarios WHERE email = $1
    `,
      [email],
    )

    if (existingUserQuery.rows.length > 0) {
      return sendError(res, "El correo electrónico ya está registrado", 400)
    }

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
        cedula || "",
        telefono || "",
        direccion || "",
        Number.parseInt(rol_id),
        "activo",
      ],
    )

    const newUserId = newUserQuery.rows[0].id

    // Enviar email de bienvenida
    const emailTemplate = getEmailTemplate("account_activated", { nombre })
    await sendEmail(email, emailTemplate.subject, emailTemplate.html)

    return sendResponse(res, { user_id: newUserId }, "Usuario creado exitosamente")
  } catch (error) {
    console.error("Error en createUser:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params
    const { nombre, apellido, email, password, cedula, telefono, direccion, rol_id, estado } = req.body

    // Verificar permisos (solo el propio usuario o un administrador puede actualizar)
    if (req.user.id !== Number.parseInt(id) && req.user.role !== "admin") {
      return sendError(res, "No tienes permisos para realizar esta acción", 403)
    }

    // Verificar si el usuario existe
    const existingUserQuery = await query(
      `
      SELECT id FROM usuarios WHERE id = $1
    `,
      [Number.parseInt(id)],
    )

    if (existingUserQuery.rows.length === 0) {
      return sendError(res, "Usuario no encontrado", 404)
    }

    // Preparar datos para actualizar
    const updateFields = []
    const updateValues = []
    let paramIndex = 1

    if (nombre) {
      updateFields.push(`nombre = $${paramIndex++}`)
      updateValues.push(nombre)
    }

    if (apellido) {
      updateFields.push(`apellido = $${paramIndex++}`)
      updateValues.push(apellido)
    }

    if (cedula) {
      updateFields.push(`cedula = $${paramIndex++}`)
      updateValues.push(cedula)
    }

    if (telefono) {
      updateFields.push(`telefono = $${paramIndex++}`)
      updateValues.push(telefono)
    }

    if (direccion) {
      updateFields.push(`direccion = $${paramIndex++}`)
      updateValues.push(direccion)
    }

    // Solo el administrador puede cambiar estos campos
    if (req.user.role === "admin") {
      if (email) {
        updateFields.push(`email = $${paramIndex++}`)
        updateValues.push(email)
      }

      if (rol_id) {
        updateFields.push(`rol_id = $${paramIndex++}`)
        updateValues.push(Number.parseInt(rol_id))
      }

      if (estado) {
        updateFields.push(`estado = $${paramIndex++}`)
        updateValues.push(estado)
      }
    }

    // Si se proporciona una nueva contraseña, hashearla
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10)
      updateFields.push(`password = $${paramIndex++}`)
      updateValues.push(hashedPassword)
    }

    // Añadir updated_at
    updateFields.push(`updated_at = $${paramIndex++}`)
    updateValues.push(new Date())

    if (updateFields.length === 0) {
      return sendError(res, "No se proporcionaron datos para actualizar", 400)
    }

    // Añadir el ID al final
    updateValues.push(Number.parseInt(id))

    // Actualizar usuario
    await query(
      `
      UPDATE usuarios
      SET ${updateFields.join(", ")}
      WHERE id = $${paramIndex}
    `,
      updateValues,
    )

    return sendResponse(res, null, "Usuario actualizado exitosamente")
  } catch (error) {
    console.error("Error en updateUser:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params

    // Verificar si el usuario existe
    const existingUserQuery = await query(
      `
      SELECT id FROM usuarios WHERE id = $1
    `,
      [Number.parseInt(id)],
    )

    if (existingUserQuery.rows.length === 0) {
      return sendError(res, "Usuario no encontrado", 404)
    }

    // Verificar si hay solicitudes asociadas
    const solicitudesQuery = await query(
      `
      SELECT id FROM solicitudes WHERE usuario_id = $1 LIMIT 1
    `,
      [Number.parseInt(id)],
    )

    if (solicitudesQuery.rows.length > 0) {
      return sendError(res, "No se puede eliminar el usuario porque tiene solicitudes asociadas", 400)
    }

    // Eliminar notificaciones del usuario
    await query(
      `
      DELETE FROM notificaciones WHERE usuario_id = $1
    `,
      [Number.parseInt(id)],
    )

    // Eliminar usuario
    await query(
      `
      DELETE FROM usuarios WHERE id = $1
    `,
      [Number.parseInt(id)],
    )

    return sendResponse(res, null, "Usuario eliminado exitosamente")
  } catch (error) {
    console.error("Error en deleteUser:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

export const getRoles = async (req, res) => {
  try {
    const rolesQuery = await query(`
      SELECT id, nombre, descripcion
      FROM roles
      ORDER BY id ASC
    `)

    return sendResponse(res, rolesQuery.rows, "Roles obtenidos exitosamente")
  } catch (error) {
    console.error("Error en getRoles:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}
