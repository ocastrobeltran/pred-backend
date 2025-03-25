<?php
namespace App\Controllers;

use App\Models\Solicitud;
use App\Utils\ResponseUtil;
use App\Middleware\AuthMiddleware;

class SolicitudController {
    private $solicitud_model;
    public $user;
    
    public function __construct() {
        $this->solicitud_model = new Solicitud();
    }
    
    public function index() {
        // Verificar método de solicitud
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            ResponseUtil::sendError("Método no permitido", 405);
            return;
        }
        
        // Obtener parámetros de paginación y filtros
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
        
        $filters = [];
        
        // Si no es administrador, solo puede ver sus propias solicitudes
        $auth_middleware = new AuthMiddleware();
        if (!$auth_middleware->isAdmin($this->user) && !$auth_middleware->isSupervisor($this->user)) {
            $filters['usuario_id'] = $this->user['id'];
        } else {
            // Si es administrador o supervisor, puede filtrar por usuario
            if (isset($_GET['usuario_id'])) {
                $filters['usuario_id'] = $_GET['usuario_id'];
            }
        }
        
        if (isset($_GET['escenario_id'])) {
            $filters['escenario_id'] = $_GET['escenario_id'];
        }
        
        if (isset($_GET['estado_id'])) {
            $filters['estado_id'] = $_GET['estado_id'];
        }
        
        if (isset($_GET['fecha_desde'])) {
            $filters['fecha_desde'] = $_GET['fecha_desde'];
        }
        
        if (isset($_GET['fecha_hasta'])) {
            $filters['fecha_hasta'] = $_GET['fecha_hasta'];
        }
        
        if (isset($_GET['search'])) {
            $filters['search'] = $_GET['search'];
        }
        
        try {
            $result = $this->solicitud_model->getAll($page, $limit, $filters);
            ResponseUtil::sendResponse($result, "Solicitudes obtenidas exitosamente");
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
            ResponseUtil::sendError("ID de solicitud no proporcionado", 400);
            return;
        }
        
        try {
            $solicitud = $this->solicitud_model->findById($id);
            
            if (!$solicitud) {
                ResponseUtil::sendError("Solicitud no encontrada", 404);
                return;
            }
            
            // Verificar permisos (solo el propio usuario o un administrador/supervisor puede ver los detalles)
            $auth_middleware = new AuthMiddleware();
            if ($solicitud['usuario_id'] != $this->user['id'] && 
                !$auth_middleware->isAdmin($this->user) && 
                !$auth_middleware->isSupervisor($this->user)) {
                ResponseUtil::sendError("No tienes permisos para realizar esta acción", 403);
                return;
            }
            
            ResponseUtil::sendResponse($solicitud, "Solicitud obtenida exitosamente");
        } catch (\Exception $e) {
            ResponseUtil::sendError("Error: " . $e->getMessage(), 500);
        }
    }
    
    public function buscarPorCodigo() {
        // Verificar método de solicitud
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            ResponseUtil::sendError("Método no permitido", 405);
            return;
        }
        
        // Verificar si se proporcionó un código
        if (!isset($_GET['codigo'])) {
            ResponseUtil::sendError("Código de reserva no proporcionado", 400);
            return;
        }
        
        $codigo = $_GET['codigo'];
        
        try {
            $solicitud = $this->solicitud_model->findByCodigoReserva($codigo);
            
            if (!$solicitud) {
                ResponseUtil::sendError("Solicitud no encontrada", 404);
                return;
            }
            
            ResponseUtil::sendResponse($solicitud, "Solicitud obtenida exitosamente");
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
        
        // Obtener datos de la solicitud
        $data = json_decode(file_get_contents("php://input"), true);
        
        // Validar datos
        $required_fields = ['escenario_id', 'fecha_reserva', 'hora_inicio', 'hora_fin', 'proposito_id', 'num_participantes'];
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
        
        // Establecer el usuario actual como el solicitante
        $data['usuario_id'] = $this->user['id'];
        
        // Crear solicitud
        try {
            $result = $this->solicitud_model->create($data);
            
            if ($result) {
                ResponseUtil::sendResponse($result, "Solicitud creada exitosamente");
            } else {
                ResponseUtil::sendError("Error al crear solicitud", 500);
            }
        } catch (\Exception $e) {
            ResponseUtil::sendError("Error: " . $e->getMessage(), 500);
        }
    }
    
    public function cambiarEstado($id = null) {
        // Verificar método de solicitud
        if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
            ResponseUtil::sendError("Método no permitido", 405);
            return;
        }
        
        // Verificar si se proporcionó un ID
        if (!$id) {
            ResponseUtil::sendError("ID de solicitud no proporcionado", 400);
            return;
        }
        
        // Verificar permisos de administrador o supervisor
        $auth_middleware = new AuthMiddleware();
        if (!$auth_middleware->isAdmin($this->user) && !$auth_middleware->isSupervisor($this->user)) {
            ResponseUtil::sendError("No tienes permisos para realizar esta acción", 403);
            return;
        }
        
        // Obtener datos de la solicitud
        $data = json_decode(file_get_contents("php://input"), true);
        
        // Validar datos
        if (!isset($data['estado']) || empty($data['estado'])) {
            ResponseUtil::sendError("El estado es requerido", 400);
            return;
        }
        
        $admin_notas = isset($data['admin_notas']) ? $data['admin_notas'] : '';
        
        try {
            $result = $this->solicitud_model->cambiarEstado($id, $data['estado'], $this->user['id'], $admin_notas);
            
            if ($result) {
                ResponseUtil::sendResponse(null, "Estado de solicitud actualizado exitosamente");
            } else {
                ResponseUtil::sendError("Error al actualizar estado de solicitud", 500);
            }
        } catch (\Exception $e) {
            ResponseUtil::sendError("Error: " . $e->getMessage(), 500);
        }
    }
    
    public function estados() {
        // Verificar método de solicitud
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            ResponseUtil::sendError("Método no permitido", 405);
            return;
        }
        
        try {
            $estados = $this->solicitud_model->getEstados();
            ResponseUtil::sendResponse($estados, "Estados obtenidos exitosamente");
        } catch (\Exception $e) {
            ResponseUtil::sendError("Error: " . $e->getMessage(), 500);
        }
    }
    
    public function propositos() {
        // Verificar método de solicitud
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            ResponseUtil::sendError("Método no permitido", 405);
            return;
        }
        
        try {
            $propositos = $this->solicitud_model->getPropositos();
            ResponseUtil::sendResponse($propositos, "Propósitos obtenidos exitosamente");
        } catch (\Exception $e) {
            ResponseUtil::sendError("Error: " . $e->getMessage(), 500);
        }
    }
}