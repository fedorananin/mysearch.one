<?php
    require __DIR__.'/config.php';

    // Only cron (CLI) or requests carrying the secret key may trigger an update
    if (php_sapi_name() !== 'cli' && (($_GET['key'] ?? '') !== UPDATE_KEY || UPDATE_KEY === '')) {
        http_response_code(403);
        exit('prohibited');
    }

    $last_update_file = __DIR__.'/last_update.txt';
    $last_update = file_exists($last_update_file) ? (int)file_get_contents($last_update_file) : 0;
    $time_limit = 8*60*60; // 8 hours

    // target filename => [url, gzipped?]
    $databases = [
        'ip_database.mmdb'        => ['https://ipinfo.io/data/free/country_asn.mmdb?token='.IPINFO_TOKEN, false],
        'geolite2-city-ipv4.mmdb' => ['https://cdn.jsdelivr.net/npm/@ip-location-db/geolite2-city-mmdb/geolite2-city-ipv4.mmdb', false],
        'dbip-city-lite.mmdb'     => ['https://cdn.jsdelivr.net/npm/dbip-city-lite/dbip-city-lite.mmdb.gz', true],
    ];

    // Streams $url into $target (gunzipping if needed) via a temp file,
    // so a failed download never clobbers a working database.
    function downloadDatabase($target, $url, $gzipped) {
        $tmp = $target.'.tmp';
        $fp = fopen($tmp, 'wb');
        if (!$fp) return false;
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL            => $url,
            CURLOPT_FILE           => $fp,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_FAILONERROR    => true,
            CURLOPT_TIMEOUT        => 600,
        ]);
        $ok = curl_exec($ch);
        $http = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        unset($ch); // curl_close() is a no-op since PHP 8.0 and deprecated in 8.5
        fclose($fp);
        if (!$ok || $http !== 200 || filesize($tmp) < 1024) {
            unlink($tmp);
            return false;
        }
        if ($gzipped) {
            $gz = gzopen($tmp, 'rb');
            $out = fopen($target.'.unpacked', 'wb');
            while (!gzeof($gz)) fwrite($out, gzread($gz, 65536));
            gzclose($gz);
            fclose($out);
            unlink($tmp);
            $tmp = $target.'.unpacked';
        }
        return rename($tmp, $target);
    }

    // Russian mobile-internet whitelist (community-built, rebuilt daily):
    // https://github.com/ancored/ru-mobile-whitelist — one CIDR per line, IPv4 + IPv6.
    // Compiled into a PHP file of sorted, merged [start, end] ranges so opcache
    // keeps it in memory and a lookup is a binary search (see isInMobileWhitelist()).
    define('WHITELIST_URL', 'https://raw.githubusercontent.com/ancored/ru-mobile-whitelist/release/ru-mobile-whitelist-ip.txt');
    define('WHITELIST_FILE', __DIR__.'/ru-mobile-whitelist.php');

    // CIDR -> [start, end]: ints for IPv4, fixed-length lowercase hex for IPv6
    // (hex of equal length compares in the same order as the address).
    function cidrToRange($cidr) {
        $parts = explode('/', trim($cidr));
        $bin = @inet_pton($parts[0]);
        if ($bin === false) return null;
        $bits = strlen($bin) * 8;
        $prefix = isset($parts[1]) ? (int)$parts[1] : $bits;
        if ($prefix < 0 || $prefix > $bits) return null;
        $start = $end = '';
        for ($i = 0; $i < strlen($bin); $i++) {
            $keep = max(0, min(8, $prefix - $i * 8));      // network bits in this byte
            $mask = (0xFF << (8 - $keep)) & 0xFF;
            $byte = ord($bin[$i]);
            $start .= chr($byte & $mask);
            $end   .= chr(($byte & $mask) | (~$mask & 0xFF));
        }
        if ($bits === 32) return [4, unpack('N', $start)[1], unpack('N', $end)[1]];
        return [6, bin2hex($start), bin2hex($end)];
    }

    function updateWhitelist() {
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL            => WHITELIST_URL,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_FAILONERROR    => true,
            CURLOPT_TIMEOUT        => 120,
        ]);
        $text = curl_exec($ch);
        $http = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        unset($ch); // curl_close() is a no-op since PHP 8.0 and deprecated in 8.5
        if ($text === false || $http !== 200) return false;

        $ranges = [4 => [], 6 => []];
        foreach (preg_split('/\R/', $text) as $line) {
            $line = trim(explode('#', $line)[0]);
            if ($line === '') continue;
            $r = cidrToRange($line);
            if ($r) $ranges[$r[0]][] = [$r[1], $r[2]];
        }
        // Sanity check: the list holds ~30k networks; a tiny result means a broken fetch
        if (count($ranges[4]) < 1000) return false;

        $out = [];
        foreach ($ranges as $v => $list) {
            // IPv6 hex must be compared with strcmp: an all-digit hex string is
            // "numeric" to PHP and <=/<=> would compare it as a lossy float.
            $cmp = $v === 4 ? function ($a, $b) { return $a <=> $b; } : 'strcmp';
            usort($list, function ($a, $b) use ($cmp) { return $cmp($a[0], $b[0]); });
            $starts = $ends = [];
            foreach ($list as [$s, $e]) {
                $n = count($starts);
                if ($n && $cmp($s, $ends[$n - 1]) <= 0) {   // overlapping -> merge
                    if ($cmp($e, $ends[$n - 1]) > 0) $ends[$n - 1] = $e;
                } else {
                    $starts[] = $s;
                    $ends[] = $e;
                }
            }
            $out['v'.$v] = ['starts' => $starts, 'ends' => $ends];
        }
        $out['updated'] = time();

        $tmp = WHITELIST_FILE.'.tmp';
        if (file_put_contents($tmp, "<?php\n// Generated by update.php — do not edit.\nreturn ".var_export($out, true).";\n") === false) return false;
        if (!rename($tmp, WHITELIST_FILE)) return false;
        if (function_exists('opcache_invalidate')) @opcache_invalidate(WHITELIST_FILE, true);
        return true;
    }

    $time = time();
    if ($time - $last_update >= $time_limit) {
        $all_ok = true;
        foreach ($databases as $file => [$url, $gzipped]) {
            if (!downloadDatabase(__DIR__.'/'.$file, $url, $gzipped)) $all_ok = false;
        }
        if (!updateWhitelist()) $all_ok = false;
        if ($all_ok) {
            file_put_contents($last_update_file, $time);
            $last_update = $time;
        }
    }
    echo $last_update;
?>
