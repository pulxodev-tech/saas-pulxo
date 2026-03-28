<?php

namespace App\Presentation\Http\Controllers\Api\V1\Reports;

use App\Application\Reports\Exports\SurveysDetailExport;
use App\Application\Reports\Exports\SurveysSummaryExport;
use App\Http\Controllers\Controller;
use App\Infrastructure\Persistence\Eloquent\Models\Form;
use App\Infrastructure\Persistence\Eloquent\Models\Survey;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use Maatwebsite\Excel\Excel as ExcelFormat;

class ReportController extends Controller
{
    /**
     * GET /api/v1/reports/surveys
     *
     * Paginated survey list with filters for the Reports screen.
     * Auth: reports.view
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'form_id'        => ['nullable', 'integer'],
            'group_id'       => ['nullable', 'integer'],
            'encuestador_id' => ['nullable', 'integer'],
            'from'           => ['nullable', 'date'],
            'to'             => ['nullable', 'date'],
            'per_page'       => ['nullable', 'integer', 'max:200'],
        ]);

        $surveys = Survey::with(['form:id,name', 'encuestador:id,name,last_name', 'group:id,name'])
            ->whereNotNull('submitted_at')
            ->when(!empty($filters['form_id']),        fn($q) => $q->where('form_id',        $filters['form_id']))
            ->when(!empty($filters['group_id']),       fn($q) => $q->where('group_id',       $filters['group_id']))
            ->when(!empty($filters['encuestador_id']), fn($q) => $q->where('encuestador_id', $filters['encuestador_id']))
            ->when(!empty($filters['from']),           fn($q) => $q->where('submitted_at',   '>=', $filters['from']))
            ->when(!empty($filters['to']),             fn($q) => $q->where('submitted_at',   '<=', $filters['to'] . ' 23:59:59'))
            ->orderByDesc('submitted_at')
            ->paginate($filters['per_page'] ?? 50);

        return response()->json($surveys);
    }

    /**
     * GET /api/v1/reports/summary?form_id=X&...
     *
     * Per-field answer distribution for a given form.
     * Auth: reports.view
     */
    public function summary(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'form_id'  => ['required', 'integer', 'exists:forms,id'],
            'group_id' => ['nullable', 'integer'],
            'from'     => ['nullable', 'date'],
            'to'       => ['nullable', 'date'],
        ]);

        $form = Form::with('fields')->findOrFail($filters['form_id']);

        $surveys = Survey::whereNotNull('submitted_at')
            ->where('form_id', $filters['form_id'])
            ->when(!empty($filters['group_id']), fn($q) => $q->where('group_id', $filters['group_id']))
            ->when(!empty($filters['from']),     fn($q) => $q->where('submitted_at', '>=', $filters['from']))
            ->when(!empty($filters['to']),       fn($q) => $q->where('submitted_at', '<=', $filters['to'] . ' 23:59:59'))
            ->pluck('responses')->filter();

        $total   = $surveys->count();
        $results = [];

        foreach ($form->fields->where('is_active', true) as $field) {
            if (in_array($field->field_type, ['separator', 'heading'])) continue;

            $tally  = [];
            $opts   = collect($field->options ?? [])->keyBy('value');

            foreach ($surveys as $responses) {
                $val = $responses[$field->field_key] ?? null;
                if ($val === null || $val === '') continue;

                foreach ((array) $val as $v) {
                    $tally[$v] = ($tally[$v] ?? 0) + 1;
                }
            }

            arsort($tally);
            $rows = [];
            foreach ($tally as $answer => $count) {
                $rows[] = [
                    'answer' => $opts->has($answer) ? $opts[$answer]['label'] : $answer,
                    'value'  => $answer,
                    'count'  => $count,
                    'pct'    => $total > 0 ? round($count / $total * 100, 1) : 0,
                ];
            }

            $results[] = [
                'field_key'  => $field->field_key,
                'label'      => $field->label,
                'field_type' => $field->field_type,
                'rows'       => $rows,
            ];
        }

        return response()->json([
            'form'    => ['id' => $form->id, 'name' => $form->name],
            'total'   => $total,
            'fields'  => $results,
        ]);
    }

    /**
     * GET /api/v1/reports/export/excel?type=detail|summary&...
     *
     * Auth: reports.export
     */
    public function exportExcel(Request $request)
    {
        $type    = $request->input('type', 'detail');
        $filters = $request->only(['form_id', 'group_id', 'encuestador_id', 'from', 'to']);
        $name    = 'pulxo_encuestas_' . now()->format('Ymd_His') . '.xlsx';

        $export = $type === 'summary'
            ? new SurveysSummaryExport($filters)
            : new SurveysDetailExport($filters);

        return Excel::download($export, $name, ExcelFormat::XLSX);
    }

    /**
     * GET /api/v1/reports/export/pdf?form_id=X&...
     *
     * Summary PDF only.
     * Auth: reports.export
     */
    public function exportPdf(Request $request)
    {
        $filters = $request->validate([
            'form_id'  => ['required', 'integer', 'exists:forms,id'],
            'group_id' => ['nullable', 'integer'],
            'from'     => ['nullable', 'date'],
            'to'       => ['nullable', 'date'],
        ]);

        $from = $filters['from'] ?? now()->startOfMonth()->toDateString();
        $to   = $filters['to']   ?? now()->toDateString();

        $form  = Form::with('fields')->findOrFail($filters['form_id']);
        $group = null;
        if (!empty($filters['group_id'])) {
            $group = \App\Infrastructure\Persistence\Eloquent\Models\Group::find($filters['group_id']);
        }

        $surveys = Survey::whereNotNull('submitted_at')
            ->where('form_id', $filters['form_id'])
            ->when(!empty($filters['group_id']), fn($q) => $q->where('group_id', $filters['group_id']))
            ->when(!empty($filters['from']),     fn($q) => $q->where('submitted_at', '>=', $from))
            ->when(!empty($filters['to']),       fn($q) => $q->where('submitted_at', '<=', $to . ' 23:59:59'))
            ->get(['responses', 'encuestador_id', 'group_id', 'encuestador_lat']);

        $total = $surveys->count();

        // Build per-field summaries
        $fieldSummaries = [];
        foreach ($form->fields->where('is_active', true) as $field) {
            if (in_array($field->field_type, ['separator', 'heading'])) continue;
            $opts  = collect($field->options ?? [])->keyBy('value');
            $tally = [];

            foreach ($surveys as $s) {
                $val = ($s->responses ?? [])[$field->field_key] ?? null;
                if ($val === null || $val === '') continue;
                foreach ((array) $val as $v) {
                    $tally[$v] = ($tally[$v] ?? 0) + 1;
                }
            }

            arsort($tally);
            $rows = [];
            foreach (array_slice($tally, 0, 10, true) as $answer => $count) {
                $rows[] = [
                    'answer' => $opts->has($answer) ? $opts[$answer]['label'] : $answer,
                    'count'  => $count,
                    'pct'    => $total > 0 ? round($count / $total * 100, 1) : 0,
                ];
            }

            if (!empty($rows)) {
                $fieldSummaries[] = ['label' => $field->label, 'rows' => $rows];
            }
        }

        // Top groups
        $byGroup = Survey::where('form_id', $filters['form_id'])
            ->when(!empty($filters['group_id']), fn($q) => $q->where('group_id', $filters['group_id']))
            ->whereNotNull('submitted_at')
            ->join('groups', 'surveys.group_id', '=', 'groups.id')
            ->select('groups.name as group_name', DB::raw('COUNT(*) as total'))
            ->groupBy('groups.id', 'groups.name')
            ->orderByDesc('total')->limit(10)->get()->toArray();

        $withGps        = $surveys->whereNotNull('encuestador_lat')->count();
        $gpsPct         = $total > 0 ? round($withGps / $total * 100) : 0;
        $encuestadores  = $surveys->unique('encuestador_id')->count();

        $pdf = Pdf::loadView('reports.survey-summary-pdf', [
            'formName'          => $form->name,
            'from'              => $from,
            'to'                => $to,
            'totalSurveys'      => $total,
            'encuestadoresCount'=> $encuestadores,
            'gpsPct'            => $gpsPct,
            'groupName'         => $group?->name,
            'fieldSummaries'    => $fieldSummaries,
            'byGroup'           => $byGroup,
            'generatedAt'       => now()->format('d/m/Y H:i'),
        ])->setPaper('a4');

        $filename = 'pulxo_resumen_' . now()->format('Ymd_His') . '.pdf';

        return $pdf->download($filename);
    }
}
