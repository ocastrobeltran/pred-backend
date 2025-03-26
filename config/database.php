<?php
namespace App\Config;

use PDO;
use PDOException;

class Database {
    private $host;
    private $db_name;
    private $username;
    private $password;
    private $port;
    public $conn;

    public function __construct() {
        $dotenv = \Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
        $dotenv->load();

        $this->host = $_ENV['MYSQLHOST'] ?? null;
        $this->db_name = $_ENV['MYSQLDATABASE'] ?? null;
        $this->username = $_ENV['MYSQLUSER'] ?? null;
        $this->password = $_ENV['MYSQLPASSWORD'] ?? null;
        $this->port = $_ENV['MYSQLPORT'] ?? null;

        if (!$this->host || !$this->db_name || !$this->username || !$this->password || !$this->port) {
            throw new \Exception("Error: Faltan variables de entorno o están vacías");
        }
    }

    public function getConnection() {
        $this->conn = null;

        try {
            $dsn = "mysql:host={$this->host};dbname={$this->db_name};port={$this->port}";
            $this->conn = new PDO($dsn, $this->username, $this->password);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->exec("set names utf8");
        } catch(PDOException $e) {
            echo "Error de conexión: " . $e->getMessage();
        }

        return $this->conn;
    }
}