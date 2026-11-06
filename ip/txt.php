<?php
    // /txt — the visitor's IP (or ?ip=<address>) and everything we know about it, as plain text.
    // Browser data is included only for the visitor's own IP, like on the page.
    include ("addons/BrowserDetection.php");
    include ("addons/MaxMind/autoload.php");
    include ("functions_project.php");

    header('Content-Type: text/plain; charset=utf-8');
    header('Cache-Control: no-store');
    header('Access-Control-Allow-Origin: *');

    $ip = getRequestedIP();
    if ($ip === null) {
        http_response_code(400);
        echo "Invalid IP address\n";
        exit;
    }

    $d = getPublicIPData($ip, $ip === getClientIP());

    $lines = [
        'IP' => $d['ip'],
        'Country' => $d['country_name'].' ('.$d['country_code'].')',
        'Region' => $d['region_name'],
        'City' => $d['city_name'],
        'Coordinates' => $d['latitude'].', '.$d['longitude'],
        'Timezone' => $d['timezone'] === 'Unknown' ? 'Unknown' : $d['timezone'].' ('.$d['timezone_offset'].')',
        'Continent' => $d['continent_name'].' ('.$d['continent_code'].')',
        'ASN' => $d['asn_code'],
        'Network' => $d['asn_name'],
        'Network domain' => $d['asn_domain'] ?? '',
    ];
    // Shown only on a positive match, same as the badge on the page
    if ($d['ru_mobile_whitelist']) $lines['RKN mobile whitelist'] = 'yes';
    if (isset($d['browser'])) {
        $lines['Browser'] = $d['browser']['string'];
        $lines['User agent'] = $d['browser']['user_agent'];
    }

    $width = max(array_map('strlen', array_keys($lines))) + 2;
    foreach ($lines as $label => $value) {
        if ($value === '') continue;
        echo str_pad($label.':', $width), $value, "\n";
    }
