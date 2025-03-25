<?php
namespace App\Controllers;

use App\Models\Notificacion;
use App\Utils\ResponseUtil;

class NotificacionController {
    private $notificacion_model;
    public $user;
    
    public function __construct() {
        $this->notificacion_model = new Notificacion();
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
        
        $filters = [
            'usuario_id' => $this->user['id']
        ];
        
        if (isset($_GET['leida'])) {
            $filters['leida'] = $_GET['leida'] === 'true' || $_GET['leida'] === '1';
        }
        
        try {
            $result = $this->notificacion_model->getAll($page, $limit, $filters);
            ResponseUtil::sendResponse($result, "Notificaciones obtenidas exitosamente");
        } catch (\Exception $e) {
            ResponseUtil::sendError("Error: " . $e->getMessage(), 500);
        }
    }
    
    public function marcarLeida($id = null) {
        // Verificar método de solicitud
        if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
            ResponseUtil::sendError("Método no permitido", 405);
            return;
        }
        
        // Verificar si se proporcionó un ID
        if (!$id) {
            ResponseUtil::sendError("ID de notificación no proporcionado", 400);
            return;
        }
        
        try {
            $notificacion = $this->notificacion_model->findById($id);
            
            if (!$notificacion) {
                ResponseUtil::sendError("Notificación no encontrada", 404);
                return;
            }
            
            // Verificar que la notificación pertenezca al usuario actual
            if ($notificacion['usuario_id'] != $this->user['id']) {
                ResponseUtil::sendError("No tienes permisos para realizar esta acción", 403);
                return;
            }
            
            $result = $this->notificacion_model->marcarLeida($id);
            
            if ($result) {
                ResponseUtil::sendResponse(null, "Notificación marcada como leída exitosamente");
            } else {
                ResponseUtil::sendError("Error al marcar notificación como leída", 500);
            }
        } catch (\Exception $e) {
            ResponseUtil::sendError("Error: " . $e->getMessage(), 500);
        }
    }
    
    public function marcarTodasLeidas() {
        // Verificar método de solicitud
        if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
            ResponseUtil::sendError("Método no permitido", 405);
            return;
        }
        
        try {
            $result = $this->notificacion_model->marcarTodasLeidas($this->user['id']);
            
            if ($result) {
                ResponseUtil::sendResponse(null, "Todas las notificaciones marcadas como leídas exitosamente");
            } else {
                ResponseUtil::sendError("Error al marcar todas las notificaciones como leídas", 500);
            }
        } catch (\Exception $e) {
            ResponseUtil::sendError("Error: " . $e->getMessage(), 500);
        }
    }
    
    public function contarNoLeidas() {
        // Verificar método de solicitud
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            ResponseUtil::sendError("Método no permitido", 405);
            return;
        }
        
        try {
            $count = $this->notificacion_model->contarNoLeidas($this->user['id']);
            ResponseUtil::sendResponse(['count' => $count], "Conteo de notificaciones no leídas obtenido exitosamente");
        } catch (\Exception $e) {
            ResponseUtil::sendError("Error: " . $e->getMessage(), 500);
        }
    }
}