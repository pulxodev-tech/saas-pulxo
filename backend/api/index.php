<?php

// ── CORS — handle before Laravel boots so Vercel edge doesn't strip headers ──
$allowedOrigins = [
    'http://localhost:4200',
    'http://localhost:4201',
    'https://pulxo-app.vercel.app',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept');
}

// Respond immediately to preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Forward all other requests to the Laravel index.php
try {
    require __DIR__ . '/../public/index.php';
} catch (\Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error'   => $e->getMessage(),
        'class'   => get_class($e),
        'file'    => str_replace(dirname(__DIR__), '', $e->getFile()),
        'line'    => $e->getLine(),
        'trace'   => array_map(
            fn($t) => ($t['file'] ?? '?') . ':' . ($t['line'] ?? '?'),
            array_slice($e->getTrace(), 0, 8)
        ),
    ]);
}
