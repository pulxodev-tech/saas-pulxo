<?php

namespace App\Application\Reports\Exports;

use App\Infrastructure\Persistence\Eloquent\Models\Form;
use App\Infrastructure\Persistence\Eloquent\Models\Survey;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Illuminate\Support\Collection;

class SurveysSummaryExport implements FromCollection, WithHeadings, WithStyles, ShouldAutoSize, WithTitle
{
    private array $fieldKeys   = [];
    private array $fieldLabels = [];
    private array $fieldTypes  = [];
    private array $fieldOptions = [];

    public function __construct(private readonly array $filters)
    {
        if (!empty($filters['form_id'])) {
            $form = Form::with('fields')->find($filters['form_id']);
            if ($form) {
                foreach ($form->fields->where('is_active', true) as $field) {
                    if (in_array($field->field_type, ['separator', 'heading'])) continue;
                    $this->fieldKeys[]    = $field->field_key;
                    $this->fieldLabels[]  = $field->label;
                    $this->fieldTypes[]   = $field->field_type;
                    $this->fieldOptions[] = collect($field->options ?? [])->keyBy('value')->toArray();
                }
            }
        }
    }

    public function title(): string { return 'Resumen'; }

    public function headings(): array
    {
        return ['Campo', 'Pregunta', 'Respuesta', 'Cantidad', '% del Total'];
    }

    public function collection(): Collection
    {
        $surveys = Survey::whereNotNull('submitted_at')
            ->when(!empty($this->filters['form_id']),  fn($q) => $q->where('form_id',  $this->filters['form_id']))
            ->when(!empty($this->filters['group_id']), fn($q) => $q->where('group_id', $this->filters['group_id']))
            ->when(!empty($this->filters['from']),     fn($q) => $q->where('submitted_at', '>=', $this->filters['from']))
            ->when(!empty($this->filters['to']),       fn($q) => $q->where('submitted_at', '<=', $this->filters['to'] . ' 23:59:59'))
            ->pluck('responses')
            ->filter();

        $total = $surveys->count();
        $rows  = collect();

        foreach ($this->fieldKeys as $i => $key) {
            $label   = $this->fieldLabels[$i];
            $type    = $this->fieldTypes[$i];
            $opts    = $this->fieldOptions[$i];

            // Tally answers
            $tally = [];
            foreach ($surveys as $responses) {
                $val = $responses[$key] ?? null;
                if ($val === null || $val === '') continue;

                if (is_array($val)) {
                    foreach ($val as $v) {
                        $tally[$v] = ($tally[$v] ?? 0) + 1;
                    }
                } else {
                    $tally[$val] = ($tally[$val] ?? 0) + 1;
                }
            }

            if (empty($tally)) {
                $rows->push([$key, $label, '(sin respuestas)', 0, '0%']);
                continue;
            }

            arsort($tally);
            $isFirst = true;
            foreach ($tally as $answer => $count) {
                $displayAnswer = isset($opts[$answer]) ? $opts[$answer]['label'] : $answer;
                $pct = $total > 0 ? round(($count / $total) * 100, 1) . '%' : '0%';
                $rows->push([
                    $isFirst ? $key   : '',
                    $isFirst ? $label : '',
                    $displayAnswer,
                    $count,
                    $pct,
                ]);
                $isFirst = false;
            }
        }

        return $rows;
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
