import nodemailer from "nodemailer"
import dotenv from "dotenv"

dotenv.config()

// Crear transporter para enviar emails
export const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT === "465",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  })
}

// Verificar configuración de email
export const verifyEmailConfig = async () => {
  try {
    const transporter = createTransporter()
    await transporter.verify()
    console.log("✅ Configuración de email verificada correctamente")
    return true
  } catch (error) {
    console.error("❌ Error en la configuración de email:", error)
    return false
  }
}
