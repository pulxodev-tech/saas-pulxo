<?php

namespace App\Jobs;

use App\Infrastructure\Persistence\Eloquent\Models\FormField;
use App\Infrastructure\Persistence\Eloquent\Models\Hierarchy;
use App\Infrastructure\Persistence\Eloquent\Models\Survey;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class ExportSurveysJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 600;
    public int $tries   = 1;

    public function __construct(
        private readonly array  $filters,
        private readonly string $exportId,
    ) {}

    public function handle(): void
    {
        $cacheKey = "export_{$this->exportId}";

        try {
            Cache::put($cacheKey, ['status' => 'processing', 'progress' => 0], now()->addHours(4));

            // ── Build query ─────────────────────────────────────────────
            $query = Survey::withoutGlobalScopes()->whereNotNull('submitted_at');
            $this->applyFilters($query, $this->filters);

            $total = (clone $query)->count();
            Cache::put($cacheKey, ['status' => 'processing', 'progress' => 2, 'total' => $total], now()->addHours(4));

            // ── Response field keys ─────────────────────────────────────
            $formId       = $this->filters['form_id'] ?? null;
            $responseKeys = $this->resolveResponseKeys($formId, clone $query);

            // ── Pre-load hierarchy by group ─────────────────────────────
            $hierarchyMap = Hierarchy::with(['coordinator:id,name,last_name', 'supervisor:id,name,last_name'])
                ->where('is_active', true)
                ->get()
                ->keyBy('group_id');

            // ── Build headers ────────────────────────────────────────────
            $fixedHeaders = [
                'Encuestador Nombre', 'Encuestador Apellido', 'Grupo',
                'Coordinador', 'Supervisor',
                'ID Encuesta', 'Formulario', 'Fecha', 'Hora', 'Con GPS', 'Lat', 'Lng',
                'Teléfono Ciudadano', 'Nombre', 'Apellido', 'Género', 'Edad',
                'Ocupación', 'Barrio', 'Dirección',
            ];
            $allHeaders = array_merge($fixedHeaders, $responseKeys);

            // ── Create spreadsheet ───────────────────────────────────────
            $spreadsheet = new Spreadsheet();
            $sheet       = $spreadsheet->getActiveSheet();
            $sheet->setTitle('Encuestas');

            // Write & style header row
            $sheet->fromArray([$allHeaders], null, 'A1');
            $lastCol = Coordinate::stringFromColumnIndex(count($allHeaders));
            $sheet->getStyle("A1:{$lastCol}1")->applyFromArray([
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 10],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1E3A5F']],
            ]);

            // ── Stream data ─────────────────────────────────────────────
            $processed = 0;
            $rowIndex  = 2;

            (clone $query)
                ->with(['form:id,name', 'encuestador:id,name,last_name', 'group:id,name'])
                ->orderByDesc('submitted_at')
                ->chunk(500, function ($surveys) use (
                    $sheet, $hierarchyMap, $responseKeys, $total, $cacheKey, &$processed, &$rowIndex
                ) {
                    foreach ($surveys as $s) {
                        $hier  = $hierarchyMap->get($s->group_id);
                        $coord = $hier?->coordinator;
                        $sup   = $hier?->supervisor;

                        $row = [
                            $s->encuestador?->name        ?? '',
                            $s->encuestador?->last_name   ?? '',
                            $s->group?->name              ?? '',
                            trim(($coord?->name ?? '') . ' ' . ($coord?->last_name ?? '')),
                            trim(($sup?->name   ?? '') . ' ' . ($sup?->last_name   ?? '')),
                            $s->id,
                            $s->form?->name               ?? '',
                            $s->submitted_at?->format('d/m/Y') ?? '',
                            $s->submitted_at?->format('H:i:s') ?? '',
                            $s->encuestador_lat ? 'Sí' : 'No',
                            $s->encuestador_lat ?? '',
                            $s->encuestador_lng ?? '',
                            $s->respondent_phone          ?? '',
                            $s->respondent_name           ?? '',
                            $s->respondent_last_name      ?? '',
                            $s->respondent_gender         ?? '',
                            $s->respondent_age            ?? '',
                            $s->respondent_occupation     ?? '',
                            $s->respondent_neighborhood   ?? '',
                            $s->respondent_address        ?? '',
                        ];

                        foreach ($responseKeys as $key) {
                            $val   = $s->responses[$key] ?? '';
                            $row[] = is_array($val) ? implode(', ', $val) : (string) $val;
                        }

                        $sheet->fromArray([$row], null, "A{$rowIndex}");
                        $rowIndex++;
                        $processed++;
                    }

                    $pct = $total > 0 ? min(99, (int) round($processed / $total * 95) + 4) : 50;
                    Cache::put($cacheKey, [
                        'status'    => 'processing',
                        'progress'  => $pct,
                        'processed' => $processed,
                        'total'     => $total,
                    ], now()->addHours(4));
                });

            // ── Save .xlsx ───────────────────────────────────────────────
            Storage::makeDirectory('exports');
            $filePath = "exports/{$this->exportId}.xlsx";
            $writer   = new Xlsx($spreadsheet);
            $writer->setPreCalculateFormulas(false);
            $writer->save(Storage::path($filePath));
            $spreadsheet->disconnectWorksheets();
            unset($spreadsheet);

            Cache::put($cacheKey, [
                'status'   => 'done',
                'progress' => 100,
                'file'     => $filePath,
                'total'    => $total,
            ], now()->addHours(2));

        } catch (\Throwable $e) {
            Log::error('ExportSurveysJob failed', ['id' => $this->exportId, 'error' => $e->getMessage()]);
            Cache::put("export_{$this->exportId}", ['status' => 'failed', 'error' => $e->getMessage()], now()->addHours(1));
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private function applyFilters($query, array $f): void
    {
        if (!empty($f['form_id']))        $query->where('form_id',        (int) $f['form_id']);
        if (!empty($f['group_id']))       $query->where('group_id',       (int) $f['group_id']);
        if (!empty($f['encuestador_id'])) $query->where('encuestador_id', (int) $f['encuestador_id']);
        if (!empty($f['from']))           $query->where('submitted_at',   '>=', $f['from']);
        if (!empty($f['to']))             $query->where('submitted_at',   '<=', $f['to'] . ' 23:59:59');

        if (!empty($f['search'])) {
            $s = $f['search'];
            $query->where(fn($q) =>
                $q->where('respondent_phone',     'like', "%{$s}%")
                  ->orWhere('respondent_name',      'like', "%{$s}%")
                  ->orWhere('respondent_last_name',  'like', "%{$s}%")
            );
        }
    }

    private function resolveResponseKeys(?int $formId, $query): array
    {
        if ($formId) {
            return FormField::where('form_id', $formId)
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->pluck('field_key')
                ->toArray();
        }
        $keys = [];
        $query->select('responses')->limit(200)->get()
            ->each(function ($s) use (&$keys) {
                foreach (array_keys((array) $s->responses) as $k) {
                    if (!in_array($k, $keys)) $keys[] = $k;
                }
            });
        return $keys;
    }
}
