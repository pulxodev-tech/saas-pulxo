<?php

namespace App\Domain\Parameters;

class ParameterDefinitions
{
    public static function groups(): array
    {
        return [

            // ── WhatsApp OTP — Cuenta 1 ──────────────────────────────────────────
            'whatsapp_otp' => [
                'label'       => 'WhatsApp OTP — Cuenta 1',
                'description' => 'Cuenta de WhatsApp Business para envío de códigos de verificación OTP a ciudadanos.',
                'icon'        => 'whatsapp',
                'color'       => 'green',
                'fields'      => [
                    [
                        'key'         => 'wa_otp_api_url',
                        'label'       => 'API URL (Meta Cloud)',
                        'type'        => 'url',
                        'encrypted'   => false,
                        'default'     => 'https://graph.facebook.com/v19.0',
                        'placeholder' => 'https://graph.facebook.com/v19.0',
                        'description' => 'URL base de la Meta Cloud API. Cambia la versión si es necesario.',
                    ],
                    [
                        'key'         => 'wa_otp_phone_id',
                        'label'       => 'Phone Number ID',
                        'type'        => 'text',
                        'encrypted'   => false,
                        'placeholder' => '123456789012345',
                        'description' => 'ID del número de teléfono registrado en Meta Business.',
                    ],
                    [
                        'key'         => 'wa_otp_token',
                        'label'       => 'Access Token',
                        'type'        => 'password',
                        'encrypted'   => true,
                        'placeholder' => 'EAAxxxxxx...',
                        'description' => 'Token de acceso permanente de la app de Meta. Guárdalo en secreto.',
                    ],
                    [
                        'key'         => 'wa_otp_template',
                        'label'       => 'Nombre de Plantilla OTP',
                        'type'        => 'text',
                        'encrypted'   => false,
                        'default'     => 'otp_autenticacion',
                        'placeholder' => 'otp_autenticacion',
                        'description' => 'Nombre exacto de la plantilla aprobada en Meta para OTP.',
                    ],
                    [
                        'key'         => 'wa_otp_language',
                        'label'       => 'Código de Idioma',
                        'type'        => 'text',
                        'encrypted'   => false,
                        'default'     => 'es_CO',
                        'placeholder' => 'es_CO',
                        'description' => 'Código de idioma de la plantilla (ej: es_CO, es, en_US).',
                    ],
                ],
            ],

            // ── WhatsApp Templates — Cuenta 2 ────────────────────────────────────
            'whatsapp_template' => [
                'label'       => 'WhatsApp Templates — Cuenta 2',
                'description' => 'Segunda cuenta de WhatsApp Business para plantillas de utilidad enviadas vía n8n.',
                'icon'        => 'whatsapp',
                'color'       => 'green',
                'fields'      => [
                    [
                        'key'         => 'wa_tpl_api_url',
                        'label'       => 'API URL (Meta Cloud)',
                        'type'        => 'url',
                        'encrypted'   => false,
                        'default'     => 'https://graph.facebook.com/v19.0',
                        'placeholder' => 'https://graph.facebook.com/v19.0',
                    ],
                    [
                        'key'         => 'wa_tpl_phone_id',
                        'label'       => 'Phone Number ID',
                        'type'        => 'text',
                        'encrypted'   => false,
                        'placeholder' => '123456789012345',
                    ],
                    [
                        'key'         => 'wa_tpl_token',
                        'label'       => 'Access Token',
                        'type'        => 'password',
                        'encrypted'   => true,
                        'placeholder' => 'EAAxxxxxx...',
                    ],
                    [
                        'key'         => 'wa_tpl_business_id',
                        'label'       => 'Business Account ID',
                        'type'        => 'text',
                        'encrypted'   => false,
                        'placeholder' => '123456789012345',
                        'description' => 'ID de la cuenta en Meta Business Manager (opcional, para consultas de templates).',
                    ],
                ],
            ],

            // ── SMS ───────────────────────────────────────────────────────────────
            'sms' => [
                'label'       => 'SMS',
                'description' => 'Envío de mensajes de texto vía HTTP Request a proveedor SMS.',
                'icon'        => 'sms',
                'color'       => 'blue',
                'fields'      => [
                    [
                        'key'         => 'sms_url',
                        'label'       => 'URL del Proveedor',
                        'type'        => 'url',
                        'encrypted'   => false,
                        'placeholder' => 'https://api.smscolombia.com/v1/send',
                    ],
                    [
                        'key'         => 'sms_api_key',
                        'label'       => 'API Key',
                        'type'        => 'password',
                        'encrypted'   => true,
                        'placeholder' => 'sk_live_...',
                    ],
                    [
                        'key'         => 'sms_method',
                        'label'       => 'Método HTTP',
                        'type'        => 'select',
                        'encrypted'   => false,
                        'options'     => ['POST', 'GET'],
                        'default'     => 'POST',
                    ],
                    [
                        'key'         => 'sms_phone_field',
                        'label'       => 'Campo — Teléfono',
                        'type'        => 'text',
                        'encrypted'   => false,
                        'default'     => 'numero',
                        'description' => 'Nombre del campo en el body/query para el número de teléfono.',
                    ],
                    [
                        'key'         => 'sms_message_field',
                        'label'       => 'Campo — Mensaje',
                        'type'        => 'text',
                        'encrypted'   => false,
                        'default'     => 'sms',
                        'description' => 'Nombre del campo en el body/query para el texto del mensaje.',
                    ],
                    [
                        'key'         => 'sms_key_field',
                        'label'       => 'Campo — API Key en Body',
                        'type'        => 'text',
                        'encrypted'   => false,
                        'default'     => 'apikey',
                        'description' => 'Nombre del campo para incluir la API Key en el body (si aplica).',
                    ],
                    [
                        'key'         => 'sms_otp_template',
                        'label'       => 'Plantilla mensaje OTP',
                        'type'        => 'text',
                        'encrypted'   => false,
                        'default'     => 'Tu código de verificación Pulxo es: {code}. Válido por 10 minutos.',
                        'placeholder' => 'Tu código es: {code}',
                        'description' => 'Usa {code} donde irá el número OTP. Este texto se enviará por SMS.',
                    ],
                    [
                        'key'         => 'sms_phone_prefix',
                        'label'       => 'Prefijo país (código)',
                        'type'        => 'text',
                        'encrypted'   => false,
                        'default'     => '57',
                        'placeholder' => '57',
                        'description' => 'Prefijo de país que se antepone a números de 10 dígitos. Ej: 57 para Colombia.',
                    ],
                ],
            ],

            // ── Llamadas Pregrabadas ──────────────────────────────────────────────
            'calls' => [
                'label'       => 'Llamadas Pregrabadas',
                'description' => 'Llamadas automáticas con audio pregrabado vía HTTP o proveedor IP.',
                'icon'        => 'phone',
                'color'       => 'purple',
                'fields'      => [
                    [
                        'key'         => 'calls_url',
                        'label'       => 'URL del Proveedor',
                        'type'        => 'url',
                        'encrypted'   => false,
                        'placeholder' => 'https://api.proveedor.com/call',
                    ],
                    [
                        'key'         => 'calls_api_key',
                        'label'       => 'API Key',
                        'type'        => 'password',
                        'encrypted'   => true,
                    ],
                    [
                        'key'         => 'calls_method',
                        'label'       => 'Método HTTP',
                        'type'        => 'select',
                        'encrypted'   => false,
                        'options'     => ['POST', 'GET'],
                        'default'     => 'POST',
                    ],
                    [
                        'key'         => 'calls_audio_url',
                        'label'       => 'URL del Audio Pregrabado',
                        'type'        => 'url',
                        'encrypted'   => false,
                        'placeholder' => 'https://cdn.ejemplo.com/audio.mp3',
                        'description' => 'URL pública del archivo de audio que se reproducirá en la llamada.',
                    ],
                    [
                        'key'         => 'calls_phone_field',
                        'label'       => 'Campo — Teléfono',
                        'type'        => 'text',
                        'encrypted'   => false,
                        'default'     => 'phone',
                        'description' => 'Nombre del campo para el número de teléfono en el body.',
                    ],
                ],
            ],

            // ── Email SMTP ────────────────────────────────────────────────────────
            'email' => [
                'label'       => 'Email (SMTP)',
                'description' => 'Configuración SMTP para envío de correos electrónicos desde la plataforma.',
                'icon'        => 'email',
                'color'       => 'red',
                'fields'      => [
                    [
                        'key'         => 'mail_host',
                        'label'       => 'SMTP Host',
                        'type'        => 'text',
                        'encrypted'   => false,
                        'placeholder' => 'smtp.gmail.com',
                    ],
                    [
                        'key'         => 'mail_port',
                        'label'       => 'Puerto',
                        'type'        => 'number',
                        'encrypted'   => false,
                        'default'     => '587',
                        'placeholder' => '587',
                    ],
                    [
                        'key'         => 'mail_encryption',
                        'label'       => 'Encriptación',
                        'type'        => 'select',
                        'encrypted'   => false,
                        'options'     => ['tls', 'ssl', 'none'],
                        'default'     => 'tls',
                    ],
                    [
                        'key'         => 'mail_username',
                        'label'       => 'Usuario (email)',
                        'type'        => 'text',
                        'encrypted'   => false,
                        'placeholder' => 'notificaciones@pulxo.co',
                    ],
                    [
                        'key'         => 'mail_password',
                        'label'       => 'Contraseña / App Password',
                        'type'        => 'password',
                        'encrypted'   => true,
                    ],
                    [
                        'key'         => 'mail_from_name',
                        'label'       => 'Nombre Remitente',
                        'type'        => 'text',
                        'encrypted'   => false,
                        'default'     => 'Pulxo',
                        'placeholder' => 'Pulxo',
                    ],
                    [
                        'key'         => 'mail_from_address',
                        'label'       => 'Email Remitente',
                        'type'        => 'email',
                        'encrypted'   => false,
                        'placeholder' => 'no-reply@pulxo.co',
                    ],
                ],
            ],

            // ── Google Maps ───────────────────────────────────────────────────────
            'maps' => [
                'label'       => 'Google Maps',
                'description' => 'API Key de Google Maps para geocodificación de coordenadas y mapas interactivos.',
                'icon'        => 'map',
                'color'       => 'yellow',
                'fields'      => [
                    [
                        'key'         => 'maps_google_key',
                        'label'       => 'Google Maps API Key',
                        'type'        => 'password',
                        'encrypted'   => true,
                        'placeholder' => 'AIzaSy...',
                        'description' => 'Clave de API con permisos habilitados: Geocoding API y Maps JavaScript API.',
                    ],
                    [
                        'key'         => 'maps_test_address',
                        'label'       => 'Dirección de prueba',
                        'type'        => 'text',
                        'encrypted'   => false,
                        'default'     => 'Bogotá, Colombia',
                        'description' => 'Dirección que se geocodificará al probar la conexión.',
                    ],
                ],
            ],

            // ── n8n ───────────────────────────────────────────────────────────────
            'n8n' => [
                'label'       => 'n8n',
                'description' => 'Integración con n8n para automatizaciones, flujos y webhooks de notificación.',
                'icon'        => 'settings',
                'color'       => 'orange',
                'fields'      => [
                    [
                        'key'         => 'n8n_base_url',
                        'label'       => 'URL Base de n8n',
                        'type'        => 'url',
                        'encrypted'   => false,
                        'placeholder' => 'https://n8n.tudominio.com',
                    ],
                    [
                        'key'         => 'n8n_api_key',
                        'label'       => 'API Key',
                        'type'        => 'password',
                        'encrypted'   => true,
                        'description' => 'Clave de API de n8n para autenticación de peticiones.',
                    ],
                    [
                        'key'         => 'n8n_webhook_templates',
                        'label'       => 'Webhook — Plantillas WhatsApp',
                        'type'        => 'url',
                        'encrypted'   => false,
                        'placeholder' => 'https://n8n.tudominio.com/webhook/plantillas-whatsapp',
                        'description' => 'URL del webhook n8n que procesa el envío de plantillas de utilidad.',
                    ],
                    [
                        'key'         => 'n8n_webhook_otp',
                        'label'       => 'Webhook — OTP',
                        'type'        => 'url',
                        'encrypted'   => false,
                        'placeholder' => 'https://n8n.tudominio.com/webhook/otp',
                        'description' => 'URL del webhook n8n para el flujo de verificación OTP.',
                    ],
                    [
                        'key'         => 'n8n_webhook_calls',
                        'label'       => 'Webhook — Llamadas',
                        'type'        => 'url',
                        'encrypted'   => false,
                        'placeholder' => 'https://n8n.tudominio.com/webhook/llamadas',
                        'description' => 'URL del webhook n8n para disparar llamadas pregrabadas.',
                    ],
                ],
            ],

        ];
    }

    /** Returns all keys that should be encrypted. */
    public static function sensitiveKeys(): array
    {
        $keys = [];
        foreach (self::groups() as $group) {
            foreach ($group['fields'] as $field) {
                if ($field['encrypted'] ?? false) {
                    $keys[] = $field['key'];
                }
            }
        }
        return $keys;
    }
}
