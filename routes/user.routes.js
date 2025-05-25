import express from "express"
import bcrypt from "bcrypt"
import { readData, writeData } from "../utils/database.js"
import { sendResponse, sendError } from "../utils/response.util.js"
import { authenticate, isAdmin } from "../middlewares/auth.middleware.js"
import { validate, validateParams } from "../middlewares/validation.middleware.js"
import { userSchema, userUpdateSchema, userIdSchema } from "../utils/validation.util.js"

const router = express.Router()

// Rutas protegidas por admin
router.get("/", authenticate, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, rol_id, estado, search } = req.query
    const pageNumber = Number.parseInt(page)
    const limitNumber = Number.parseInt(limit)

    // Obtener datos
    const users = readData("users")
    const roles = readData("roles")

    // Aplicar filtros
    let filteredUsers = [...users]

    if (rol_id) {
      filteredUsers = filteredUsers.filter((u) => u.rolId === Number.parseInt(rol_id))
    }

    if (estado) {
      filteredUsers = filteredUsers.filter((u) => u.estado === estado)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      filteredUsers = filteredUsers.filter(
        (u) =>
          u.nombre.toLowerCase().includes(searchLower) ||
          u.apellido.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower) ||
          u.cedula.includes(searchLower),
      )
    }

    // Calcular paginación
    const total = filteredUsers.length
    const startIndex = (pageNumber - 1) * limitNumber
    const endIndex = startIndex + limitNumber
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

    // Formatear datos para la respuesta
    const formattedUsers = paginatedUsers.map((user) => {
      const role = roles.find((r) => r.id === user.rolId)

      // Eliminar datos sensibles
      const { password, tokenVerificacion, tokenExpiracion, ...userData } = user

      return {
        ...userData,
        rol: role
          ? {
              id: role.id,
              nombre: role.nombre,
            }
          : null,
      }
    })

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
})

