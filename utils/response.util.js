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
