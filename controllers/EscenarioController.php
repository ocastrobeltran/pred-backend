<?php
namespace App\Controllers;

use App\Models\Escenario;
use App\Utils\ResponseUtil;
use App\Middleware\AuthMiddleware;

class EscenarioController {
    private $escenario_model;
    public $user;
    
    public function __construct() {
        $this->escenario_model = new Escenario();
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
        
        if (isset($_GET['localidad_id'])) {
            $filters['localidad_id'] = $_GET['localidad_id'];
        }
        
        if (isset($_GET['deporte_id'])) {
            $filters['deporte_id'] = $_GET['deporte_id'];
        }
        
        if (isset($_GET['estado'])) {
            $filters['estado'] = $_GET['estado'];
        }
        
        if (isset($_GET['search'])) {
            $filters['search'] = $_GET['search'];
        }
        
        try {
            $result = $this->escenario_model->getAll($page, $limit, $filters);
            ResponseUtil::sendResponse($result, "Escenarios obtenidos exitosamente");
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
            ResponseUtil::sendError("ID de escenario no proporcionado", 400);
            return;
        }
        
        try {
            $escenario = $this->escenario_model->findById($id);
            
            if (!$escenario) {
                ResponseUtil::sendError("Escenario no encontrado", 404);
                return;
            }
            
            ResponseUtil::sendResponse($escenario, "Escenario obtenido exitosamente");
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
        $required_fields = ['nombre', 'descripcion', 'capacidad', 'dimensiones', 'localidad_id', 'deporte_principal_id', 'direccion'];
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
        
        // Crear escenario
        try {
            $escenario_id = $this->escenario_model->create($data);
            
            if ($escenario_id) {
                ResponseUtil::sendResponse(['escenario_id' => $escenario_id], "Escenario creado exitosamente");
            } else {
                ResponseUtil::sendError("Error al crear escenario", 500);
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
            ResponseUtil::sendError("ID de escenario no proporcionado", 400);
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
        if (empty($data)) {
            ResponseUtil::sendError("No se proporcionaron datos para actualizar", 400);
            return;
        }
        
        try {
            $result = $this->escenario_model->update($id, $data);
            
            if ($result) {
                ResponseUtil::sendResponse(null, "Escenario actualizado exitosamente");
            } else {
                ResponseUtil::sendError("Error al actualizar escenario", 500);
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
            ResponseUtil::sendError("ID de escenario no proporcionado", 400);
            return;
        }
        
        // Verificar permisos de administrador
        $auth_middleware = new AuthMiddleware();
        if (!$auth_middleware->isAdmin($this->user)) {
            ResponseUtil::sendError("No tienes permisos para realizar esta acción", 403);
            return;
        }
        
        try {
            $result = $this->escenario_model->delete($id);
            
            if ($result) {
                ResponseUtil::sendResponse(null, "Escenario eliminado exitosamente");
            } else {
                ResponseUtil::sendError("Error al eliminar escenario", 500);
            }
        } catch (\Exception $e) {
            ResponseUtil::sendError("Error: " . $e->getMessage(), 500);
        }
    }
    
    public function localidades() {
        // Verificar método de solicitud
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            ResponseUtil::sendError("Método no permitido", 405);
            return;
        }
        
        try {
            $localidades = $this->escenario_model->getLocalidades();
            ResponseUtil::sendResponse($localidades, "Localidades obtenidas exitosamente");
        } catch (\Exception $e) {
            ResponseUtil::sendError("Error: " . $e->getMessage(), 500);
        }
    }
    
    public function deportes() {
        // Verificar método de solicitud
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            ResponseUtil::sendError("Método no permitido", 405);
            return;
        }
        
        try {
            $deportes = $this->escenario_model->getDeportes();
            ResponseUtil::sendResponse($deportes, "Deportes obtenidos exitosamente");
        } catch (\Exception $e) {
            ResponseUtil::sendError("Error: " . $e->getMessage(), 500);
        }
    }
    
    public function amenidades() {
        // Verificar método de solicitud
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            ResponseUtil::sendError("Método no permitido", 405);
            return;
        }
        
        try {
            $amenidades = $this->escenario_model->getAmenidades();
            ResponseUtil::sendResponse($amenidades, "Amenidades obtenidas exitosamente");
        } catch (\Exception $e) {
            ResponseUtil::sendError("Error: " . $e->getMessage(), 500);
        }
    }
    
    public function verificarDisponibilidad() {
        // Verificar método de solicitud
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            ResponseUtil::sendError("Método no permitido", 405);
            return;
        }
        
        // Obtener datos de la solicitud
        $data = json_decode(file_get_contents("php://input"), true);
        
        // Validar datos
        $required_fields = ['escenario_id', 'fecha', 'hora_inicio', 'hora_fin'];
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
        
        try {
            $result = $this->escenario_model->verificarDisponibilidad(
                $data['escenario_id'],
                $data['fecha'],
                $data['hora_inicio'],
                $data['hora_fin']
            );
            
            ResponseUtil::sendResponse($result, $result['mensaje']);
        } catch (\Exception $e) {
            ResponseUtil::sendError("Error: " . $e->getMessage(), 500);
        }
    }
}