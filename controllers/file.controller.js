import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import multer from "multer"
import { sendResponse, sendError } from "../utils/response.util.js"

// Obtener el directorio actual
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configurar directorio de uploads
const uploadDir = path.join(__dirname, "../uploads")
const imagesDir = path.join(uploadDir, "images")

// Crear directorios si no existen
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true })
}

// Configurar multer para la subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determinar el directorio según el tipo de archivo
    let destDir = imagesDir

    if (file.mimetype.startsWith("image/")) {
      destDir = imagesDir
    }

    cb(null, destDir)
  },
  filename: (req, file, cb) => {
    // Generar nombre único para el archivo
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, uniqueSuffix + ext)
  },
})

// Filtro para tipos de archivos permitidos
const fileFilter = (req, file, cb) => {
  // Permitir solo imágenes
  if (file.mimetype.startsWith("image/")) {
    cb(null, true)
  } else {
    cb(new Error("Tipo de archivo no permitido. Solo se permiten imágenes."), false)
  }
}

// Configurar multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
})

export const uploadFile = (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, "No se proporcionó ningún archivo", 400)
    }

    // Construir URL del archivo
    const baseUrl = `${req.protocol}://${req.get("host")}`
    const filePath = req.file.path.replace(/\\/g, "/").split("uploads/")[1]
    const fileUrl = `${baseUrl}/uploads/${filePath}`

    return sendResponse(
      res,
      {
        file_name: req.file.filename,
        file_url: fileUrl,
        file_path: filePath,
      },
      "Archivo subido exitosamente",
    )
  } catch (error) {
    console.error("Error en uploadFile:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

export const deleteFile = (req, res) => {
  try {
    const { file_path } = req.body

    if (!file_path) {
      return sendError(res, "Ruta de archivo no proporcionada", 400)
    }

    const fullPath = path.join(uploadDir, file_path)

    // Verificar si el archivo existe
    if (!fs.existsSync(fullPath)) {
      return sendError(res, "Archivo no encontrado", 404)
    }

    // Eliminar archivo
    fs.unlinkSync(fullPath)

    return sendResponse(res, null, "Archivo eliminado exitosamente")
  } catch (error) {
    console.error("Error en deleteFile:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}
