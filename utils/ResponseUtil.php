<?php
namespace App\Utils;

class ResponseUtil {
    public static function sendResponse($data, $message = "", $code = 200) {
        http_response_code($code);
        echo json_encode([
            'success' => true,
            'message' => $message,
            'data' => $data
        ]);
    }
    
    public static function sendError($message, $code = 400, $errors = []) {
        http_response_code($code);
        echo json_encode([
            'success' => false,
            'message' => $message,
            'errors' => $errors
        ]);
    }
}