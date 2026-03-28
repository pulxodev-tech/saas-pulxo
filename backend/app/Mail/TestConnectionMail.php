<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class TestConnectionMail extends Mailable
{
    public function __construct(public readonly string $senderName = 'Pulxo') {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Prueba de integración — ' . $this->senderName);
    }

    public function content(): Content
    {
        return new Content(
            text: 'pulxo-test-email',
        );
    }

    public function build(): static
    {
        return $this->text('emails.test-connection');
    }
}
