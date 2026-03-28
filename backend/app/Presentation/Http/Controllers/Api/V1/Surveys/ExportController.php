<?php

namespace App\Presentation\Http\Controllers\Api\V1\Surveys;

use App\Http\Controllers\Controller;
use App\Jobs\ExportSurveysJob;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportController extends Controller
{
    /**
     * POST /api/v1/surveys/exports
     * Dispatches a background export job, returns an export_id for polling.
     */
    public function start(Request $request): JsonResponse
    {
        $filters = $request->only(['search', 'form_id', 'group_id', 'encuestador_id', 'from', 'to']);

        $exportId = Str::uuid()->toString();

        Cache::put("export_{$exportId}", [
            'status'   => 'queued',
            'progress' => 0,
        ], now()->addHours(4));

        ExportSurveysJob::dispatch($filters, $exportId);

        return response()->json(['export_id' => $exportId]);
    }

    /**
     * GET /api/v1/surveys/exports/{id}
     * Returns the current status and progress of an export job.
     */
    public function status(string $id): JsonResponse
    {
        $data = Cache::get("export_{$id}");

        if (!$data) {
            return response()->json(['status' => 'not_found'], 404);
        }

        return response()->json($data);
    }

    /**
     * GET /api/v1/surveys/exports/{id}/download
     * Streams the completed export file to the client, then deletes it.
     */
    public function download(string $id): \Symfony\Component\HttpFoundation\Response|\Illuminate\Http\JsonResponse
    {
        $data = Cache::get("export_{$id}");

        if (!$data || ($data['status'] ?? '') !== 'done') {
            return response()->json(['message' => 'Export not ready.'], 404);
        }

        $filePath = $data['file'] ?? "exports/{$id}.xlsx";

        Log::info('Export download requested', ['id' => $id, 'file' => $filePath]);
        if (!Storage::exists($filePath)) {
            Log::warning('Export file NOT FOUND on disk', ['path' => $filePath]);
            return response()->json(['message' => 'File not found.'], 404);
        }
        Log::info('Export file found, starting download', ['path' => Storage::path($filePath)]);

        $fullPath = Storage::path($filePath);
        $filename = 'encuestas_' . now()->format('Y-m-d') . '.xlsx';

        if (ob_get_level()) ob_end_clean();

        return response()->download($fullPath, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
