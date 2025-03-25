<?php
namespace App\Models;

use App\Config\Database;
use PDO;

class Solicitud {
    private $conn;
    private $table_name = "solicitudes";
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }
    
    public function findById($id) {
        $query = "SELECT s.*, 
                  u.nombre as usuario_nombre, u.apellido as usuario_apellido, u.email as usuario_email,
                  e.nombre as escenario_nombre, l.nombre as escenario_localidad,
                  p.nombre as proposito_nombre,
                  es.nombre as estado_nombre, es.color as estado_color,
                  a.nombre as admin_nombre, a.apellido as admin_apellido
                  FROM " . $this->table_name . " s
                  JOIN usuarios u ON s.usuario_id = u.id
                  JOIN escenarios e ON s.escenario_id = e.id
                  JOIN localidades l ON e.localidad_id = l.id
                  JOIN propositos_reserva p ON s.proposito_id = p.id
                  JOIN estados_solicitud es ON s.estado_id = es.id
                  LEFT JOIN usuarios a ON s.admin_id = a.id
                  WHERE s.id = :id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->execute();
        
        $solicitud = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($solicitud) {
            // Obtener historial de estados
            $query = "SELECT h.*, 
                      ea.nombre as estado_anterior_nombre, ea.color as estado_anterior_color,
                      en.nombre as estado_nuevo_nombre, en.color as estado_nuevo_color,
                      u.nombre as usuario_nombre, u.apellido as usuario_apellido
                      FROM historial_estados_solicitud h
                      LEFT JOIN estados_solicitud ea ON h.estado_anterior_id = ea.id
                      JOIN estados_solicitud en ON h.estado_nuevo_id = en.id
                      JOIN usuarios u ON h.usuario_id = u.id
                      WHERE h.solicitud_id = :solicitud_id
                      ORDER BY h.created_at DESC";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":solicitud_id", $id);
            $stmt->execute();
            
            $solicitud['historial'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        return $solicitud;
    }
    
    public function findByCodigoReserva($codigo) {
        $query = "SELECT s.*, 
                  u.nombre as usuario_nombre, u.apellido as usuario_apellido, u.email as usuario_email,
                  e.nombre as escenario_nombre, l.nombre as escenario_localidad,
                  p.nombre as proposito_nombre,
                  es.nombre as estado_nombre, es.color as estado_color,
                  a.nombre as admin_nombre, a.apellido as admin_apellido
                  FROM " . $this->table_name . " s
                  JOIN usuarios u ON s.usuario_id = u.id
                  JOIN escenarios e ON s.escenario_id = e.id
                  JOIN localidades l ON e.localidad_id = l.id
                  JOIN propositos_reserva p ON s.proposito_id = p.id
                  JOIN estados_solicitud es ON s.estado_id = es.id
                  LEFT JOIN usuarios a ON s.admin_id = a.id
                  WHERE s.codigo_reserva = :codigo";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":codigo", $codigo);
        $stmt->execute();
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public function getAll($page = 1, $limit = 10, $filters = []) {
        $offset = ($page - 1) * $limit;
        
        $query = "SELECT s.*, 
                  u.nombre as usuario_nombre, u.apellido as usuario_apellido, u.email as usuario_email,
                  e.nombre as escenario_nombre, l.nombre as escenario_localidad,
                  p.nombre as proposito_nombre,
                  es.nombre as estado_nombre, es.color as estado_color,
                  a.nombre as admin_nombre, a.apellido as admin_apellido
                  FROM " . $this->table_name . " s
                  JOIN usuarios u ON s.usuario_id = u.id
                  JOIN escenarios e ON s.escenario_id = e.id
                  JOIN localidades l ON e.localidad_id = l.id
                  JOIN propositos_reserva p ON s.proposito_id = p.id
                  JOIN estados_solicitud es ON s.estado_id = es.id
                  LEFT JOIN usuarios a ON s.admin_id = a.id";
        
        // Aplicar filtros si existen
        if (!empty($filters)) {
            $query .= " WHERE ";
            $conditions = [];
            
            if (isset($filters['usuario_id'])) {
                $conditions[] = "s.usuario_id = :usuario_id";
            }
            
            if (isset($filters['escenario_id'])) {
                $conditions[] = "s.escenario_id = :escenario_id";
            }
            
            if (isset($filters['estado_id'])) {
                $conditions[] = "s.estado_id = :estado_id";
            }
            
            if (isset($filters['fecha_desde'])) {
                $conditions[] = "s.fecha_reserva >= :fecha_desde";
            }
            
            if (isset($filters['fecha_hasta'])) {
                $conditions[] = "s.fecha_reserva <= :fecha_hasta";
            }
            
            if (isset($filters['search'])) {
                $conditions[] = "(s.codigo_reserva LIKE :search OR e.nombre LIKE :search OR u.nombre LIKE :search OR u.apellido LIKE :search)";
            }
            
            $query .= implode(" AND ", $conditions);
        }
        
        $query .= " ORDER BY s.fecha_reserva DESC, s.hora_inicio ASC LIMIT :limit OFFSET :offset";
        
        $stmt = $this->conn->prepare($query);
        
        // Vincular parámetros de filtro
        if (!empty($filters)) {
            if (isset($filters['usuario_id'])) {
                $stmt->bindParam(":usuario_id", $filters['usuario_id']);
            }
            
            if (isset($filters['escenario_id'])) {
                $stmt->bindParam(":escenario_id", $filters['escenario_id']);
            }
            
            if (isset($filters['estado_id'])) {
                $stmt->bindParam(":estado_id", $filters['estado_id']);
            }
            
            if (isset($filters['fecha_desde'])) {
                $stmt->bindParam(":fecha_desde", $filters['fecha_desde']);
            }
            
            if (isset($filters['fecha_hasta'])) {
                $stmt->bindParam(":fecha_hasta", $filters['fecha_hasta']);
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
        $count_query = "SELECT COUNT(*) as total 
                        FROM " . $this->table_name . " s
                        JOIN usuarios u ON s.usuario_id = u.id
                        JOIN escenarios e ON s.escenario_id = e.id
                        JOIN localidades l ON e.localidad_id = l.id
                        JOIN propositos_reserva p ON s.proposito_id = p.id
                        JOIN estados_solicitud es ON s.estado_id = es.id
                        LEFT JOIN usuarios a ON s.admin_id = a.id";
        
        if (!empty($filters)) {
            $count_query .= " WHERE ";
            $conditions = [];
            
            if (isset($filters['usuario_id'])) {
                $conditions[] = "s.usuario_id = :usuario_id";
            }
            
            if (isset($filters['escenario_id'])) {
                $conditions[] = "s.escenario_id = :escenario_id";
            }
            
            if (isset($filters['estado_id'])) {
                $conditions[] = "s.estado_id = :estado_id";
            }
            
            if (isset($filters['fecha_desde'])) {
                $conditions[] = "s.fecha_reserva >= :fecha_desde";
            }
            
            if (isset($filters['fecha_hasta'])) {
                $conditions[] = "s.fecha_reserva <= :fecha_hasta";
            }
            
            if (isset($filters['search'])) {
                $conditions[] = "(s.codigo_reserva LIKE :search OR e.nombre LIKE :search OR u.nombre LIKE :search OR u.apellido LIKE :search)";
            }
            
            $count_query .= implode(" AND ", $conditions);
        }
        
        $count_stmt = $this->conn->prepare($count_query);
        
        // Vincular parámetros de filtro para la consulta de conteo
        if (!empty($filters)) {
            if (isset($filters['usuario_id'])) {
                $count_stmt->bindParam(":usuario_id", $filters['usuario_id']);
            }
            
            if (isset($filters['escenario_id'])) {
                $count_stmt->bindParam(":escenario_id", $filters['escenario_id']);
            }
            
            if (isset($filters['estado_id'])) {
                $count_stmt->bindParam(":estado_id", $filters['estado_id']);
            }
            
            if (isset($filters['fecha_desde'])) {
                $count_stmt->bindParam(":fecha_desde", $filters['fecha_desde']);
            }
            
            if (isset($filters['fecha_hasta'])) {
                $count_stmt->bindParam(":fecha_hasta", $filters['fecha_hasta']);
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
    
    public function create($data) {
        $this->conn->beginTransaction();
        
        try {
            // Generar código único de reserva
            $codigo = 'RES-' . date('Ymd', strtotime($data['fecha_reserva'])) . '-' . rand(1000, 9999);
            
            // Obtener el ID del estado "creada"
            $query = "SELECT id FROM estados_solicitud WHERE nombre = 'creada' LIMIT 1";
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            $estado = $stmt->fetch(PDO::FETCH_ASSOC);
            $estado_id = $estado['id'];
            
            // Insertar la solicitud
            $query = "INSERT INTO " . $this->table_name . "
                      (usuario_id, escenario_id, fecha_reserva, hora_inicio, hora_fin, 
                       proposito_id, num_participantes, estado_id, notas, codigo_reserva, created_at, updated_at)
                      VALUES
                      (:usuario_id, :escenario_id, :fecha_reserva, :hora_inicio, :hora_fin, 
                       :proposito_id, :num_participantes, :estado_id, :notas, :codigo_reserva, NOW(), NOW())";
            
            $stmt = $this->conn->prepare($query);
            
            // Sanitizar y vincular datos
            $usuario_id = $data['usuario_id'];
            $escenario_id = $data['escenario_id'];
            $fecha_reserva = $data['fecha_reserva'];
            $hora_inicio = $data['hora_inicio'];
            $hora_fin = $data['hora_fin'];
            $proposito_id = $data['proposito_id'];
            $num_participantes = $data['num_participantes'];
            $notas = isset($data['notas']) ? $data['notas'] : '';
            
            $stmt->bindParam(":usuario_id", $usuario_id);
            $stmt->bindParam(":escenario_id", $escenario_id);
            $stmt->bindParam(":fecha_reserva", $fecha_reserva);
            $stmt->bindParam(":hora_inicio", $hora_inicio);
            $stmt->bindParam(":hora_fin", $hora_fin);
            $stmt->bindParam(":proposito_id", $proposito_id);
            $stmt->bindParam(":num_participantes", $num_participantes);
            $stmt->bindParam(":estado_id", $estado_id);
            $stmt->bindParam(":notas", $notas);
            $stmt->bindParam(":codigo_reserva", $codigo);
            
            $stmt->execute();
            
            $solicitud_id = $this->conn->lastInsertId();
            
            // Crear notificación para el usuario
            $query = "INSERT INTO notificaciones
                      (usuario_id, titulo, mensaje, tipo, url, created_at)
                      VALUES
                      (:usuario_id, :titulo, :mensaje, :tipo, :url, NOW())";
            
            $stmt = $this->conn->prepare($query);
            
            $titulo = 'Solicitud creada';
            $mensaje = 'Tu solicitud de reserva para el ' . date('d/m/Y', strtotime($fecha_reserva)) . 
                       ' ha sido creada exitosamente. Código: ' . $codigo;
            $tipo = 'success';
            $url = '/solicitudes/' . $solicitud_id;
            
            $stmt->bindParam(":usuario_id", $usuario_id);
            $stmt->bindParam(":titulo", $titulo);
            $stmt->bindParam(":mensaje", $mensaje);
            $stmt->bindParam(":tipo", $tipo);
            $stmt->bindParam(":url", $url);
            
            $stmt->execute();
            
            // Notificar a los administradores
            $query = "SELECT id FROM usuarios WHERE rol_id = 1 AND estado = 'activo'";
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            $admins = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Obtener nombre del escenario
            $query = "SELECT nombre FROM escenarios WHERE id = :escenario_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":escenario_id", $escenario_id);
            $stmt->execute();
            $escenario = $stmt->fetch(PDO::FETCH_ASSOC);
            
            foreach ($admins as $admin) {
                $query = "INSERT INTO notificaciones
                          (usuario_id, titulo, mensaje, tipo, url, created_at)
                          VALUES
                          (:usuario_id, :titulo, :mensaje, :tipo, :url, NOW())";
                
                $stmt = $this->conn->prepare($query);
                
                $titulo = 'Nueva solicitud de reserva';
                $mensaje = 'Se ha recibido una nueva solicitud de reserva para el escenario ' . 
                           $escenario['nombre'] . ' el día ' . date('d/m/Y', strtotime($fecha_reserva));
                $tipo = 'info';
                $url = '/admin/solicitudes/' . $solicitud_id;
                
                $stmt->bindParam(":usuario_id", $admin['id']);
                $stmt->bindParam(":titulo", $titulo);
                $stmt->bindParam(":mensaje", $mensaje);
                $stmt->bindParam(":tipo", $tipo);
                $stmt->bindParam(":url", $url);
                
                $stmt->execute();
            }
            
            $this->conn->commit();
            return [
                'solicitud_id' => $solicitud_id,
                'codigo_reserva' => $codigo
            ];
            
        } catch (\Exception $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }
    
    public function cambiarEstado($id, $nuevo_estado, $admin_id, $admin_notas = '') {
        $this->conn->beginTransaction();
        
        try {
            // Obtener información actual de la solicitud
            $query = "SELECT s.estado_id, s.usuario_id, e.nombre as escenario_nombre, s.fecha_reserva
                      FROM " . $this->table_name . " s
                      JOIN escenarios e ON s.escenario_id = e.id
                      WHERE s.id = :id";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":id", $id);
            $stmt->execute();
            
            $solicitud = $stmt->fetch(PDO::FETCH_ASSOC);
            $estado_anterior_id = $solicitud['estado_id'];
            $usuario_id = $solicitud['usuario_id'];
            $escenario_nombre = $solicitud['escenario_nombre'];
            $fecha_reserva = $solicitud['fecha_reserva'];
            
            // Obtener ID del nuevo estado
            $query = "SELECT id FROM estados_solicitud WHERE nombre = :nombre LIMIT 1";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":nombre", $nuevo_estado);
            $stmt->execute();
            $estado = $stmt->fetch(PDO::FETCH_ASSOC);
            $estado_nuevo_id = $estado['id'];
            
            // Actualizar la solicitud
            $query = "UPDATE " . $this->table_name . "
                      SET estado_id = :estado_id, admin_id = :admin_id, admin_notas = :admin_notas, fecha_respuesta = NOW(), updated_at = NOW()
                      WHERE id = :id";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":estado_id", $estado_nuevo_id);
            $stmt->bindParam(":admin_id", $admin_id);
            $stmt->bindParam(":admin_notas", $admin_notas);
            $stmt->bindParam(":id", $id);
            
            $stmt->execute();
            
            // Registrar en el historial
            $query = "INSERT INTO historial_estados_solicitud
                      (solicitud_id, estado_anterior_id, estado_nuevo_id, usuario_id, notas, created_at)
                      VALUES
                      (:solicitud_id, :estado_anterior_id, :estado_nuevo_id, :usuario_id, :notas, NOW())";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":solicitud_id", $id);
            $stmt->bindParam(":estado_anterior_id", $estado_anterior_id);
            $stmt->bindParam(":estado_nuevo_id", $estado_nuevo_id);
            $stmt->bindParam(":usuario_id", $admin_id);
            $stmt->bindParam(":notas", $admin_notas);
            
            $stmt->execute();
            
            // Crear notificación para el usuario
            $query = "INSERT INTO notificaciones
                      (usuario_id, titulo, mensaje, tipo, url, created_at)
                      VALUES
                      (:usuario_id, :titulo, :mensaje, :tipo, :url, NOW())";
            
            $stmt = $this->conn->prepare($query);
            
            $titulo = 'Solicitud ' . ($nuevo_estado == 'aprobada' ? 'aprobada' : 
                                     ($nuevo_estado == 'rechazada' ? 'rechazada' : 
                                     ($nuevo_estado == 'en_proceso' ? 'en proceso' : 'actualizada')));
            
            $mensaje = 'Tu solicitud de reserva para el ' . date('d/m/Y', strtotime($fecha_reserva)) . 
                       ' en el escenario ' . $escenario_nombre . ' ha sido ' . 
                       ($nuevo_estado == 'aprobada' ? 'aprobada. ¡Felicitaciones!' : 
                       ($nuevo_estado == 'rechazada' ? 'rechazada. Consulta los detalles para más información.' : 
                       ($nuevo_estado == 'en_proceso' ? 'puesta en proceso de revisión.' : 'actualizada.')));
            
            $tipo = ($nuevo_estado == 'aprobada' ? 'success' : 
                    ($nuevo_estado == 'rechazada' ? 'error' : 
                    ($nuevo_estado == 'en_proceso' ? 'info' : 'info')));
            
            $url = '/solicitudes/' . $id;
            
            $stmt->bindParam(":usuario_id", $usuario_id);
            $stmt->bindParam(":titulo", $titulo);
            $stmt->bindParam(":mensaje", $mensaje);
            $stmt->bindParam(":tipo", $tipo);
            $stmt->bindParam(":url", $url);
            
            $stmt->execute();
            
            $this->conn->commit();
            return true;
            
        } catch (\Exception $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }
    
    public function getEstados() {
        $query = "SELECT * FROM estados_solicitud ORDER BY id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getPropositos() {
        $query = "SELECT * FROM propositos_reserva ORDER BY id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}