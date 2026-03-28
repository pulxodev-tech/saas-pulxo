<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // ── Pulxo: WhatsApp (Meta Cloud API) ─────────────────────────────────────
    'whatsapp' => [
        'api_url'      => env('WHATSAPP_API_URL', 'https://graph.facebook.com/v19.0'),
        'phone_id'     => env('WHATSAPP_PHONE_ID'),
        'token'        => env('WHATSAPP_TOKEN'),
        'otp_template' => env('WHATSAPP_OTP_TEMPLATE', 'otp_autenticacion'),
    ],

    // ── Pulxo: SMS Colombia ───────────────────────────────────────────────────
    'sms_colombia' => [
        'url'     => env('SMS_COLOMBIA_URL'),
        'api_key' => env('SMS_COLOMBIA_API_KEY'),
    ],

];
