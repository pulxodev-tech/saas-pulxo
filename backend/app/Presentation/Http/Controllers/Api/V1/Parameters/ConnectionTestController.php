<?php

namespace App\Presentation\Http\Controllers\Api\V1\Parameters;

use App\Http\Controllers\Controller;
use App\Infrastructure\Persistence\Eloquent\Models\Parameter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ConnectionTestController extends Controller
{
    private array $log = [];

    /**
     * POST /api/v1/parameters/test/{group}
     * Validates credentials/connectivity without sending real messages.
     */
    public function test(Request $request, string $group): JsonResponse
    {
        $this->log = [];

        $method = 'test' . str_replace('_', '', ucwords($group, '_'));

        if (!method_exists($this, $method)) {
            return response()->json([
                'success' => false,
                'message' => "No hay prueba de conexión disponible para el grupo '{$group}'.",
                'log'     => [],
            ], 422);
        }

        return $this->$method();
    }

    /**
     * POST /api/v1/parameters/send-test/{group}
     * Sends a real message/call to a target (phone or email) for live testing.
     */
    public function sendTest(Request $request, string $group): JsonResponse
    {
        $this->log = [];

        $method = 'sendTest' . str_replace('_', '', ucwords($group, '_'));

        if (!method_exists($this, $method)) {
            return response()->json([
                'success' => false,
                'message' => "Prueba de envío no disponible para este grupo.",
                'log'     => [],
            ], 422);
        }

        return $this->$method($request);
    }

    // ── WhatsApp OTP (Cuenta 1) ────────────────────────────────────────────────

    private function testWhatsappOtp(): JsonResponse
    {
        $phoneId = $this->get('wa_otp_phone_id');
        $token   = $this->getDecrypted('wa_otp_token');
        $apiUrl  = $this->get('wa_otp_api_url') ?? 'https://graph.facebook.com/v19.0';

        if (!$phoneId || !$token) {
            return $this->fail('Configura Phone Number ID y Access Token antes de probar.');
        }

        $url = rtrim($apiUrl, '/') . "/{$phoneId}?fields=id,name,display_phone_number,quality_rating,status";
        $this->addLog('info', "GET {$url}");

        try {
            $resp = Http::withToken($token)->timeout(10)->get($url);
            $this->addLog(
                $resp->successful() ? 'success' : 'error',
                "HTTP {$resp->status()} — " . substr($resp->body(), 0, 400)
            );

            if ($resp->successful()) {
                $data = $resp->json();
                return $this->ok('Conexión exitosa con WhatsApp Business (Cuenta 1)', [
                    'Número'  => $data['display_phone_number'] ?? $phoneId,
                    'Nombre'  => $data['name']           ?? '—',
                    'Calidad' => $data['quality_rating']  ?? '—',
                    'Estado'  => $data['status']          ?? '—',
                ]);
            }

            $errMsg = $resp->json('error.message') ?? $resp->body();
            return $this->fail("Error Meta API: {$errMsg}");

        } catch (\Throwable $e) {
            $this->addLog('error', $e->getMessage());
            return $this->fail('Timeout o error de red: ' . $e->getMessage());
        }
    }

    // ── WhatsApp Templates (Cuenta 2) ─────────────────────────────────────────

    private function testWhatsappTemplate(): JsonResponse
    {
        $phoneId = $this->get('wa_tpl_phone_id');
        $token   = $this->getDecrypted('wa_tpl_token');
        $apiUrl  = $this->get('wa_tpl_api_url') ?? 'https://graph.facebook.com/v19.0';

        if (!$phoneId || !$token) {
            return $this->fail('Configura Phone Number ID y Access Token (Cuenta 2) antes de probar.');
        }

        $url = rtrim($apiUrl, '/') . "/{$phoneId}?fields=id,name,display_phone_number,quality_rating,status";
        $this->addLog('info', "GET {$url}");

        try {
            $resp = Http::withToken($token)->timeout(10)->get($url);
            $this->addLog(
                $resp->successful() ? 'success' : 'error',
                "HTTP {$resp->status()} — " . substr($resp->body(), 0, 400)
            );

            if ($resp->successful()) {
                $data = $resp->json();
                return $this->ok('Conexión exitosa con WhatsApp Business (Cuenta 2 — Templates)', [
                    'Número'  => $data['display_phone_number'] ?? $phoneId,
                    'Nombre'  => $data['name']           ?? '—',
                    'Calidad' => $data['quality_rating']  ?? '—',
                    'Estado'  => $data['status']          ?? '—',
                ]);
            }

            $errMsg = $resp->json('error.message') ?? $resp->body();
            return $this->fail("Error Meta API: {$errMsg}");

        } catch (\Throwable $e) {
            $this->addLog('error', $e->getMessage());
            return $this->fail('Timeout o error de red: ' . $e->getMessage());
        }
    }

    // ── SMS ───────────────────────────────────────────────────────────────────

    private function testSms(): JsonResponse
    {
        $url = $this->get('sms_url');

        if (!$url) {
            return $this->fail('Configura la URL del proveedor SMS antes de probar.');
        }

        $this->addLog('info', "HEAD {$url}");

        try {
            $resp       = Http::timeout(8)->head($url);
            $statusCode = $resp->status();
            $this->addLog($statusCode < 500 ? 'success' : 'error', "HTTP {$statusCode}");

            if ($statusCode < 500) {
                return $this->ok("Servidor SMS responde correctamente (HTTP {$statusCode})", [
                    'URL'    => $url,
                    'Status' => $statusCode,
                    'Nota'   => 'El endpoint responde. Para validar credenciales envía un SMS de prueba real.',
                ]);
            }

            return $this->fail("Servidor SMS responde con error {$statusCode}. Revisa la URL.");

        } catch (\Throwable $e) {
            $this->addLog('error', $e->getMessage());
            return $this->fail('No se pudo conectar al proveedor SMS: ' . $e->getMessage());
        }
    }

    // ── Llamadas ──────────────────────────────────────────────────────────────

    private function testCalls(): JsonResponse
    {
        $url = $this->get('calls_url');

        if (!$url) {
            return $this->fail('Configura la URL del proveedor de llamadas antes de probar.');
        }

        $this->addLog('info', "HEAD {$url}");

        try {
            $resp       = Http::timeout(8)->head($url);
            $statusCode = $resp->status();
            $this->addLog($statusCode < 500 ? 'success' : 'error', "HTTP {$statusCode}");

            if ($statusCode < 500) {
                return $this->ok("Servidor de llamadas responde (HTTP {$statusCode})", [
                    'URL'    => $url,
                    'Status' => $statusCode,
                ]);
            }

            return $this->fail("Servidor responde con error {$statusCode}.");

        } catch (\Throwable $e) {
            $this->addLog('error', $e->getMessage());
            return $this->fail('No se pudo conectar: ' . $e->getMessage());
        }
    }

    // ── Email SMTP ────────────────────────────────────────────────────────────

    private function testEmail(): JsonResponse
    {
        $host = $this->get('mail_host');
        $port = (int) ($this->get('mail_port') ?? 587);
        $enc  = $this->get('mail_encryption') ?? 'tls';

        if (!$host) {
            return $this->fail('Configura el host SMTP antes de probar.');
        }

        $connectHost = $enc === 'ssl' ? "ssl://{$host}" : $host;
        $this->addLog('info', "fsockopen({$connectHost}, {$port}, timeout=8)");

        $socket = @fsockopen($connectHost, $port, $errno, $errstr, 8);

        if ($socket) {
            $banner = fgets($socket, 512);
            fclose($socket);
            $banner = trim($banner);
            $this->addLog('success', "Banner del servidor: {$banner}");
            return $this->ok("Conexión SMTP exitosa a {$host}:{$port}", [
                'Host'   => $host,
                'Puerto' => $port,
                'Banner' => $banner,
            ]);
        }

        $this->addLog('error', "Error {$errno}: {$errstr}");
        return $this->fail("No se pudo conectar a {$host}:{$port} — {$errstr} (error {$errno})");
    }

    // ── Google Maps ───────────────────────────────────────────────────────────

    private function testMaps(): JsonResponse
    {
        $apiKey  = $this->getDecrypted('maps_google_key');
        $address = $this->get('maps_test_address') ?? 'Bogotá, Colombia';

        if (!$apiKey) {
            return $this->fail('Configura la API Key de Google Maps antes de probar.');
        }

        $url = 'https://maps.googleapis.com/maps/api/geocode/json';
        $this->addLog('info', "GET {$url}?address=" . urlencode($address));

        try {
            $resp   = Http::timeout(10)->get($url, ['address' => $address, 'key' => $apiKey]);
            $data   = $resp->json();
            $status = $data['status'] ?? 'ERROR';

            $this->addLog($status === 'OK' ? 'success' : 'error', "Google status: {$status}");

            if ($status === 'OK') {
                $result = $data['results'][0] ?? [];
                $loc    = $result['geometry']['location'] ?? [];
                return $this->ok('Google Maps API funcionando correctamente', [
                    'Dirección geocodificada' => $result['formatted_address'] ?? '—',
                    'Lat'                     => $loc['lat'] ?? '—',
                    'Lng'                     => $loc['lng'] ?? '—',
                    'API Status'              => $status,
                ]);
            }

            if ($status === 'REQUEST_DENIED') {
                return $this->fail('API Key inválida o sin permisos de Geocoding API habilitados.');
            }

            return $this->fail("Error de Google Maps: {$status}");

        } catch (\Throwable $e) {
            $this->addLog('error', $e->getMessage());
            return $this->fail('Error de red al contactar Google Maps: ' . $e->getMessage());
        }
    }

    // ── n8n ───────────────────────────────────────────────────────────────────

    private function testN8n(): JsonResponse
    {
        $baseUrl = $this->get('n8n_base_url');
        $apiKey  = $this->getDecrypted('n8n_api_key');

        if (!$baseUrl) {
            return $this->fail('Configura la URL base de n8n antes de probar.');
        }

        $baseUrl    = rtrim($baseUrl, '/');
        $healthUrl  = "{$baseUrl}/healthz";
        $this->addLog('info', "GET {$healthUrl}");

        try {
            $req  = Http::timeout(8);
            if ($apiKey) {
                $req = $req->withHeaders(['X-N8N-API-KEY' => $apiKey]);
            }

            $resp = $req->get($healthUrl);
            $this->addLog(
                $resp->successful() ? 'success' : 'info',
                "HTTP {$resp->status()} — " . substr($resp->body(), 0, 200)
            );

            if ($resp->successful()) {
                return $this->ok('n8n está activo y responde correctamente', [
                    'URL'       => $baseUrl,
                    'Status'    => $resp->status(),
                    'Respuesta' => substr($resp->body(), 0, 100),
                ]);
            }

            // Fallback: try the n8n API endpoint
            $apiUrl = "{$baseUrl}/api/v1/workflows?limit=1";
            $this->addLog('info', "GET {$apiUrl} (fallback)");
            $resp2 = $req->get($apiUrl);
            $this->addLog(
                $resp2->successful() ? 'success' : 'error',
                "HTTP {$resp2->status()}"
            );

            if ($resp2->successful()) {
                return $this->ok('n8n API responde correctamente', [
                    'URL'    => $baseUrl,
                    'Status' => $resp2->status(),
                ]);
            }

            return $this->fail("n8n responde con HTTP {$resp->status()}. Verifica la URL y la API Key.");

        } catch (\Throwable $e) {
            $this->addLog('error', $e->getMessage());
            return $this->fail('No se pudo conectar a n8n: ' . $e->getMessage());
        }
    }

    // ── Send Test methods ─────────────────────────────────────────────────────

    private function sendTestWhatsappOtp(Request $request): JsonResponse
    {
        $phone    = $request->validate(['phone' => 'required|string'])['phone'];
        $phoneId  = $this->get('wa_otp_phone_id');
        $token    = $this->getDecrypted('wa_otp_token');
        $apiUrl   = $this->get('wa_otp_api_url') ?? 'https://graph.facebook.com/v19.0';
        $template = $this->get('wa_otp_template') ?? 'otp_autenticacion';
        $language = $this->get('wa_otp_language') ?? 'es_CO';

        if (!$phoneId || !$token) {
            return $this->fail('Configura Phone Number ID y Access Token antes de probar.');
        }

        $to  = $this->normalizePhone($phone);
        $url = rtrim($apiUrl, '/') . "/{$phoneId}/messages";
        $this->addLog('info', "POST {$url} → to={$to} template={$template}");

        try {
            $resp = Http::withToken($token)->timeout(15)->post($url, [
                'messaging_product' => 'whatsapp',
                'to'                => $to,
                'type'              => 'template',
                'template'          => [
                    'name'       => $template,
                    'language'   => ['code' => $language],
                    'components' => [[
                        'type'       => 'body',
                        'parameters' => [['type' => 'text', 'text' => '1234']],
                    ]],
                ],
            ]);

            $this->addLog(
                $resp->successful() ? 'success' : 'error',
                "HTTP {$resp->status()} — " . substr($resp->body(), 0, 400)
            );

            if ($resp->successful()) {
                $msgId = $resp->json('messages.0.id') ?? '—';
                return $this->ok("Mensaje OTP enviado a {$phone} (código de prueba: 1234)", [
                    'Destino'    => $phone,
                    'Normalizado'=> $to,
                    'Plantilla'  => $template,
                    'Message ID' => $msgId,
                ]);
            }

            return $this->fail('Error Meta API: ' . ($resp->json('error.message') ?? $resp->body()));
        } catch (\Throwable $e) {
            $this->addLog('error', $e->getMessage());
            return $this->fail('Error de red: ' . $e->getMessage());
        }
    }

    private function sendTestWhatsappTemplate(Request $request): JsonResponse
    {
        // Account 2 templates are managed via n8n — trigger the OTP webhook as a test
        $phone      = $request->validate(['phone' => 'required|string'])['phone'];
        $webhook    = $this->get('n8n_webhook_templates');
        $phoneId    = $this->get('wa_tpl_phone_id');
        $token      = $this->getDecrypted('wa_tpl_token');
        $apiUrl     = $this->get('wa_tpl_api_url') ?? 'https://graph.facebook.com/v19.0';

        // If n8n webhook is configured, trigger it
        if ($webhook) {
            $to = $this->normalizePhone($phone);
            $this->addLog('info', "POST {$webhook} (n8n test payload)");
            try {
                $resp = Http::timeout(15)->post($webhook, [
                    'type'  => 'test',
                    'phone' => $to,
                    'data'  => ['mensaje' => 'Prueba de integración Pulxo — Cuenta 2'],
                ]);
                $this->addLog($resp->successful() ? 'success' : 'error', "HTTP {$resp->status()} — " . substr($resp->body(), 0, 300));
                if ($resp->successful()) {
                    return $this->ok("Payload de prueba enviado a n8n → Webhook Templates", [
                        'Webhook' => $webhook,
                        'Destino' => $phone,
                        'Status'  => $resp->status(),
                    ]);
                }
            } catch (\Throwable $e) {
                $this->addLog('error', $e->getMessage());
            }
        }

        // Fallback: validate credentials directly on Meta API
        if (!$phoneId || !$token) {
            return $this->fail('Configura el Webhook de Templates (n8n) o las credenciales de la Cuenta 2.');
        }
        $url = rtrim($apiUrl, '/') . "/{$phoneId}?fields=id,name,display_phone_number";
        $this->addLog('info', "GET {$url} (fallback credential check)");
        try {
            $resp = Http::withToken($token)->timeout(10)->get($url);
            $this->addLog($resp->successful() ? 'success' : 'error', "HTTP {$resp->status()}");
            if ($resp->successful()) {
                return $this->ok('Credenciales de la Cuenta 2 válidas (configura el webhook n8n para prueba completa)', [
                    'Número' => $resp->json('display_phone_number') ?? $phoneId,
                    'Nombre' => $resp->json('name') ?? '—',
                ]);
            }
            return $this->fail('Error de credenciales Cuenta 2: ' . ($resp->json('error.message') ?? $resp->body()));
        } catch (\Throwable $e) {
            $this->addLog('error', $e->getMessage());
            return $this->fail('Error de red: ' . $e->getMessage());
        }
    }

    private function sendTestSms(Request $request): JsonResponse
    {
        $data       = $request->validate(['phone' => 'required|string', 'message' => 'nullable|string|max:160']);
        $phone      = $data['phone'];
        $url        = $this->get('sms_url');
        $apiKey     = $this->getDecrypted('sms_api_key');
        $method     = strtoupper($this->get('sms_method') ?? 'POST');
        $phoneField = $this->get('sms_phone_field')   ?? 'numero';
        $msgField   = $this->get('sms_message_field') ?? 'sms';
        $keyField   = $this->get('sms_key_field')     ?? 'apikey';

        if (!$url) {
            return $this->fail('Configura la URL del proveedor SMS antes de probar.');
        }

        $to      = $this->normalizePhone($phone);
        $message = $data['message'] ?? 'Prueba de integración SMS — Pulxo. Si recibes esto el servicio está funcionando.';
        $body    = [$phoneField => $to, $msgField => $message];
        if ($apiKey) $body[$keyField] = $apiKey;

        $this->addLog('info', "{$method} {$url}");
        $this->addLog('info', "Payload: {$phoneField}={$to} | {$msgField}=\"{$message}\"");

        try {
            $req  = Http::timeout(15);
            $resp = $method === 'GET' ? $req->get($url, $body) : $req->post($url, $body);

            $this->addLog(
                $resp->successful() ? 'success' : 'error',
                "HTTP {$resp->status()} — " . substr($resp->body(), 0, 400)
            );

            if ($resp->successful()) {
                return $this->ok("SMS enviado a {$to}", [
                    'Número enviado' => $to,
                    'Texto enviado'  => $message,
                    'Campo teléfono' => $phoneField,
                    'Campo mensaje'  => $msgField,
                    'Respuesta'      => substr($resp->body(), 0, 150),
                ]);
            }

            return $this->fail("Proveedor SMS responde HTTP {$resp->status()}: " . substr($resp->body(), 0, 200));
        } catch (\Throwable $e) {
            $this->addLog('error', $e->getMessage());
            return $this->fail('Error de red: ' . $e->getMessage());
        }
    }

    private function sendTestCalls(Request $request): JsonResponse
    {
        $phone      = $request->validate(['phone' => 'required|string'])['phone'];
        $url        = $this->get('calls_url');
        $apiKey     = $this->getDecrypted('calls_api_key');
        $method     = strtoupper($this->get('calls_method') ?? 'POST');
        $phoneField = $this->get('calls_phone_field') ?? 'phone';
        $audioUrl   = $this->get('calls_audio_url');

        if (!$url) {
            return $this->fail('Configura la URL del proveedor de llamadas antes de probar.');
        }

        $to   = $this->normalizePhone($phone);
        $body = [$phoneField => $to];
        if ($audioUrl) $body['audio_url'] = $audioUrl;
        if ($apiKey)   $body['api_key']   = $apiKey;

        $this->addLog('info', "{$method} {$url} → {$phoneField}={$to}");

        try {
            $req  = Http::timeout(15);
            $resp = $method === 'GET' ? $req->get($url, $body) : $req->post($url, $body);

            $this->addLog(
                $resp->successful() ? 'success' : 'error',
                "HTTP {$resp->status()} — " . substr($resp->body(), 0, 400)
            );

            if ($resp->successful()) {
                return $this->ok("Llamada de prueba iniciada a {$phone}", [
                    'Destino'   => $phone,
                    'Audio URL' => $audioUrl ?? '(no configurado)',
                    'Respuesta' => substr($resp->body(), 0, 150),
                ]);
            }

            return $this->fail("Proveedor de llamadas responde HTTP {$resp->status()}: " . substr($resp->body(), 0, 200));
        } catch (\Throwable $e) {
            $this->addLog('error', $e->getMessage());
            return $this->fail('Error de red: ' . $e->getMessage());
        }
    }

    private function sendTestEmail(Request $request): JsonResponse
    {
        $toEmail = $request->validate(['email' => 'required|email'])['email'];
        $host    = $this->get('mail_host');
        $port    = (int) ($this->get('mail_port') ?? 587);
        $enc     = $this->get('mail_encryption') ?? 'tls';
        $user    = $this->get('mail_username');
        $pass    = $this->getDecrypted('mail_password');
        $from    = $this->get('mail_from_address') ?? 'noreply@pulxo.co';
        $name    = $this->get('mail_from_name')    ?? 'Pulxo';

        if (!$host || !$user || !$pass) {
            return $this->fail('Configura Host, Usuario y Contraseña SMTP antes de probar.');
        }

        $this->addLog('info', "Configurando mailer SMTP: {$host}:{$port} enc={$enc}");

        try {
            // Temporarily override mail config for this request
            config([
                'mail.mailers.param_test.transport'   => 'smtp',
                'mail.mailers.param_test.host'         => $host,
                'mail.mailers.param_test.port'         => $port,
                'mail.mailers.param_test.encryption'   => $enc === 'none' ? null : $enc,
                'mail.mailers.param_test.username'     => $user,
                'mail.mailers.param_test.password'     => $pass,
                'mail.mailers.param_test.timeout'      => 15,
                'mail.from.address'                    => $from,
                'mail.from.name'                       => $name,
            ]);

            $this->addLog('info', "Enviando email de prueba a {$toEmail}...");

            \Illuminate\Support\Facades\Mail::mailer('param_test')
                ->to($toEmail)
                ->send(new \App\Mail\TestConnectionMail($name));

            $this->addLog('success', "Email enviado correctamente.");

            return $this->ok("Email de prueba enviado a {$toEmail}", [
                'Destino'   => $toEmail,
                'Remitente' => "{$name} <{$from}>",
                'Servidor'  => "{$host}:{$port}",
            ]);
        } catch (\Throwable $e) {
            $this->addLog('error', $e->getMessage());
            return $this->fail('Error al enviar email: ' . $e->getMessage());
        }
    }

    private function sendTestMaps(Request $request): JsonResponse
    {
        $address = $request->input('address', $this->get('maps_test_address') ?? 'Bogotá, Colombia');
        $apiKey  = $this->getDecrypted('maps_google_key');

        if (!$apiKey) {
            return $this->fail('Configura la API Key de Google Maps antes de probar.');
        }

        $url = 'https://maps.googleapis.com/maps/api/geocode/json';
        $this->addLog('info', "GET {$url}?address=" . urlencode($address));

        try {
            $resp   = Http::timeout(10)->get($url, ['address' => $address, 'key' => $apiKey]);
            $data   = $resp->json();
            $status = $data['status'] ?? 'ERROR';

            $this->addLog($status === 'OK' ? 'success' : 'error', "Google status: {$status}");

            if ($status === 'OK') {
                $result = $data['results'][0] ?? [];
                $loc    = $result['geometry']['location'] ?? [];
                return $this->ok("Dirección geocodificada correctamente", [
                    'Dirección ingresada'     => $address,
                    'Dirección normalizada'   => $result['formatted_address'] ?? '—',
                    'Latitud'                 => $loc['lat'] ?? '—',
                    'Longitud'                => $loc['lng'] ?? '—',
                ]);
            }

            return $this->fail("Google Maps no pudo geocodificar: {$status}");
        } catch (\Throwable $e) {
            $this->addLog('error', $e->getMessage());
            return $this->fail('Error de red: ' . $e->getMessage());
        }
    }

    private function sendTestN8n(Request $request): JsonResponse
    {
        $webhooks = [
            'Plantillas'  => $this->get('n8n_webhook_templates'),
            'OTP'         => $this->get('n8n_webhook_otp'),
            'Llamadas'    => $this->get('n8n_webhook_calls'),
        ];

        $configured = array_filter($webhooks);
        if (empty($configured)) {
            return $this->fail('No hay webhooks configurados en n8n. Configura al menos uno.');
        }

        $apiKey  = $this->getDecrypted('n8n_api_key');
        $results = [];
        $allOk   = true;

        foreach ($configured as $label => $url) {
            $this->addLog('info', "POST {$url} ({$label})");
            try {
                $req  = Http::timeout(10);
                if ($apiKey) $req = $req->withHeaders(['X-N8N-API-KEY' => $apiKey]);
                $resp = $req->post($url, [
                    'type'      => 'test',
                    'source'    => 'pulxo_parameters',
                    'webhook'   => $label,
                    'timestamp' => now()->toIso8601String(),
                ]);
                $ok = $resp->successful();
                $this->addLog($ok ? 'success' : 'error', "HTTP {$resp->status()} — " . substr($resp->body(), 0, 150));
                $results[$label] = $ok ? "✓ HTTP {$resp->status()}" : "✗ HTTP {$resp->status()}";
                if (!$ok) $allOk = false;
            } catch (\Throwable $e) {
                $this->addLog('error', "{$label}: " . $e->getMessage());
                $results[$label] = "✗ " . $e->getMessage();
                $allOk = false;
            }
        }

        $message = $allOk
            ? 'Todos los webhooks de n8n respondieron correctamente'
            : 'Algunos webhooks no respondieron correctamente';

        return $allOk ? $this->ok($message, $results) : $this->fail($message);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Get a plain (non-encrypted) parameter value. */
    private function get(string $key): ?string
    {
        $param = Parameter::where('key', $key)->first();
        if (!$param || !$param->value) return null;
        if ($param->is_encrypted) return null;
        return $param->value;
    }

    /** Get a parameter value, decrypting if needed. */
    private function getDecrypted(string $key): ?string
    {
        $param = Parameter::where('key', $key)->first();
        if (!$param || !$param->value) return null;
        try {
            return $param->is_encrypted ? decrypt($param->value) : $param->value;
        } catch (\Exception) {
            return null;
        }
    }

    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone);
        $prefix = $this->get('sms_phone_prefix') ?? '57';
        // If already has country code prefix, return as-is
        if (str_starts_with($digits, $prefix) && strlen($digits) > 10) return $digits;
        // 10-digit local number → prepend country code
        if (strlen($digits) === 10) return $prefix . $digits;
        return $digits;
    }

    private function addLog(string $level, string $message): void
    {
        $this->log[] = [
            'time'    => now()->format('H:i:s.v'),
            'level'   => $level,
            'message' => $message,
        ];
    }

    private function ok(string $message, array $details = []): JsonResponse
    {
        Log::info("[ConnectionTest OK] {$message}", $details);
        return response()->json([
            'success' => true,
            'message' => $message,
            'details' => $details,
            'log'     => $this->log,
        ]);
    }

    private function fail(string $message): JsonResponse
    {
        Log::warning("[ConnectionTest FAIL] {$message}");
        return response()->json([
            'success' => false,
            'message' => $message,
            'details' => [],
            'log'     => $this->log,
        ]);
    }
}
