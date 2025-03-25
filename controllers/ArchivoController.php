<?php
namespace App\Controllers;

use App\Utils\ResponseUtil;
use App\Middleware\AuthMiddleware;

class ArchivoController {
    private $upload_dir;
    public $user;
    
    public function __construct() {
        $this->upload_dir = __DIR__ . '/../uploads/';
        
        // Crear directorio de uploads si no existe
        if (!file_exists($this->upload_dir)) {
            mkdir($this->upload_dir, 0755, true);
        }
    }
    
    public function upload() {
        // Verificar método de solicitud
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            ResponseUtil::sendError("Método no permitido", 405);
            return;
        }
        
        // Verificar si se subió un archivo
        if (!isset($_FILES['file'])) {
            ResponseUtil::sendError("No se proporcionó ningún archivo", 400);
            return;
        }
        
        $file = $_FILES['file'];
        
        // Verificar errores de subida
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $error_messages = [
                UPLOAD_ERR_INI_SIZE => 'El archivo excede el tamaño máximo permitido por PHP',
                UPLOAD_ERR_FORM_SIZE => 'El archivo excede el tamaño máximo permitido por el formulario',
                UPLOAD_ERR_PARTIAL => 'El archivo se subió parcialmente',
                UPLOAD_ERR_NO_FILE => 'No se subió ningún archivo',
                UPLOAD_ERR_NO_TMP_DIR => 'Falta la carpeta temporal',
                UPLOAD_ERR_CANT_WRITE => 'No se pudo escribir el archivo en el disco',
                UPLOAD_ERR_EXTENSION => 'Una extensión de PHP detuvo la subida del archivo'
            ];
            
            $error_message = isset($error_messages[$file['error']]) ? $error_messages[$file['error']] : 'Error desconocido';
            ResponseUtil::sendError("Error al subir archivo: " . $error_message, 400);
            return;
        }
        
        // Verificar tipo de archivo (solo imágenes)
        $allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        
        if (!in_array($file['type'], $allowed_types)) {
            ResponseUtil::sendError("Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, GIF, WEBP)", 400);
            return;
        }
        
        // Generar nombre único para el archivo
        $file_extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $file_name = uniqid() . '_' . time() . '.' . $file_extension;
        
        // Determinar subdirectorio según el tipo de archivo
        $sub_dir = 'images/';
        $full_upload_dir = $this->upload_dir . $sub_dir;
        
        // Crear subdirectorio si no existe
        if (!file_exists($full_upload_dir)) {
            mkdir($full_upload_dir, 0755, true);
        }
        
        $upload_path = $full_upload_dir . $file_name;
        
        // Mover archivo a directorio de uploads
        if (move_uploaded_file($file['tmp_name'], $upload_path)) {
            // Construir URL del archivo
            $base_url = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]";
            $file_url = $base_url . '/pred-backend/uploads/' . $sub_dir . $file_name;
            
            ResponseUtil::sendResponse([
                'file_name' => $file_name,
                'file_url' => $file_url,
                'file_path' => $sub_dir . $file_name
            ], "Archivo subido exitosamente");
        } else {
            ResponseUtil::sendError("Error al mover el archivo subido", 500);
        }
    }
    
    public function delete() {
        // Verificar método de solicitud
        if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
            ResponseUtil::sendError("Método no permitido", 405);
            return;
        }
        
        // Verificar permisos de administrador
        $auth_middleware = new AuthMiddleware();
        if (!$auth_middleware->isAdmin($this->user)) {
            ResponseUtil::sendError("No tienes permisos para realizar esta acción", 403);
            return;
        }
        
        // Obtener datos de la solicitud
        $data = json_decode(file_get_contents("php://input"), true);
        
        // Validar datos
        if (!isset($data['file_path']) || empty($data['file_path'])) {
            ResponseUtil::sendError("Ruta de archivo no proporcionada", 400);
            return;
        }
        
        $file_path = $this->upload_dir . $data['file_path'];
        
        // Verificar si el archivo existe
        if (!file_exists($file_path)) {
            ResponseUtil::sendError("Archivo no encontrado", 404);
            return;
        }
        
        // Eliminar archivo
        if (unlink($file_path)) {
            ResponseUtil::sendResponse(null, "Archivo eliminado exitosamente");
        } else {
            ResponseUtil::sendError("Error al eliminar archivo", 500);
        }
    }
}