$ErrorActionPreference = "Stop"

Write-Host "Limpando arquivos locais sensíveis do FisioHub..."

$files = @(
  ".cursor/mcp.json",
  ".env",
  ".env.local",
  ".env.production",
  ".env.vercel"
)

foreach ($file in $files) {
  if (Test-Path $file) {
    Remove-Item $file -Force
    Write-Host "Removido do disco: $file"
  }
}

if (Test-Path "supabase/.temp") {
  Remove-Item "supabase/.temp" -Recurse -Force
  Write-Host "Removido do disco: supabase/.temp"
}

if (Get-Command git -ErrorAction SilentlyContinue) {
  git rm --cached --ignore-unmatch .cursor/mcp.json .env .env.local .env.production .env.vercel
  git rm -r --cached --ignore-unmatch supabase/.temp

  Write-Host ""
  Write-Host "Verificando se .cursor/mcp.json ainda está rastreado..."
  git ls-files .cursor/mcp.json

  Write-Host ""
  Write-Host "Status atual do Git:"
  git status --short
}

Write-Host "Limpeza concluída. Revise o git status antes do commit."
