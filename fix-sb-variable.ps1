$files = @(
  "src\pages\BuyerDashboard.tsx",
  "src\pages\SellerDashboard.tsx",
  "src\components\BookingHistoryArchive.tsx",
  "src\components\BookingAnalytics.tsx",
  "src\hooks\useCurrency.tsx" 
)

foreach ($file in $files) {
  $path = Join-Path "c:\Users\ahmad\Downloads\lovable-project-87547378-a989-408f-806c-d7f0d5cf1019-2025-12-14" $file
  if (Test-Path $path) {
    try {
      $content = Get-Content $path -Raw
      # Replace "sb." with "supabase."
      $newContent = $content -replace '\bsb\.', 'supabase.'
      # Replace "await sb" with "await supabase" (for cases like "await sb.from")
      $newContent = $newContent -replace 'await sb', 'await supabase'
      
      Set-Content $path $newContent
      Write-Host "Updated $path"
    } catch {
      Write-Host "Error updating $path: $_"
    }
  } else {
    Write-Host "File not found: $path"
  }
}
