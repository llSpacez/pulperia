# ============================================
# BENCHMARKING COMPLETO + REPORTE HTML
# ============================================

$url = "https://pulperia-production.up.railway.app/api"
$iteraciones = 20
$resultados = @()

Write-Host "Iniciando Benchmarking de API..." -ForegroundColor Cyan

# ==================== LOGIN ====================
$body = @{ username = "admin"; password = "admin123" } | ConvertTo-Json
$loginStopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$login = Invoke-RestMethod -Uri "$url/auth/login" -Method POST -Body $body -ContentType "application/json"
$loginStopwatch.Stop()
$token = $login.access_token
$headers = @{ Authorization = "Bearer $token" }

# ==================== ENDPOINTS A MEDIR ====================
$endpoints = @(
    @{ name = "POST /auth/login"; url = "$url/auth/login"; method = "POST"; body = $body; hasAuth = $false; contentType = "application/json" },
    @{ name = "GET /products"; url = "$url/products"; method = "GET"; hasAuth = $true },
    @{ name = "GET /products/low-stock"; url = "$url/products/low-stock"; method = "GET"; hasAuth = $true },
    @{ name = "GET /sales"; url = "$url/sales"; method = "GET"; hasAuth = $true },
    @{ name = "GET /sales/stats"; url = "$url/sales/stats"; method = "GET"; hasAuth = $true },
    @{ name = "GET /sales/today"; url = "$url/sales/today"; method = "GET"; hasAuth = $true },
    @{ name = "GET /ai/recommendations"; url = "$url/ai/recommendations"; method = "GET"; hasAuth = $true }
)

# ==================== MEDICION ====================
foreach ($endpoint in $endpoints) {
    Write-Host "Midiendo: $($endpoint.name)..." -NoNewline
    
    $tiempos = @()
    $errores = 0
    
    for ($i = 1; $i -le $iteraciones; $i++) {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        
        try {
            $params = @{
                Uri = $endpoint.url
                Method = $endpoint.method
            }
            if ($endpoint.hasAuth) { $params.Headers = $headers }
            if ($endpoint.body) {
                $params.Body = $endpoint.body
                $params.ContentType = $endpoint.contentType
            }
            
            Invoke-RestMethod @params | Out-Null
            $stopwatch.Stop()
            $tiempos += $stopwatch.Elapsed.TotalMilliseconds
        } catch {
            $stopwatch.Stop()
            $errores++
        }
    }
    
    if ($tiempos.Count -gt 0) {
        $promedio = ($tiempos | Measure-Object -Average).Average
        $minimo = ($tiempos | Measure-Object -Minimum).Minimum
        $maximo = ($tiempos | Measure-Object -Maximum).Maximum
        $mediana = ($tiempos | Sort-Object)[[int]($tiempos.Count / 2)]
        
        $suma = 0
        foreach ($t in $tiempos) { $suma += [Math]::Pow($t - $promedio, 2) }
        $desviacion = [Math]::Sqrt($suma / $tiempos.Count)
        
        $resultados += [PSCustomObject]@{
            Endpoint = $endpoint.name
            Promedio = [math]::Round($promedio, 2)
            Mediana = [math]::Round($mediana, 2)
            Minimo = [math]::Round($minimo, 2)
            Maximo = [math]::Round($maximo, 2)
            Desviacion = [math]::Round($desviacion, 2)
            Exitosos = $tiempos.Count
            Errores = $errores
        }
        Write-Host " OK ($([math]::Round($promedio, 2)) ms)" -ForegroundColor Green
    } else {
        Write-Host " FALLO" -ForegroundColor Red
    }
}

# ==================== PROMEDIO GENERAL ====================
$promedioGeneral = ($resultados | Measure-Object -Property Promedio -Average).Average

# ==================== GENERAR REPORTE HTML ====================
$html = @"
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Reporte de Benchmarking - Pulperia POS</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; background-color: #f9fafb; color: #333; }
        .container { max-width: 900px; margin: auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h1 { color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px; }
        h2 { color: #374151; margin-top: 30px; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
        th { background-color: #059669; color: white; }
        tr:nth-child(even) { background-color: #f3f4f6; }
        .metric { display: inline-block; margin: 20px 40px 20px 0; background: #ecfdf5; padding: 20px; border-radius: 8px; border-left: 4px solid #059669; }
        .metric-value { font-size: 32px; font-weight: bold; color: #059669; }
        .metric-label { font-size: 14px; color: #6b7280; font-weight: bold; text-transform: uppercase; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Reporte de Benchmarking - Pulperia POS</h1>
        <p><strong>Fecha:</strong> $(Get-Date -Format "dd/MM/yyyy HH:mm")</p>
        <p><strong>Servidor URL:</strong> $url</p>
        <p><strong>Iteraciones por endpoint:</strong> $iteraciones</p>
        
        <h2>Resumen General</h2>
        <div class="metric">
            <div class="metric-value">$([math]::Round($promedioGeneral, 2)) ms</div>
            <div class="metric-label">Latencia Promedio</div>
        </div>
        <div class="metric">
            <div class="metric-value">$($resultados.Count)</div>
            <div class="metric-label">Endpoints Medidos</div>
        </div>

        <h2>Resultados por Endpoint</h2>
        <table>
            <tr>
                <th>Endpoint</th>
                <th>Promedio (ms)</th>
                <th>Mediana (ms)</th>
                <th>Minimo (ms)</th>
                <th>Maximo (ms)</th>
                <th>Desviacion</th>
                <th>Exitosos</th>
            </tr>
"@

foreach ($r in $resultados) {
    $html += @"
            <tr>
                <td>$($r.Endpoint)</td>
                <td>$($r.Promedio)</td>
                <td>$($r.Mediana)</td>
                <td>$($r.Minimo)</td>
                <td>$($r.Maximo)</td>
                <td>$($r.Desviacion)</td>
                <td>$($r.Exitosos)/$iteraciones</td>
            </tr>
"@
}

$html += @"
        </table>
        
        <h2>Analisis Tecnico</h2>
        <p>Los endpoints de autenticacion y consulta de datos presentan tiempos promedio de $([math]::Round($promedioGeneral, 2)) ms, lo cual es aceptable para aplicaciones moviles que operan sobre redes 4G/WiFi.</p>
        <p>La desviacion estandar indica la estabilidad del servidor. Valores menores a 50 ms sugieren un rendimiento consistente.</p>
        
        <h2>Recomendaciones</h2>
        <ul>
            <li>Optimizar endpoints con tiempos superiores a 300 ms (usualmente los relacionados con IA o consultas complejas).</li>
            <li>Implementar cache local en el cliente para consultas frecuentes.</li>
            <li>Considerar paginacion para listados grandes de productos o ventas.</li>
        </ul>
    </div>
</body>
</html>
"@

# ==================== GUARDAR Y ABRIR REPORTE ====================
$reportPath = "C:\Users\Alcides\Documents\pulperia-backend\benchmark_report.html"
$html | Out-File -FilePath $reportPath -Encoding UTF8

Write-Host "`nReporte generado exitosamente en: $reportPath" -ForegroundColor Green
Start-Process $reportPath