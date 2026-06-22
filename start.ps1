# Skrypt uruchamiający system Emplo HR
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "=== Emplo HR System ===" -ForegroundColor Cyan
Write-Host ""

# Backend Django
Write-Host "Uruchamianie backendu Django..." -ForegroundColor Yellow
$backendJob = Start-Process -FilePath "$root\venv\Scripts\python.exe" `
    -ArgumentList "manage.py", "runserver", "8000" `
    -WorkingDirectory "$root\backend" `
    -WindowStyle Normal `
    -PassThru

Start-Sleep 2
Write-Host "Backend uruchomiony na: http://localhost:8000" -ForegroundColor Green

# Frontend React
Write-Host "Uruchamianie frontendu React..." -ForegroundColor Yellow
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
$frontendJob = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "npm run dev" `
    -WorkingDirectory "$root\frontend" `
    -WindowStyle Normal `
    -PassThru

Start-Sleep 3
Write-Host "Frontend uruchomiony na: http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "=== Dane logowania ===" -ForegroundColor Cyan
Write-Host "Admin:     admin / Admin1234!" -ForegroundColor White
Write-Host "Kadry:     kadry / Kadry1234!" -ForegroundColor White
Write-Host "Manager:   kierownik / Manager1234!" -ForegroundColor White
Write-Host "Pracownik: pracownik / Pracownik1234!" -ForegroundColor White
Write-Host ""
Write-Host "Otwieranie przegladarki..." -ForegroundColor Yellow
Start-Process "http://localhost:5173"
Write-Host ""
Write-Host "Nacisnij Enter aby zatrzymac serwery..." -ForegroundColor Gray
Read-Host
$backendJob | Stop-Process -Force -ErrorAction SilentlyContinue
$frontendJob | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "Serwery zatrzymane." -ForegroundColor Red
