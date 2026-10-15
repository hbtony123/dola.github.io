# mail-check.ps1
#
# Check whether a mailbox really accepts mail, without sending anything.
# It talks SMTP to the MX server: EHLO, MAIL FROM:<> (null sender, which
# skips SPF checks), then RCPT TO:<address>, then disconnects.
# The control address is the point: one address that exists plus one that
# cannot exist tells you whether the answer means anything.
#
#   powershell -ExecutionPolicy Bypass -File mail-check.ps1 -Address you@example.com
#
#   exit 0 = accepted, and the control was rejected  -> trustworthy
#   exit 1 = rejected                                -> mailbox does not exist
#   exit 2 = inconclusive (same answer for both, or no route to the server)
#
# PowerShell 5.1 reads .ps1 files as ANSI, so this file is ASCII only.

param(
    [Parameter(Mandatory)][string]$Address,
    [string]$Mx,
    [int]$Port = 25
)

$ErrorActionPreference = 'Continue'

function Read-Reply($st) {
    $sb = New-Object Text.StringBuilder
    $n = 0
    while ($n -lt 30) {
        $n++
        $buf = New-Object byte[] 2048
        try { $count = $st.Read($buf, 0, 2048) } catch { break }
        if ($count -le 0) { break }
        [void]$sb.Append([Text.Encoding]::ASCII.GetString($buf, 0, $count))
        if ($sb.ToString() -match '(?m)^\d{3} [^\r\n]*\r?\n$') { break }
    }
    return $sb.ToString()
}

function Send-Line($st, $line) {
    $b = [Text.Encoding]::ASCII.GetBytes($line + "`r`n")
    $st.Write($b, 0, $b.Length)
    $st.Flush()
}

function Invoke-Rcpt([string]$hostname, [int]$port, [string]$addr) {
    $tcp = New-Object Net.Sockets.TcpClient
    try {
        $ar = $tcp.BeginConnect($hostname, $port, $null, $null)
        if (-not $ar.AsyncWaitHandle.WaitOne(8000)) { return 'connect timeout' }
        $tcp.EndConnect($ar)
    } catch { return ('connect failed: ' + $_.Exception.Message) }

    $st = $tcp.GetStream()
    $st.ReadTimeout = 15000
    $st.WriteTimeout = 15000

    $null = Read-Reply $st
    Send-Line $st ('EHLO ' + [Net.Dns]::GetHostName()); $null = Read-Reply $st
    Send-Line $st 'MAIL FROM:<>';                       $null = Read-Reply $st
    Send-Line $st ('RCPT TO:<' + $addr + '>')
    $reply = Read-Reply $st
    Send-Line $st 'QUIT'
    try { $tcp.Close() } catch { }
    return $reply.Trim()
}

if (-not $Mx) {
    $domain = $Address.Split('@')[-1]
    $rec = Resolve-DnsName -Name $domain -Type MX -ErrorAction SilentlyContinue |
           Where-Object { $_.NameExchange } | Sort-Object Preference
    if (-not $rec) { Write-Host ('no MX record for ' + $Address); exit 2 }
    $Mx = $rec[0].NameExchange.TrimEnd('.')
}

$domain  = $Address.Split('@')[-1]
$control = ('no-such-user-' + (Get-Random -Minimum 10000 -Maximum 99999) + '@' + $domain)

Write-Host ('mx      : ' + $Mx)
$real = Invoke-Rcpt $Mx $Port $Address
Write-Host ('address : ' + $Address)
Write-Host ('  -> ' + $real)
$ctrl = Invoke-Rcpt $Mx $Port $control
Write-Host ('control : ' + $control)
Write-Host ('  -> ' + $ctrl)

$realOk = $real -match '^2\d\d'
$ctrlOk = $ctrl -match '^2\d\d'

if ($realOk -and -not $ctrlOk) { Write-Host 'RESULT: mailbox exists and accepts mail'; exit 0 }
if (-not $realOk -and -not $ctrlOk) { Write-Host 'RESULT: address rejected'; exit 1 }
Write-Host 'RESULT: inconclusive - the server answered the same way for both'
exit 2
