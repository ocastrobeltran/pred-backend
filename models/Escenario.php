<?php
namespace App\Models;

use App\Config\Database;
use PDO;

class Escenario {
    private $conn;
    private $table_name = "escenarios";
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }
    
    public function findById($id) {
        $query = "SELECT e.*, l.nombre as localidad_nombre, d.nombre as deporte_nombre, d.icono as deporte_icono
                  FROM " . $this->table_name . " e
                  JOIN localidades l ON e.localidad_id = l.id
                  JOIN deportes d ON e.deporte_principal_id = d.id
                  WHERE e.id = :id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->execute();
        
        $escenario = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($escenario) {
            // Obtener deportes asociados
            $query = "SELECT d.id, d.nombre, d.icono
                      FROM escenario_deportes ed
                      JOIN deportes d ON ed.deporte_id = d.id
                      WHERE ed.escenario_id = :escenario_id";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":escenario_id", $id);
            $stmt->execute();
            
            $escenario['deportes'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Obtener amenidades asociadas
            $query = "SELECT a.id, a.nombre, a.icono
                      FROM escenario_amenidades ea
                      JOIN amenidades a ON ea.amenidad_id = a.id
                      WHERE ea.escenario_id = :escenario_id";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":escenario_id", $id);
            $stmt->execute();
            
            $escenario['amenidades'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Obtener imágenes
            $query = "SELECT id, url_imagen, es_principal, orden
                      FROM escenario_imagenes
                      WHERE escenario_id = :escenario_id
                      ORDER BY es_principal DESC, orden ASC";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":escenario_id", $id);
            $stmt->execute();
            
            $escenario['imagenes'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Obtener horarios disponibles
            $query = "SELECT id, dia_semana, hora_inicio, hora_fin, disponible
                      FROM horarios_disponibles
                      WHERE escenario_id = :escenario_id
                      ORDER BY FIELD(dia_semana, 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'), hora_inicio";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":escenario_id", $id);
            $stmt->execute();
            
            $escenario['horarios'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        return $escenario;
    }
    
    public function getAll($page = 1, $limit = 10, $filters = []) {
        $offset = ($page - 1) * $limit;
        
        $query = "SELECT e.*, l.nombre as localidad_nombre, d.nombre as deporte_nombre, d.icono as deporte_icono
                  FROM " . $this->table_name . " e
                  JOIN localidades l ON e.localidad_id = l.id
                  JOIN deportes d ON e.deporte_principal_id = d.id";
        
        // Aplicar filtros si existen
        if (!empty($filters)) {
            $query .= " WHERE ";
            $conditions = [];
            
            if (isset($filters['localidad_id'])) {
                $conditions[] = "e.localidad_id = :localidad_id";
            }
            
            if (isset($filters['deporte_id'])) {
                $conditions[] = "e.deporte_principal_id = :deporte_id OR EXISTS (
                    SELECT 1 FROM escenario_deportes ed 
                    WHERE ed.escenario_id = e.id AND ed.deporte_id = :deporte_id
                )";
            }
            
            if (isset($filters['estado'])) {
                $conditions[] = "e.estado = :estado";
            }
            
            if (isset($filters['search'])) {
                $conditions[] = "(e.nombre LIKE :search OR e.descripcion LIKE :search OR l.nombre LIKE :search)";
            }
            
            $query .= implode(" AND ", $conditions);
        }
        
        $query .= " ORDER BY e.id DESC LIMIT :limit OFFSET :offset";
        
        $stmt = $this->conn->prepare($query);
        
        // Vincular parámetros de filtro
        if (!empty($filters)) {
            if (isset($filters['localidad_id'])) {
                $stmt->bindParam(":localidad_id", $filters['localidad_id']);
            }
            
            if (isset($filters['deporte_id'])) {
                $stmt->bindParam(":deporte_id", $filters['deporte_id']);
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
        
        $escenarios = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Obtener el total de registros para la paginación
        $count_query = "SELECT COUNT(*) as total FROM " . $this->table_name . " e
                        JOIN localidades l ON e.localidad_id = l.id
                        JOIN deportes d ON e.deporte_principal_id = d.id";
        
        if (!empty($filters)) {
            $count_query .= " WHERE ";
            $conditions = [];
            
            if (isset($filters['localidad_id'])) {
                $conditions[] = "e.localidad_id = :localidad_id";
            }
            
            if (isset($filters['deporte_id'])) {
                $conditions[] = "e.deporte_principal_id = :deporte_id OR EXISTS (
                    SELECT 1 FROM escenario_deportes ed 
                    WHERE ed.escenario_id = e.id AND ed.deporte_id = :deporte_id
                )";
            }
            
            if (isset($filters['estado'])) {
                $conditions[] = "e.estado = :estado";
            }
            
            if (isset($filters['search'])) {
                $conditions[] = "(e.nombre LIKE :search OR e.descripcion LIKE :search OR l.nombre LIKE :search)";
            }
            
            $count_query .= implode(" AND ", $conditions);
        }
        
        $count_stmt = $this->conn->prepare($count_query);
        
        // Vincular parámetros de filtro para la consulta de conteo
        if (!empty($filters)) {
            if (isset($filters['localidad_id'])) {
                $count_stmt->bindParam(":localidad_id", $filters['localidad_id']);
            }
            
            if (isset($filters['deporte_id'])) {
                $count_stmt->bindParam(":deporte_id", $filters['deporte_id']);
            }
            
            if (isset($filters['estado'])) {
                $count_stmt->bindParam(":estado", $filters['estado']);
            }
            
            if (isset($filters['search'])) {
                $search = "%" . $filters['search'] . "%";
                $count_stmt->bindParam(":search", $search);
            }
        }
        
        $count_stmt->execute();
        $row = $count_stmt->fetch(PDO::FETCH_ASSOC);
        $total_records = $row['total'];
        
        return [
            'data' => $escenarios,
            'pagination' => [
                'total' => $total_records,
                'per_page' => $limit,
                'current_page' => $page,
                'last_page' => ceil($total_records / $limit)
            ]
        ];
    }
    
    public function create($data) {
        $this->conn->beginTransaction();
        
        try {
            // Insertar escenario principal
            $query = "INSERT INTO " . $this->table_name . "
                      (nombre, descripcion, capacidad, dimensiones, localidad_id, deporte_principal_id, 
                       direccion, estado, imagen_principal, created_at, updated_at)
                      VALUES
                      (:nombre, :descripcion, :capacidad, :dimensiones, :localidad_id, :deporte_principal_id, 
                       :direccion, :estado, :imagen_principal, NOW(), NOW())";
            
            $stmt = $this->conn->prepare($query);
            
            // Sanitizar y vincular datos
            $nombre = htmlspecialchars(strip_tags($data['nombre']));
            $descripcion = $data['descripcion'];
            $capacidad = $data['capacidad'];
            $dimensiones = htmlspecialchars(strip_tags($data['dimensiones']));
            $localidad_id = $data['localidad_id'];
            $deporte_principal_id = $data['deporte_principal_id'];
            $direccion = htmlspecialchars(strip_tags($data['direccion']));
            $estado = isset($data['estado']) ? $data['estado'] : 'disponible';
            $imagen_principal = isset($data['imagen_principal']) ? $data['imagen_principal'] : '';
            
            $stmt->bindParam(":nombre", $nombre);
            $stmt->bindParam(":descripcion", $descripcion);
            $stmt->bindParam(":capacidad", $capacidad);
            $stmt->bindParam(":dimensiones", $dimensiones);
            $stmt->bindParam(":localidad_id", $localidad_id);
            $stmt->bindParam(":deporte_principal_id", $deporte_principal_id);
            $stmt->bindParam(":direccion", $direccion);
            $stmt->bindParam(":estado", $estado);
            $stmt->bindParam(":imagen_principal", $imagen_principal);
            
            $stmt->execute();
            
            $escenario_id = $this->conn->lastInsertId();
            
            // Insertar deportes asociados
            if (isset($data['deportes']) && is_array($data['deportes'])) {
                foreach ($data['deportes'] as $deporte_id) {
                    $query = "INSERT INTO escenario_deportes (escenario_id, deporte_id, created_at)
                              VALUES (:escenario_id, :deporte_id, NOW())";
                    
                    $stmt = $this->conn->prepare($query);
                    $stmt->bindParam(":escenario_id", $escenario_id);
                    $stmt->bindParam(":deporte_id", $deporte_id);
                    $stmt->execute();
                }
            }
            
            // Insertar amenidades asociadas
            if (isset($data['amenidades']) && is_array($data['amenidades'])) {
                foreach ($data['amenidades'] as $amenidad_id) {
                    $query = "INSERT INTO escenario_amenidades (escenario_id, amenidad_id, created_at)
                              VALUES (:escenario_id, :amenidad_id, NOW())";
                    
                    $stmt = $this->conn->prepare($query);
                    $stmt->bindParam(":escenario_id", $escenario_id);
                    $stmt->bindParam(":amenidad_id", $amenidad_id);
                    $stmt->execute();
                }
            }
            
            // Insertar imágenes
            if (isset($data['imagenes']) && is_array($data['imagenes'])) {
                $orden = 1;
                foreach ($data['imagenes'] as $imagen) {
                    $query = "INSERT INTO escenario_imagenes (escenario_id, url_imagen, es_principal, orden, created_at)
                              VALUES (:escenario_id, :url_imagen, :es_principal, :orden, NOW())";
                    
                    $stmt = $this->conn->prepare($query);
                    $stmt->bindParam(":escenario_id", $escenario_id);
                    $stmt->bindParam(":url_imagen", $imagen['url']);
                    $es_principal = isset($imagen['es_principal']) ? $imagen['es_principal'] : false;
                    $stmt->bindParam(":es_principal", $es_principal, PDO::PARAM_BOOL);
                    $stmt->bindParam(":orden", $orden);
                    $stmt->execute();
                    
                    $orden++;
                }
            }
            
            // Insertar horarios disponibles
            if (isset($data['horarios']) && is_array($data['horarios'])) {
                foreach ($data['horarios'] as $horario) {
                    $query = "INSERT INTO horarios_disponibles 
                              (escenario_id, dia_semana, hora_inicio, hora_fin, disponible, created_at, updated_at)
                              VALUES 
                              (:escenario_id, :dia_semana, :hora_inicio, :hora_fin, :disponible, NOW(), NOW())";
                    
                    $stmt = $this->conn->prepare($query);
                    $stmt->bindParam(":escenario_id", $escenario_id);
                    $stmt->bindParam(":dia_semana", $horario['dia_semana']);
                    $stmt->bindParam(":hora_inicio", $horario['hora_inicio']);
                    $stmt->bindParam(":hora_fin", $horario['hora_fin']);
                    $disponible = isset($horario['disponible']) ? $horario['disponible'] : true;
                    $stmt->bindParam(":disponible", $disponible, PDO::PARAM_BOOL);
                    $stmt->execute();
                }
            }
            
            $this->conn->commit();
            return $escenario_id;
            
        } catch (\Exception $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }
    
    public function update($id, $data) {
        $this->conn->beginTransaction();
        
        try {
            // Actualizar escenario principal
            $fields = [];
            $values = [];
            
            // Construir dinámicamente los campos a actualizar
            foreach ($data as $key => $value) {
                if ($key !== 'id' && $key !== 'deportes' && $key !== 'amenidades' && $key !== 'imagenes' && $key !== 'horarios') {
                    $fields[] = "{$key} = :{$key}";
                    $values[":{$key}"] = $value;
                }
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
            
            $stmt->execute();
            
            // Actualizar deportes asociados
            if (isset($data['deportes'])) {
                // Eliminar asociaciones existentes
                $query = "DELETE FROM escenario_deportes WHERE escenario_id = :escenario_id";
                $stmt = $this->conn->prepare($query);
                $stmt->bindParam(":escenario_id", $id);
                $stmt->execute();
                
                // Insertar nuevas asociaciones
                foreach ($data['deportes'] as $deporte_id) {
                    $query = "INSERT INTO escenario_deportes (escenario_id, deporte_id, created_at)
                              VALUES (:escenario_id, :deporte_id, NOW())";
                    
                    $stmt = $this->conn->prepare($query);
                    $stmt->bindParam(":escenario_id", $id);
                    $stmt->bindParam(":deporte_id", $deporte_id);
                    $stmt->execute();
                }
            }
            
            // Actualizar amenidades asociadas
            if (isset($data['amenidades'])) {
                // Eliminar asociaciones existentes
                $query = "DELETE FROM escenario_amenidades WHERE escenario_id = :escenario_id";
                $stmt = $this->conn->prepare($query);
                $stmt->bindParam(":escenario_id", $id);
                $stmt->execute();
                
                // Insertar nuevas asociaciones
                foreach ($data['amenidades'] as $amenidad_id) {
                    $query = "INSERT INTO escenario_amenidades (escenario_id, amenidad_id, created_at)
                              VALUES (:escenario_id, :amenidad_id, NOW())";
                    
                    $stmt = $this->conn->prepare($query);
                    $stmt->bindParam(":escenario_id", $id);
                    $stmt->bindParam(":amenidad_id", $amenidad_id);
                    $stmt->execute();
                }
            }
            
            // Actualizar imágenes
            if (isset($data['imagenes'])) {
                // Eliminar imágenes existentes
                $query = "DELETE FROM escenario_imagenes WHERE escenario_id = :escenario_id";
                $stmt = $this->conn->prepare($query);
                $stmt->bindParam(":escenario_id", $id);
                $stmt->execute();
                
                // Insertar nuevas imágenes
                $orden = 1;
                foreach ($data['imagenes'] as $imagen) {
                    $query = "INSERT INTO escenario_imagenes (escenario_id, url_imagen, es_principal, orden, created_at)
                              VALUES (:escenario_id, :url_imagen, :es_principal, :orden, NOW())";
                    
                    $stmt = $this->conn->prepare($query);
                    $stmt->bindParam(":escenario_id", $id);
                    $stmt->bindParam(":url_imagen", $imagen['url']);
                    $es_principal = isset($imagen['es_principal']) ? $imagen['es_principal'] : false;
                    $stmt->bindParam(":es_principal", $es_principal, PDO::PARAM_BOOL);
                    $stmt->bindParam(":orden", $orden);
                    $stmt->execute();
                    
                    $orden++;
                }
            }
            
            // Actualizar horarios disponibles
            if (isset($data['horarios'])) {
                // Eliminar horarios existentes
                $query = "DELETE FROM horarios_disponibles WHERE escenario_id = :escenario_id";
                $stmt = $this->conn->prepare($query);
                $stmt->bindParam(":escenario_id", $id);
                $stmt->execute();
                
                // Insertar nuevos horarios
                foreach ($data['horarios'] as $horario) {
                    $query = "INSERT INTO horarios_disponibles 
                              (escenario_id, dia_semana, hora_inicio, hora_fin, disponible, created_at, updated_at)
                              VALUES 
                              (:escenario_id, :dia_semana, :hora_inicio, :hora_fin, :disponible, NOW(), NOW())";
                    
                    $stmt = $this->conn->prepare($query);
                    $stmt->bindParam(":escenario_id", $id);
                    $stmt->bindParam(":dia_semana", $horario['dia_semana']);
                    $stmt->bindParam(":hora_inicio", $horario['hora_inicio']);
                    $stmt->bindParam(":hora_fin", $horario['hora_fin']);
                    $disponible = isset($horario['disponible']) ? $horario['disponible'] : true;
                    $stmt->bindParam(":disponible", $disponible, PDO::PARAM_BOOL);
                    $stmt->execute();
                }
            }
            
            $this->conn->commit();
            return true;
            
        } catch (\Exception $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }
    
    public function delete($id) {
        $this->conn->beginTransaction();
        
        try {
            // Eliminar horarios disponibles
            $query = "DELETE FROM horarios_disponibles WHERE escenario_id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":id", $id);
            $stmt->execute();
            
            // Eliminar imágenes
            $query = "DELETE FROM escenario_imagenes WHERE escenario_id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":id", $id);
            $stmt->execute();
            
            // Eliminar relaciones con deportes
            $query = "DELETE FROM escenario_deportes WHERE escenario_id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":id", $id);
            $stmt->execute();
            
            // Eliminar relaciones con amenidades
            $query = "DELETE FROM escenario_amenidades WHERE escenario_id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":id", $id);
            $stmt->execute();
            
            // Eliminar el escenario
            $query = "DELETE FROM " . $this->table_name . " WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":id", $id);
            $stmt->execute();
            
            $this->conn->commit();
            return true;
            
        } catch (\Exception $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }
    
    public function getLocalidades() {
        $query = "SELECT * FROM localidades ORDER BY nombre";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getDeportes() {
        $query = "SELECT * FROM deportes ORDER BY nombre";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getAmenidades() {
        $query = "SELECT * FROM amenidades ORDER BY nombre";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function verificarDisponibilidad($escenario_id, $fecha, $hora_inicio, $hora_fin) {
        // Convertir la fecha a día de la semana
        $dia_semana = strtolower(date('l', strtotime($fecha)));
        
        // Mapear el día de la semana en inglés al español
        $dias_semana = [
            'monday' => 'lunes',
            'tuesday' => 'martes',
            'wednesday' => 'miercoles',
            'thursday' => 'jueves',
            'friday' => 'viernes',
            'saturday' => 'sabado',
            'sunday' => 'domingo'
        ];
        
        $dia_semana = $dias_semana[$dia_semana];
        
        // Verificar si el escenario está disponible en ese horario según la configuración
        $query = "SELECT COUNT(*) as count
                  FROM horarios_disponibles
                  WHERE escenario_id = :escenario_id
                  AND dia_semana = :dia_semana
                  AND hora_inicio <= :hora_inicio
                  AND hora_fin >= :hora_fin
                  AND disponible = TRUE";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":escenario_id", $escenario_id);
        $stmt->bindParam(":dia_semana", $dia_semana);
        $stmt->bindParam(":hora_inicio", $hora_inicio);
        $stmt->bindParam(":hora_fin", $hora_fin);
        $stmt->execute();
        
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($row['count'] == 0) {
            return [
                'disponible' => false,
                'mensaje' => 'El horario seleccionado no está configurado como disponible para este escenario'
            ];
        }
        
        // Verificar si ya existe una reserva aprobada para ese horario
        $query = "SELECT COUNT(*) as count
                  FROM solicitudes s
                  JOIN estados_solicitud e ON s.estado_id = e.id
                  WHERE s.escenario_id = :escenario_id
                  AND s.fecha_reserva = :fecha
                  AND ((s.hora_inicio <= :hora_inicio AND s.hora_fin > :hora_inicio)
                       OR (s.hora_inicio < :hora_fin AND s.hora_fin >= :hora_fin)
                       OR (s.hora_inicio >= :hora_inicio AND s.hora_fin <= :hora_fin))
                  AND e.nombre = 'aprobada'";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":escenario_id", $escenario_id);
        $stmt->bindParam(":fecha", $fecha);
        $stmt->bindParam(":hora_inicio", $hora_inicio);
        $stmt->bindParam(":hora_fin", $hora_fin);
        $stmt->execute();
        
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($row['count'] > 0) {
            return [
                'disponible' => false,
                'mensaje' => 'Ya existe una reserva aprobada para este escenario en el horario seleccionado'
            ];
        }
        
        return [
            'disponible' => true,
            'mensaje' => 'El escenario está disponible para el horario seleccionado'
        ];
    }

    
    public function registrarReserva($data) {
        $query = "INSERT INTO reservas (escenario_id, fecha, hora_inicio, hora_fin, usuario_id)
                  VALUES (:escenario_id, :fecha, :hora_inicio, :hora_fin, :usuario_id)";
        $stmt = $this->conn->prepare($query);
    
        $stmt->bindParam(":escenario_id", $data['escenario_id'], PDO::PARAM_INT);
        $stmt->bindParam(":fecha", $data['fecha'], PDO::PARAM_STR);
        $stmt->bindParam(":hora_inicio", $data['hora_inicio'], PDO::PARAM_STR);
        $stmt->bindParam(":hora_fin", $data['hora_fin'], PDO::PARAM_STR);
        $stmt->bindParam(":usuario_id", $data['usuario_id'], PDO::PARAM_INT);
    
        return $stmt->execute();
    }

    public function obtenerHorasReservadas($escenario_id, $fecha) {
        $query = "SELECT hora_inicio, hora_fin 
                  FROM reservas 
                  WHERE escenario_id = :escenario_id AND fecha = :fecha";
        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(":escenario_id", $escenario_id, PDO::PARAM_INT);
        $stmt->bindParam(":fecha", $fecha, PDO::PARAM_STR);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}