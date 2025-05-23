import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import crypto from "crypto"

dotenv.config()

// Generar token JWT
export const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || "your_secret_key", {
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  })
}

// Generar refresh token
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || "your_refresh_secret_key", {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  })
}

// Verificar token
export const verifyToken = (token, secret = process.env.JWT_SECRET) => {
  try {
    return jwt.verify(token, secret)
  } catch (error) {
    throw error
  }
}

// Decodificar token sin verificar
export const decodeToken = (token) => {
  return jwt.decode(token)
}

// Extraer token de los headers
export const extractTokenFromHeaders = (headers) => {
  const authHeader = headers.authorization

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }

  return authHeader.split(" ")[1]
}

// Generar token para reseteo de contraseña
export const generatePasswordResetToken = (userId) => {
  return jwt.sign({ user_id: userId, purpose: "password_reset" }, process.env.JWT_SECRET || "your_secret_key", {
    expiresIn: "1h",
  })
}

// Verificar token de reseteo de contraseña
export const verifyPasswordResetToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    if (decoded.purpose !== "password_reset") {
      throw new Error("Token inválido")
    }

    return decoded
  } catch (error) {
    throw error
  }
}

// Generar token aleatorio
export const generateToken32 = (length = 32) => {
  return crypto.randomBytes(length).toString("hex")
}
