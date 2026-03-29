<?php

// ── Fix Vercel SCRIPT_NAME stripping ─────────────────────────────────────────
// Vercel sets SCRIPT_NAME=/api/index.php, causing Symfony to strip the /api/
// prefix from REQUEST_URI before passing it to Laravel's router.
// Setting SCRIPT_NAME to /index.php prevents this so the full path is preserved.
$_SERVER['SCRIPT_NAME']     = '/index.php';
$_SERVER['SCRIPT_FILENAME'] = __DIR__ . '/../public/index.php';
$_SERVER['PHP_SELF']        = '/index.php';

// Forward all requests to the Laravel entry point.
// CORS is handled by Laravel's HandleCors middleware (config/cors.php).
require __DIR__ . '/../public/index.php';
