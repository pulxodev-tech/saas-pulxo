<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #1e293b; }
  .header { background: #4f46e5; color: white; padding: 16px 20px; margin-bottom: 16px; }
  .header h1 { font-size: 18px; font-weight: bold; }
  .header p  { font-size: 10px; opacity: .85; margin-top: 4px; }
  .meta-grid { display: flex; gap: 12px; padding: 0 20px 12px; flex-wrap: wrap; }
  .meta-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; flex: 1; min-width: 100px; }
  .meta-card .val { font-size: 22px; font-weight: bold; color: #4f46e5; }
  .meta-card .lbl { font-size: 9px; color: #64748b; margin-top: 2px; }
  .section { padding: 0 20px; margin-bottom: 16px; }
  .section-title { font-size: 12px; font-weight: bold; color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 4px; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #4f46e5; color: white; padding: 5px 8px; text-align: left; }
  td { padding: 4px 8px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: #f8fafc; }
  .bar-container { background: #e2e8f0; border-radius: 3px; height: 8px; width: 100%; }
  .bar-fill { background: #4f46e5; border-radius: 3px; height: 8px; }
  .pct-text { font-size: 9px; color: #64748b; margin-left: 4px; }
  .footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 8px; color: #94a3b8; padding: 8px; border-top: 1px solid #e2e8f0; }
  .page-break { page-break-after: always; }
</style>
</head>
<body>

<div class="header">
  <h1>📊 Reporte Resumen — {{ $formName }}</h1>
  <p>Período: {{ $from }} al {{ $to }} &nbsp;·&nbsp; Total encuestas: {{ $totalSurveys }} &nbsp;·&nbsp; Generado: {{ $generatedAt }}</p>
</div>

<!-- KPIs -->
<div class="meta-grid">
  <div class="meta-card">
    <div class="val">{{ $totalSurveys }}</div>
    <div class="lbl">Total encuestas</div>
  </div>
  <div class="meta-card">
    <div class="val">{{ $encuestadoresCount }}</div>
    <div class="lbl">Encuestadores</div>
  </div>
  <div class="meta-card">
    <div class="val">{{ $gpsPct }}%</div>
    <div class="lbl">Cobertura GPS</div>
  </div>
  @if($groupName)
  <div class="meta-card">
    <div class="val" style="font-size:14px">{{ $groupName }}</div>
    <div class="lbl">Grupo</div>
  </div>
  @endif
</div>

<!-- Per-field summaries -->
@foreach($fieldSummaries as $summary)
<div class="section">
  <div class="section-title">{{ $summary['label'] }}</div>
  <table>
    <tr>
      <th style="width:45%">Respuesta</th>
      <th style="width:12%">Cantidad</th>
      <th style="width:8%">%</th>
      <th style="width:35%">Distribución</th>
    </tr>
    @foreach($summary['rows'] as $row)
    <tr>
      <td>{{ $row['answer'] }}</td>
      <td>{{ $row['count'] }}</td>
      <td>{{ $row['pct'] }}%</td>
      <td>
        <div style="display:flex;align-items:center">
          <div class="bar-container" style="flex:1">
            <div class="bar-fill" style="width:{{ min($row['pct'], 100) }}%"></div>
          </div>
          <span class="pct-text">{{ $row['pct'] }}%</span>
        </div>
      </td>
    </tr>
    @endforeach
  </table>
</div>
@endforeach

<!-- Top groups -->
@if(count($byGroup) > 0)
<div class="section">
  <div class="section-title">Por Grupo</div>
  <table>
    <tr><th>Grupo</th><th>Encuestas</th><th>%</th></tr>
    @foreach($byGroup as $row)
    <tr>
      <td>{{ $row['group_name'] }}</td>
      <td>{{ $row['total'] }}</td>
      <td>{{ $totalSurveys > 0 ? round($row['total'] / $totalSurveys * 100, 1) : 0 }}%</td>
    </tr>
    @endforeach
  </table>
</div>
@endif

<div class="footer">
  Pulxo &copy; {{ date('Y') }} &nbsp;·&nbsp; Reporte generado automáticamente
</div>

</body>
</html>
