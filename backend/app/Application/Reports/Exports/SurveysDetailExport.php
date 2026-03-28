<?php

namespace App\Application\Reports\Exports;

use App\Infrastructure\Persistence\Eloquent\Models\Form;
use App\Infrastructure\Persistence\Eloquent\Models\Survey;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class SurveysDetailExport implements FromQuery, WithHeadings, WithMapping, WithStyles, ShouldAutoSize, WithTitle
{
    private array $fieldKeys = [];
    private array $fieldLabels = [];

    public function __construct(
        private readonly array $filters,
    ) {
        if (!empty($filters['form_id'])) {
            $form = Form::with('fields')->find($filters['form_id']);
            if ($form) {
                foreach ($form->fields->where('is_active', true) as $field) {
                    if (!in_array($field->field_type, ['separator', 'heading'])) {
                        $this->fieldKeys[]   = $field->field_key;
                        $this->fieldLabels[] = $field->label;
                    }
                }
            }
        }
    }

    public function title(): string
    {
        return 'Detalle';
    }

    public function query()
    {
        return Survey::with(['form:id,name', 'encuestador:id,name,last_name', 'group:id,name'])
            ->whereNotNull('submitted_at')
            ->when(!empty($this->filters['form_id']),       fn($q) => $q->where('form_id',       $this->filters['form_id']))
            ->when(!empty($this->filters['group_id']),      fn($q) => $q->where('group_id',      $this->filters['group_id']))
            ->when(!empty($this->filters['encuestador_id']),fn($q) => $q->where('encuestador_id',$this->filters['encuestador_id']))
            ->when(!empty($this->filters['from']),          fn($q) => $q->where('submitted_at',  '>=', $this->filters['from']))
            ->when(!empty($this->filters['to']),            fn($q) => $q->where('submitted_at',  '<=', $this->filters['to'] . ' 23:59:59'))
            ->orderByDesc('submitted_at');
    }

    public function headings(): array
    {
        $base = [
            'ID', 'Formulario', 'Encuestador', 'Grupo',
            'Teléfono', 'Nombre', 'Apellido', 'Género', 'Edad', 'Ocupación', 'Barrio',
            'Lat Enc.', 'Lng Enc.',
            'OTP Verificado', 'Fecha Envío',
        ];

        return array_merge($base, $this->fieldLabels);
    }

    public function map($survey): array
    {
        $base = [
            $survey->id,
            $survey->form?->name,
            trim(($survey->encuestador?->name ?? '') . ' ' . ($survey->encuestador?->last_name ?? '')),
            $survey->group?->name,
            $survey->respondent_phone,
            $survey->respondent_name,
            $survey->respondent_last_name,
            $survey->respondent_gender,
            $survey->respondent_age,
            $survey->respondent_occupation,
            $survey->respondent_neighborhood,
            $survey->encuestador_lat,
            $survey->encuestador_lng,
            $survey->otp_verified ? 'Sí' : 'No',
            $survey->submitted_at?->format('Y-m-d H:i:s'),
        ];

        $responses = $survey->responses ?? [];
        foreach ($this->fieldKeys as $key) {
            $val = $responses[$key] ?? '';
            $base[] = is_array($val) ? implode(', ', $val) : $val;
        }

        return $base;
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF4F46E5']],
            ],
        ];
    }
}
