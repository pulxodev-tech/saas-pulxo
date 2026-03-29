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

// ── Fix Vercel SCRIPT_NAME stripping ─────────────────────────────────────────
// Vercel sets SCRIPT_NAME=/api/index.php, causing Symfony to strip the /api/
// prefix from REQUEST_URI before passing it to Laravel's router.
// Setting SCRIPT_NAME to /index.php prevents this so the full path is preserved.
$_SERVER['SCRIPT_NAME']     = '/index.php';
$_SERVER['SCRIPT_FILENAME'] = __DIR__ . '/../public/index.php';
$_SERVER['PHP_SELF']        = '/index.php';

// Forward all other requests to the Laravel index.php
require __DIR__ . '/../public/index.php';
