<?php
namespace App\Models;

use App\Config\Database;
use PDO;

class Notificacion {
    private $conn;
    private $table_name = "notificaciones";
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }
    
    public function findById($id) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->execute();
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public function getAll($page = 1, $limit = 10, $filters = []) {
        $offset = ($page - 1) * $limit;
        
        $query = "SELECT * FROM " . $this->table_name;
        
        // Aplicar filtros si existen
        if (!empty($filters)) {
            $query .= " WHERE ";
            $conditions = [];
            
            if (isset($filters['usuario_id'])) {
                $conditions[] = "usuario_id = :usuario_id";
            }
            
            if (isset($filters['leida'])) {
                $conditions[] = "leida = :leida";
            }
            
            $query .= implode(" AND ", $conditions);
        }
        
        $query .= " ORDER BY created_at DESC LIMIT :limit OFFSET :offset";
        
        $stmt = $this->conn->prepare($query);
        
        // Vincular parámetros de filtro
        if (!empty($filters)) {
            if (isset($filters['usuario_id'])) {
                $stmt->bindParam(":usuario_id", $filters['usuario_id']);
            }
            
            if (isset($filters['leida'])) {
                $leida = $filters['leida'] ? 1 : 0;
                $stmt->bindParam(":leida", $leida, PDO::PARAM_BOOL);
            }
        }
        
        $stmt->bindParam(":limit", $limit, PDO::PARAM_INT);
        $stmt->bindParam(":offset", $offset, PDO::PARAM_INT);
        
        $stmt->execute();
        
        // Obtener el total de registros para la paginación
        $count_query = "SELECT COUNT(*) as total FROM " . $this->table_name;
        
        if (!empty($filters)) {
            $count_query .= " WHERE ";
            $conditions = [];
            
            if (isset($filters['usuario_id'])) {
                $conditions[] = "usuario_id = :usuario_id";
            }
            
            if (isset($filters['leida'])) {
                $conditions[] = "leida = :leida";
            }
            
            $count_query .= implode(" AND ", $conditions);
        }
        
        $count_stmt = $this->conn->prepare($count_query);
        
        // Vincular parámetros de filtro para la consulta de conteo
        if (!empty($filters)) {
            if (isset($filters['usuario_id'])) {
                $count_stmt->bindParam(":usuario_id", $filters['usuario_id']);
            }
            
            if (isset($filters['leida'])) {
                $count_stmt->bindParam(":leida", $leida, PDO::PARAM_BOOL);
            }
        }
        
        $count_stmt->execute();
        $row = $count_stmt->fetch(PDO::FETCH_ASSOC);
        $total_records = $row['total'];
        
        return [
            'data' => $stmt->fetchAll(PDO::FETCH_ASSOC),
            'pagination' => [
                'total' => $total_records,
                'per_page' => $limit,
                'current_page' => $page,
                'last_page' => ceil($total_records / $limit)
            ]
        ];
    }
    
    public function marcarLeida($id) {
        $query = "UPDATE " . $this->table_name . " SET leida = TRUE WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        
        return $stmt->execute();
    }
    
    public function marcarTodasLeidas($usuario_id) {
        $query = "UPDATE " . $this->table_name . " SET leida = TRUE WHERE usuario_id = :usuario_id AND leida = FALSE";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":usuario_id", $usuario_id);
        
        return $stmt->execute();
    }
    
    public function contarNoLeidas($usuario_id) {
        $query = "SELECT COUNT(*) as count FROM " . $this->table_name . " WHERE usuario_id = :usuario_id AND leida = FALSE";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":usuario_id", $usuario_id);
        $stmt->execute();
        
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row['count'];
    }
    
    public function create($data) {
        $query = "INSERT INTO " . $this->table_name . "
                  (usuario_id, titulo, mensaje, tipo, url, leida, created_at)
                  VALUES
                  (:usuario_id, :titulo, :mensaje, :tipo, :url, :leida, NOW())";
        
        $stmt = $this->conn->prepare($query);
        
        // Sanitizar y vincular datos
        $usuario_id = $data['usuario_id'];
        $titulo = htmlspecialchars(strip_tags($data['titulo']));
        $mensaje = htmlspecialchars(strip_tags($data['mensaje']));
        $tipo = isset($data['tipo']) ? $data['tipo'] : 'info';
        $url = isset($data['url']) ? $data['url'] : null;
        $leida = isset($data['leida']) ? $data['leida'] : false;
        
        $stmt->bindParam(":usuario_id", $usuario_id);
        $stmt->bindParam(":titulo", $titulo);
        $stmt->bindParam(":mensaje", $mensaje);
        $stmt->bindParam(":tipo", $tipo);
        $stmt->bindParam(":url", $url);
        $stmt->bindParam(":leida", $leida, PDO::PARAM_BOOL);
        
        if ($stmt->execute()) {
            return $this->conn->lastInsertId();
        }
        
        return false;
    }
}