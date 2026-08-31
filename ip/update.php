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
        curl_close($ch);
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

    $time = time();
    if ($time - $last_update >= $time_limit) {
        $all_ok = true;
        foreach ($databases as $file => [$url, $gzipped]) {
            if (!downloadDatabase(__DIR__.'/'.$file, $url, $gzipped)) $all_ok = false;
        }
        if ($all_ok) {
            file_put_contents($last_update_file, $time);
            $last_update = $time;
        }
    }
    echo $last_update;
?>
