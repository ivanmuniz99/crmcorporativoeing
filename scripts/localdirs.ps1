Get-ChildItem 'C:\Users\Marlo Indistrial\AppData\Local' -Directory -Force -ErrorAction SilentlyContinue | ForEach-Object {
  $s = (Get-ChildItem $_.FullName -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
  '{0,10:N2} GB  {1}' -f ($s/1GB), $_.FullName
} | Sort-Object -Descending
