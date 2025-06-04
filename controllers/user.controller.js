import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { query } from "../config/database.js"
import { sendResponse, sendError } from "../utils/response.util.js"

// Obtener todos los usuarios (solo admin)
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, rol_id, estado } = req.query
    const offset = (page - 1) * limit

    const whereConditions = []
    const queryParams = []
    let paramIndex = 1

    // Filtros
    if (search) {
      whereConditions.push(
        `(u.nombre ILIKE $${paramIndex} OR u.apellido ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.cedula ILIKE $${paramIndex})`,
      )
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    if (rol_id) {
      whereConditions.push(`u.rol_id = $${paramIndex}`)
      queryParams.push(rol_id)
      paramIndex++
    }

    if (estado) {
      whereConditions.push(`u.estado = $${paramIndex}`)
      queryParams.push(estado)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""

    // Query principal
    const queryText = `
      SELECT u.*, r.nombre as rol_nombre
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      ${whereClause}
      ORDER BY u.id DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    queryParams.push(limit, offset)

    console.log("Query usuarios:", queryText)
    console.log("Params:", queryParams)

    const result = await query(queryText, queryParams)

    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) FROM (
        SELECT u.id
        FROM usuarios u
        JOIN roles r ON u.rol_id = r.id
        ${whereClause}
      ) AS count_query
    `

    const countResult = await query(countQuery, queryParams.slice(0, -2))
    const total = Number.parseInt(countResult.rows[0].count)

    // Transformar datos
    const usuarios = result.rows.map((user) => ({
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      cedula: user.cedula,
      telefono: user.telefono,
      direccion: user.direccion,
      rol_id: user.rol_id,
      rol: {
        nombre: user.rol_nombre,
      },
      estado: user.estado,
      created_at: user.created_at,
      updated_at: user.updated_at,
    }))

    console.log(`📊 Usuarios encontrados: ${usuarios.length} de ${total} total`)

    res.json({
      success: true,
      message: "Usuarios obtenidos exitosamente",
      data: {
        data: usuarios,
        pagination: {
          current_page: Number.parseInt(page),
          last_page: Math.ceil(total / limit),
          per_page: Number.parseInt(limit),
          total: total,
        },
      },
    })
  } catch (error) {
    console.error("Error al obtener usuarios:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}

// Obtener roles
export const getRoles = async (req, res) => {
  try {
    console.log("🔄 Obteniendo roles...")

    const queryText = `
      SELECT id, nombre, descripcion
      FROM roles
      ORDER BY id ASC
    `

    const result = await query(queryText)

    console.log(`📊 Roles encontrados: ${result.rows.length}`)

    res.json({
      success: true,
      message: "Roles obtenidos exitosamente",
      data: result.rows,
    })
  } catch (error) {
    console.error("💥 Error al obtener roles:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}

// Obtener usuario por ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params

    // Verificar permisos (solo el propio usuario o un administrador puede ver los detalles)
    if (req.user.id !== Number.parseInt(id) && req.user.role !== "admin") {
      return sendError(res, "No tienes permisos para realizar esta acción", 403)
    }

    const queryText = `
      SELECT u.*, r.nombre as rol_nombre
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      WHERE u.id = $1
    `

    const result = await query(queryText, [Number.parseInt(id)])

    if (result.rows.length === 0) {
      return sendError(res, "Usuario no encontrado", 404)
    }

    const user = result.rows[0]
    const userData = {
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      cedula: user.cedula,
      telefono: user.telefono,
      direccion: user.direccion,
      rol_id: user.rol_id,
      rol: {
        nombre: user.rol_nombre,
      },
      estado: user.estado,
      ultimo_login: user.ultimo_login,
      created_at: user.created_at,
      updated_at: user.updated_at,
    }

    return sendResponse(res, userData, "Usuario obtenido exitosamente")
  } catch (error) {
    console.error("Error al obtener usuario:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}

// Crear usuario
export const createUser = async (req, res) => {
  try {
    const { nombre, apellido, email, password, cedula, telefono, direccion, rol_id } = req.body

    console.log("🔄 Creando usuario:", { nombre, apellido, email, rol_id })

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

    // Verificar si la cédula ya está registrada (si se proporciona)
    if (cedula) {
      const existingCedulaQuery = await query(
        `
        SELECT id FROM usuarios WHERE cedula = $1
      `,
        [cedula],
      )

      if (existingCedulaQuery.rows.length > 0) {
        return sendError(res, "La cédula ya está registrada", 400)
      }
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
      RETURNING id, nombre, apellido, email, cedula, telefono, direccion, rol_id, estado, created_at
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

    const newUser = newUserQuery.rows[0]

    console.log("✅ Usuario creado exitosamente:", newUser.id)

    return sendResponse(res, newUser, "Usuario creado exitosamente")
  } catch (error) {
    console.error("💥 Error en createUser:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

// Actualizar usuario
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params
    const { nombre, apellido, email, password, cedula, telefono, direccion, rol_id, estado } = req.body

    console.log("🔄 Actualizando usuario:", id, req.body)

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

    // Verificar email único (si se está cambiando)
    if (email) {
      const emailQuery = await query(
        `
        SELECT id FROM usuarios WHERE email = $1 AND id != $2
      `,
        [email, Number.parseInt(id)],
      )

      if (emailQuery.rows.length > 0) {
        return sendError(res, "El email ya está en uso por otro usuario", 400)
      }
    }

    // Verificar cédula única (si se está cambiando)
    if (cedula) {
      const cedulaQuery = await query(
        `
        SELECT id FROM usuarios WHERE cedula = $1 AND id != $2
      `,
        [cedula, Number.parseInt(id)],
      )

      if (cedulaQuery.rows.length > 0) {
        return sendError(res, "La cédula ya está en uso por otro usuario", 400)
      }
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

    if (cedula !== undefined) {
      updateFields.push(`cedula = $${paramIndex++}`)
      updateValues.push(cedula)
    }

    if (telefono !== undefined) {
      updateFields.push(`telefono = $${paramIndex++}`)
      updateValues.push(telefono)
    }

    if (direccion !== undefined) {
      updateFields.push(`direccion = $${paramIndex++}`)
      updateValues.push(direccion)
    }

    // Solo el administrador puede cambiar estos campos
    if (req.user.role === "admin" || req.user.role === "administrador") {
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

    if (updateFields.length === 1) {
      // Solo updated_at
      return sendError(res, "No se proporcionaron datos para actualizar", 400)
    }

    // Añadir el ID al final
    updateValues.push(Number.parseInt(id))

    // Actualizar usuario
    const updateQuery = `
      UPDATE usuarios
      SET ${updateFields.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING id, nombre, apellido, email, cedula, telefono, direccion, rol_id, estado, updated_at
    `

    const result = await query(updateQuery, updateValues)

    console.log("✅ Usuario actualizado exitosamente:", id)

    return sendResponse(res, result.rows[0], "Usuario actualizado exitosamente")
  } catch (error) {
    console.error("💥 Error en updateUser:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

// Eliminar usuario
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params

    console.log("🔄 Eliminando usuario:", id)

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

    // No permitir eliminar el usuario actual
    if (req.user.id === Number.parseInt(id)) {
      return sendError(res, "No puedes eliminar tu propia cuenta", 400)
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

    console.log("✅ Usuario eliminado exitosamente:", id)

    return sendResponse(res, null, "Usuario eliminado exitosamente")
  } catch (error) {
    console.error("💥 Error en deleteUser:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

// Obtener perfil del usuario actual
export const getProfile = async (req, res) => {
  try {
    const queryText = `
      SELECT u.*, r.nombre as rol_nombre
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      WHERE u.id = $1
    `

    const result = await query(queryText, [req.user.id])

    if (result.rows.length === 0) {
      return sendError(res, "Usuario no encontrado", 404)
    }

    const user = result.rows[0]
    const { password, ...userWithoutPassword } = user

    res.json({
      success: true,
      message: "Perfil obtenido exitosamente",
      data: {
        ...userWithoutPassword,
        rol: {
          nombre: user.rol_nombre,
        },
      },
    })
  } catch (error) {
    console.error("Error al obtener perfil:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}

// Actualizar perfil del usuario actual
export const updateProfile = async (req, res) => {
  try {
    const { nombre, apellido, telefono, direccion } = req.body

    const queryText = `
      UPDATE usuarios 
      SET nombre = COALESCE($1, nombre),
          apellido = COALESCE($2, apellido),
          telefono = COALESCE($3, telefono),
          direccion = COALESCE($4, direccion),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING id, nombre, apellido, email, cedula, telefono, direccion, rol_id, estado, updated_at
    `

    const result = await query(queryText, [nombre, apellido, telefono, direccion, req.user.id])

    res.json({
      success: true,
      message: "Perfil actualizado exitosamente",
      data: result.rows[0],
    })
  } catch (error) {
    console.error("Error al actualizar perfil:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}

// Cambiar contraseña
export const changePassword = async (req, res) => {
  try {
    const { current_password, password } = req.body

    if (!current_password || !password) {
      return res.status(400).json({
        success: false,
        message: "La contraseña actual y la nueva contraseña son requeridas",
      })
    }

    // Obtener usuario actual
    const userResult = await query("SELECT password FROM usuarios WHERE id = $1", [req.user.id])
    const user = userResult.rows[0]

    // Verificar contraseña actual
    const isValidPassword = await bcrypt.compare(current_password, user.password)
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: "La contraseña actual es incorrecta",
      })
    }

    // Encriptar nueva contraseña
    const hashedPassword = await bcrypt.hash(password, 10)

    // Actualizar contraseña
    await query("UPDATE usuarios SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [
      hashedPassword,
      req.user.id,
    ])

    res.json({
      success: true,
      message: "Contraseña cambiada exitosamente",
    })
  } catch (error) {
    console.error("Error al cambiar contraseña:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}

// Registro de usuario
export const register = async (req, res) => {
  try {
    const { nombre, apellido, email, cedula, telefono, direccion, password } = req.body

    // Validar campos requeridos
    if (!nombre || !apellido || !email || !cedula || !password) {
      return res.status(400).json({
        success: false,
        message: "Todos los campos requeridos deben ser proporcionados",
      })
    }

    // Verificar si el email ya existe
    const emailCheck = await query("SELECT id FROM usuarios WHERE email = $1", [email])
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "El email ya está registrado",
      })
    }

    // Verificar si la cédula ya existe
    const cedulaCheck = await query("SELECT id FROM usuarios WHERE cedula = $1", [cedula])
    if (cedulaCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "La cédula ya está registrada",
      })
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10)

    // Insertar usuario con rol de usuario (3)
    const queryText = `
      INSERT INTO usuarios (nombre, apellido, email, cedula, telefono, direccion, rol_id, password, estado)
      VALUES ($1, $2, $3, $4, $5, $6, 3, $7, 'activo')
      RETURNING id, nombre, apellido, email, cedula, telefono, direccion, rol_id, estado, created_at
    `

    const result = await query(queryText, [nombre, apellido, email, cedula, telefono, direccion, hashedPassword])

    res.status(201).json({
      success: true,
      message: "Usuario registrado exitosamente",
      data: result.rows[0],
    })
  } catch (error) {
    console.error("Error al registrar usuario:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}

// Login de usuario
export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email y contraseña son requeridos",
      })
    }

    // Buscar usuario
    const queryText = `
      SELECT u.*, r.nombre as rol_nombre
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      WHERE u.email = $1 AND u.estado = 'activo'
    `

    const result = await query(queryText, [email])

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      })
    }

    const user = result.rows[0]

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      })
    }

    // Generar token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.rol_nombre.toLowerCase(),
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    )

    const { password: _, ...userWithoutPassword } = user

    res.json({
      success: true,
      message: "Login exitoso",
      data: {
        user: {
          ...userWithoutPassword,
          rol: {
            nombre: user.rol_nombre,
          },
        },
        token,
      },
    })
  } catch (error) {
    console.error("Error en login:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}