router.post("/", authenticate, isAdmin, validate(userSchema), async (req, res) => {
  try {
    const { nombre, apellido, email, password, cedula, telefono, direccion, rol_id, estado } = req.body

    // Validar datos requeridos
    if (!nombre || !apellido || !email || !password || !cedula || !rol_id) {
      return sendError(res, "Faltan campos requeridos", 400)
    }

    // Obtener datos
    const users = readData("users")

    // Verificar si el usuario ya existe
    const existingUser = users.find((u) => u.email === email || u.cedula === cedula)

    if (existingUser) {
      return sendError(res, "El usuario ya existe con ese email o cédula", 400)
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Crear nuevo usuario
    const newUser = {
      id: users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1,
      nombre,
      apellido,
      email,
      password: hashedPassword,
      cedula,
      telefono,
      direccion,
      rolId: Number.parseInt(rol_id),
      estado: estado || "activo",
      tokenVerificacion: null,
      tokenExpiracion: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Guardar usuario
    users.push(newUser)
    writeData("users", users)

    // Eliminar datos sensibles
    const { password: _, tokenVerificacion: __, tokenExpiracion: ___, ...userData } = newUser

    return sendResponse(res, userData, "Usuario creado exitosamente")
  } catch (error) {
    console.error("Error en createUser:", error)
    return sendError(res, "Error en el servidor", 500)
  }
})

router.delete("/:id", authenticate, isAdmin, validateParams(userIdSchema), (req, res) => {
  try {
    const { id } = req.params
    const userId = Number.parseInt(id)

    // Obtener datos
    const users = readData("users")

    // Buscar usuario
    const userIndex = users.findIndex((u) => u.id === userId)

    if (userIndex === -1) {
      return sendError(res, "Usuario no encontrado", 404)
    }

    // Eliminar usuario
    users.splice(userIndex, 1)
    writeData("users", users)

    return sendResponse(res, null, "Usuario eliminado exitosamente")
  } catch (error) {
    console.error("Error en deleteUser:", error)
    return sendError(res, "Error en el servidor", 500)
  }
})

// Rutas protegidas por usuario o admin
router.get("/:id", authenticate, validateParams(userIdSchema), async (req, res) => {
  try {
    const { id } = req.params
    const userId = Number.parseInt(id)
    const currentUserId = req.user.id
    const userRole = req.user.role

    // Verificar permisos
    if (userId !== currentUserId && userRole !== "admin") {
      return sendError(res, "No tienes permiso para ver este usuario", 403)
    }

    // Obtener datos
    const users = readData("users")
    const roles = readData("roles")

    // Buscar usuario
    const user = users.find((u) => u.id === userId)

    if (!user) {
      return sendError(res, "Usuario no encontrado", 404)
    }

    // Obtener rol
    const role = roles.find((r) => r.id === user.rolId)

    // Eliminar datos sensibles
    const { password, tokenVerificacion, tokenExpiracion, ...userData } = user

    return sendResponse(
      res,
      {
        ...userData,
        rol: role
          ? {
              id: role.id,
              nombre: role.nombre,
            }
          : null,
      },
      "Usuario obtenido exitosamente",
    )
  } catch (error) {
    console.error("Error en getUserById:", error)
    return sendError(res, "Error en el servidor", 500)
  }
})

router.put("/:id", authenticate, validateParams(userIdSchema), validate(userUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params
    const userId = Number.parseInt(id)
    const currentUserId = req.user.id
    const userRole = req.user.role

    // Verificar permisos
    if (userId !== currentUserId && userRole !== "admin") {
      return sendError(res, "No tienes permiso para actualizar este usuario", 403)
    }

    // Obtener datos
    const users = readData("users")

    // Buscar usuario
    const userIndex = users.findIndex((u) => u.id === userId)

    if (userIndex === -1) {
      return sendError(res, "Usuario no encontrado", 404)
    }

    // Verificar si se está actualizando el email o cédula
    if (req.body.email && req.body.email !== users[userIndex].email) {
      const emailExists = users.some((u) => u.id !== userId && u.email === req.body.email)
      if (emailExists) {
        return sendError(res, "El email ya está en uso", 400)
      }
    }

    if (req.body.cedula && req.body.cedula !== users[userIndex].cedula) {
      const cedulaExists = users.some((u) => u.id !== userId && u.cedula === req.body.cedula)
      if (cedulaExists) {
        return sendError(res, "La cédula ya está en uso", 400)
      }
    }

    // Actualizar usuario
    const updatedUser = {
      ...users[userIndex],
      ...req.body,
      rolId: req.body.rol_id ? Number.parseInt(req.body.rol_id) : users[userIndex].rolId,
      updatedAt: new Date().toISOString(),
    }

    // No actualizar contraseña aquí
    delete updatedUser.password

    users[userIndex] = updatedUser
    writeData("users", users)

    // Eliminar datos sensibles
    const { password, tokenVerificacion, tokenExpiracion, ...userData } = updatedUser

    return sendResponse(res, userData, "Usuario actualizado exitosamente")
  } catch (error) {
    console.error("Error en updateUser:", error)
    return sendError(res, "Error en el servidor", 500)
  }
})

// Cambiar contraseña
router.put("/cambiar-password", authenticate, async (req, res) => {
  try {
    const { current_password, password } = req.body
    const userId = req.user.id

    // Validar datos requeridos
    if (!current_password || !password) {
      return sendError(res, "Contraseña actual y nueva son requeridas", 400)
    }

    // Obtener datos
    const users = readData("users")

    // Buscar usuario
    const userIndex = users.findIndex((u) => u.id === userId)

    if (userIndex === -1) {
      return sendError(res, "Usuario no encontrado", 404)
    }

    // Verificar contraseña actual
    const isMatch = await bcrypt.compare(current_password, users[userIndex].password)
    if (!isMatch) {
      return sendError(res, "Contraseña actual incorrecta", 400)
    }

    // Encriptar nueva contraseña
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Actualizar contraseña
    users[userIndex].password = hashedPassword
    users[userIndex].updatedAt = new Date().toISOString()

    writeData("users", users)

    return sendResponse(res, null, "Contraseña actualizada exitosamente")
  } catch (error) {
    console.error("Error en changePassword:", error)
    return sendError(res, "Error en el servidor", 500)
  }
})

// Rutas para obtener roles
router.get("/roles", authenticate, async (req, res) => {
  try {
    const roles = readData("roles")
    return sendResponse(res, roles, "Roles obtenidos exitosamente")
  } catch (error) {
    console.error("Error en getRoles:", error)
    return sendError(res, "Error en el servidor", 500)
  }
})

export default router
