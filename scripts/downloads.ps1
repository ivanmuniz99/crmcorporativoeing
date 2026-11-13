$dl = 'C:\Users\Marlo Indistrial\Downloads'
Get-ChildItem $dl -Force -ErrorAction SilentlyContinue | ForEach-Object {
  if ($_.PSIsContainer) {
    $s = (Get-ChildItem $_.FullName -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
  } else { $s = $_.Length }
  [PSCustomObject]@{ GB=[math]::Round($s/1GB,2); Name=$_.Name }
} | Sort-Object GB -Descending | Select-Object -First 25 | Format-Table -AutoSize
