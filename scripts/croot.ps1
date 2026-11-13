Get-ChildItem 'C:\' -Directory -Force -ErrorAction SilentlyContinue | ForEach-Object {
  $s = (Get-ChildItem $_.FullName -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
  '{0,10:N2} GB  {1}' -f ($s/1GB), $_.FullName
} | Sort-Object { [double]($_ -split ' ')[0] } -Descending
'---FILES---'
Get-ChildItem 'C:\' -File -Force -ErrorAction SilentlyContinue | ForEach-Object {
  '{0,10:N2} GB  {1}' -f ($_.Length/1GB), $_.FullName
}
