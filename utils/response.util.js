export const sendResponse = (res, data, message = "Operación exitosa", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  })
}

export const sendError = (res, message = "Error en la operación", statusCode = 400, errors = null) => {
  const response = {
    success: false,
    message,
  }

  if (errors) {
    response.errors = errors
  }

  return res.status(statusCode).json(response)
}

// Función auxiliar para formatear datos de usuario (eliminar campos sensibles)
export const formatUserData = (user) => {
  if (!user) return null

  const { password, token_verificacion, token_expiracion, ...userData } = user
  return userData
}

// Función auxiliar para formatear arrays de objetos
export const formatArrayResponse = (items, formatFunction = null) => {
  if (!Array.isArray(items)) return []

  return items.map((item) => {
    if (formatFunction && typeof formatFunction === "function") {
      return formatFunction(item)
    }
    return item
  })
}
