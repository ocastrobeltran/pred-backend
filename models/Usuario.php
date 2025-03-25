<?php
namespace App\Models;

use App\Config\Database;
use PDO;

class Usuario {
    private $conn;
    private $table_name = "usuarios";
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }
    
    public function findById($id) {
        $query = "SELECT u.*, r.nombre as rol_nombre 
                  FROM " . $this->table_name . " u
                  JOIN roles r ON u.rol_id = r.id
                  WHERE u.id = :id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->execute();
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public function findByEmail($email) {
        $query = "SELECT u.*, r.nombre as rol_nombre 
                  FROM " . $this->table_name . " u
                  JOIN roles r ON u.rol_id = r.id
                  WHERE u.email = :email";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":email", $email);
        $stmt->execute();
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public function create($data) {
        $query = "INSERT INTO " . $this->table_name . "
                  (nombre, apellido, email, password, cedula, telefono, direccion, rol_id, estado, created_at, updated_at)
                  VALUES
                  (:nombre, :apellido, :email, :password, :cedula, :telefono, :direccion, :rol_id, :estado, NOW(), NOW())";
        
        $stmt = $this->conn->prepare($query);
        
        // Sanitizar y vincular datos
        $nombre = htmlspecialchars(strip_tags($data['nombre']));
        $apellido = htmlspecialchars(strip_tags($data['apellido']));
        $email = htmlspecialchars(strip_tags($data['email']));
        $password = password_hash($data['password'], PASSWORD_DEFAULT);
        $cedula = htmlspecialchars(strip_tags($data['cedula']));
        $telefono = htmlspecialchars(strip_tags($data['telefono']));
        $direccion = htmlspecialchars(strip_tags($data['direccion']));
        $rol_id = isset($data['rol_id']) ? $data['rol_id'] : 2; // Por defecto, rol de usuario
        $estado = isset($data['estado']) ? $data['estado'] : 'pendiente';
        
        $stmt->bindParam(":nombre", $nombre);
        $stmt->bindParam(":apellido", $apellido);
        $stmt->bindParam(":email", $email);
        $stmt->bindParam(":password", $password);
        $stmt->bindParam(":cedula", $cedula);
        $stmt->bindParam(":telefono", $telefono);
        $stmt->bindParam(":direccion", $direccion);
        $stmt->bindParam(":rol_id", $rol_id);
        $stmt->bindParam(":estado", $estado);
        
        if ($stmt->execute()) {
            return $this->conn->lastInsertId();
        }
        
        return false;
    }
    
    public function update($id, $data) {
        $fields = [];
        $values = [];
        
        // Construir dinámicamente los campos a actualizar
        foreach ($data as $key => $value) {
            if ($key !== 'id' && $key !== 'password') {
                $fields[] = "{$key} = :{$key}";
                $values[":{$key}"] = htmlspecialchars(strip_tags($value));
            }
        }
        
        // Manejar la contraseña por separado si se proporciona
        if (isset($data['password']) && !empty($data['password'])) {
            $fields[] = "password = :password";
            $values[":password"] = password_hash($data['password'], PASSWORD_DEFAULT);
        }
        
        // Agregar timestamp de actualización
        $fields[] = "updated_at = NOW()";
        
        // Construir la consulta
        $query = "UPDATE " . $this->table_name . " SET " . implode(", ", $fields) . " WHERE id = :id";
        $values[":id"] = $id;
        
        $stmt = $this->conn->prepare($query);
        
        foreach ($values as $param => $value) {
            $stmt->bindValue($param, $value);
        }
        
        return $stmt->execute();
    }
    
    public function delete($id) {
        $query = "DELETE FROM " . $this->table_name . " WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        
        return $stmt->execute();
    }
    
    public function getAll($page = 1, $limit = 10, $filters = []) {
        $offset = ($page - 1) * $limit;
        
        $query = "SELECT u.*, r.nombre as rol_nombre 
                  FROM " . $this->table_name . " u
                  JOIN roles r ON u.rol_id = r.id";
        
        // Aplicar filtros si existen
        if (!empty($filters)) {
            $query .= " WHERE ";
            $conditions = [];
            
            if (isset($filters['rol_id'])) {
                $conditions[] = "u.rol_id = :rol_id";
            }
            
            if (isset($filters['estado'])) {
                $conditions[] = "u.estado = :estado";
            }
            
            if (isset($filters['search'])) {
                $conditions[] = "(u.nombre LIKE :search OR u.apellido LIKE :search OR u.email LIKE :search OR u.cedula LIKE :search)";
            }
            
            $query .= implode(" AND ", $conditions);
        }
        
        $query .= " ORDER BY u.id DESC LIMIT :limit OFFSET :offset";
        
        $stmt = $this->conn->prepare($query);
        
        // Vincular parámetros de filtro
        if (!empty($filters)) {
            if (isset($filters['rol_id'])) {
                $stmt->bindParam(":rol_id", $filters['rol_id']);
            }
            
            if (isset($filters['estado'])) {
                $stmt->bindParam(":estado", $filters['estado']);
            }
            
            if (isset($filters['search'])) {
                $search = "%" . $filters['search'] . "%";
                $stmt->bindParam(":search", $search);
            }
        }
        
        $stmt->bindParam(":limit", $limit, PDO::PARAM_INT);
        $stmt->bindParam(":offset", $offset, PDO::PARAM_INT);
        
        $stmt->execute();
        
        // Obtener el total de registros para la paginación
        $count_query = "SELECT COUNT(*) as total FROM " . $this->table_name . " u";
        
        if (!empty($filters)) {
            $count_query .= " WHERE ";
            $conditions = [];
            
            if (isset($filters['rol_id'])) {
                $conditions[] = "u.rol_id = :rol_id";
            }
            
            if (isset($filters['estado'])) {
                $conditions[] = "u.estado = :estado";
            }
            
            if (isset($filters['search'])) {
                $conditions[] = "(u.nombre LIKE :search OR u.apellido LIKE :search OR u.email LIKE :search OR u.cedula LIKE :search)";
            }
            
            $count_query .= implode(" AND ", $conditions);
        }
        
        $count_stmt = $this->conn->prepare($count_query);
        
        // Vincular parámetros de filtro para la consulta de conteo
        if (!empty($filters)) {
            if (isset($filters['rol_id'])) {
                $count_stmt->bindParam(":rol_id", $filters['rol_id']);
            }
            
            if (isset($filters['estado'])) {
                $count_stmt->bindParam(":estado", $filters['estado']);
            }
            
            if (isset($filters['search'])) {
                $count_stmt->bindParam(":search", $search);
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
    
    public function getRoles() {
        $query = "SELECT * FROM roles ORDER BY id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}