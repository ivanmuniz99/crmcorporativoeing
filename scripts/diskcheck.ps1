$dirs = @(
  'C:\Users\Marlo Indistrial',
  'C:\Users\Marlo Indistrial\AppData\Local',
  'C:\Users\Marlo Indistrial\AppData\Local\Temp',
  'C:\Users\Marlo Indistrial\Documents',
  'C:\Users\Marlo Indistrial\Downloads',
  'C:\Users\Marlo Indistrial\.gradle',
  'C:\Users\Marlo Indistrial\AppData\Local\Pub\Cache',
  'C:\hiberfil.sys',
  'C:\pagefile.sys',
  'C:\swapfile.sys'
)
foreach ($d in $dirs) {
  if (Test-Path $d) {
    if ((Get-Item $d -Force).PSIsContainer) {
      $s = (Get-ChildItem $d -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
    } else {
      $s = (Get-Item $d -Force).Length
    }
    '{0,10:N2} GB  {1}' -f ($s/1GB), $d
  }
}
