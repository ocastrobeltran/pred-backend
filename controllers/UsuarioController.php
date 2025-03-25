<?php
namespace App\Controllers;

use App\Models\Usuario;
use App\Utils\ResponseUtil;
use App\Middleware\AuthMiddleware;

class UsuarioController {
    private $usuario_model;
    public $user;
    
    public function __construct() {
        $this->usuario_model = new Usuario();
    }
    
    public function index() {
        // Verificar método de solicitud
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            ResponseUtil::sendError("Método no permitido", 405);
            return;
        }
        
        // Verificar permisos de administrador
        $auth_middleware = new AuthMiddleware();
        if (!$auth_middleware->isAdmin($this->user)) {
            ResponseUtil::sendError("No tienes permisos para realizar esta acción", 403);
            return;
        }
        
        // Obtener parámetros de paginación y filtros
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
        
        $filters = [];
        
        if (isset($_GET['rol_id'])) {
            $filters['rol_id'] = $_GET['rol_id'];
        }
        
        if (isset($_GET['estado'])) {
            $filters['estado'] = $_GET['estado'];
        }
        
        if (isset($_GET['search'])) {
            $filters['search'] = $_GET['search'];
        }
        
        try {
            $result = $this->usuario_model->getAll($page, $limit, $filters);
            ResponseUtil::sendResponse($result, "Usuarios obtenidos exitosamente");
        } catch (\Exception $e) {
            ResponseUtil::sendError("Error: " . $e->getMessage(), 500);
        }
    }
    
    public function view($id = null) {
        // Verificar método de solicitud
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            ResponseUtil::sendError("Método no permitido", 405);
            return;
        }
        
        // Verificar si se proporcionó un ID
        if (!$id) {
            ResponseUtil::sendError("ID de usuario no proporcionado", 400);
            return;
        }
        
        // Verificar permisos (solo el propio usuario o un administrador puede ver los detalles)
        $auth_middleware = new AuthMiddleware();
        if ($this->user['id'] != $id && !$auth_middleware->isAdmin($this->user)) {
            ResponseUtil::sendError("No tienes permisos para realizar esta acción", 403);
            return;
        }
        
        try {
            $usuario = $this->usuario_model->findById($id);
            
            if (!$usuario) {
                ResponseUtil::sendError("Usuario no encontrado", 404);
                return;
            }
            
            // Eliminar la contraseña de la respuesta
            unset($usuario['password']);
            
            ResponseUtil::sendResponse($usuario, "Usuario obtenido exitosamente");
        } catch (\Exception $e) {
            ResponseUtil::sendError("Error: " . $e->getMessage(), 500);
        }
    }
    
    public function create() {
        // Verificar método de solicitud
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
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
        $required_fields = ['nombre', 'apellido', 'email', 'password', 'rol_id'];
        $errors = [];
        
        foreach ($required_fields as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                $errors[] = "El campo {$field} es requerido";
            }
        }
        
        if (!empty($errors)) {
            ResponseUtil::sendError("Datos incompletos", 400, $errors);
            return;
        }
        
        // Verificar si el correo ya está registrado
        $existing_user = $this->usuario_model->findByEmail($data['email']);
        
        if ($existing_user) {
            ResponseUtil::sendError("El correo electrónico ya está registrado", 400);
            return;
        }
        
        // Crear usuario
        try {
            $user_id = $this->usuario_model->create($data);
            
            if ($user_id) {
                ResponseUtil::sendResponse(['user_id' => $user_id], "Usuario creado exitosamente");
            } else {
                ResponseUtil::sendError("Error al crear usuario", 500);
            }
        } catch (\Exception $e) {
            ResponseUtil::sendError("Error: " . $e->getMessage(), 500);
        }
    }
    
    public function update($id = null) {
        // Verificar método de solicitud
        if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
            ResponseUtil::sendError("Método no permitido", 405);
            return;
        }
        
        // Verificar si se proporcionó un ID
        if (!$id) {
            ResponseUtil::sendError("ID de usuario no proporcionado", 400);
            return;
        }
        
        // Verificar permisos (solo el propio usuario o un administrador puede actualizar)
        $auth_middleware = new AuthMiddleware();
        if ($this->user['id'] != $id && !$auth_middleware->isAdmin($this->user)) {
            ResponseUtil::sendError("No tienes permisos para realizar esta acción", 403);
            return;
        }
        
        // Obtener datos de la solicitud
        $data = json_decode(file_get_contents("php://input"), true);
        
        // Validar datos
        if (empty($data)) {
            ResponseUtil::sendError("No se proporcionaron datos para actualizar", 400);
            return;
        }
        
        // Si no es administrador, no puede cambiar el rol
        if (!$auth_middleware->isAdmin($this->user) && isset($data['rol_id'])) {
            unset($data['rol_id']);
        }
        
        try {
            $result = $this->usuario_model->update($id, $data);
            
            if ($result) {
                ResponseUtil::sendResponse(null, "Usuario actualizado exitosamente");
            } else {
                ResponseUtil::sendError("Error al actualizar usuario", 500);
            }
        } catch (\Exception $e) {
            ResponseUtil::sendError("Error: " . $e->getMessage(), 500);
        }
    }
    
    public function delete($id = null) {
        // Verificar método de solicitud
        if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
            ResponseUtil::sendError("Método no permitido", 405);
            return;
        }
        
        // Verificar si se proporcionó un ID
        if (!$id) {
            ResponseUtil::sendError("ID de usuario no proporcionado", 400);
            return;
        }
        
        // Verificar permisos de administrador
        $auth_middleware = new AuthMiddleware();
        if (!$auth_middleware->isAdmin($this->user)) {
            ResponseUtil::sendError("No tienes permisos para realizar esta acción", 403);
            return;
        }
        
        try {
            $result = $this->usuario_model->delete($id);
            
            if ($result) {
                ResponseUtil::sendResponse(null, "Usuario eliminado exitosamente");
            } else {
                ResponseUtil::sendError("Error al eliminar usuario", 500);
            }
        } catch (\Exception $e) {
            ResponseUtil::sendError("Error: " . $e->getMessage(), 500);
        }
    }
    
    public function roles() {
        // Verificar método de solicitud
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            ResponseUtil::sendError("Método no permitido", 405);
            return;
        }
        
        try {
            $roles = $this->usuario_model->getRoles();
            ResponseUtil::sendResponse($roles, "Roles obtenidos exitosamente");
        } catch (\Exception $e) {
            ResponseUtil::sendError("Error: " . $e->getMessage(), 500);
        }
    }
}