<?php
    // ru.ip.mysearch.one — a thin relay to ip.mysearch.one, so the IP databases live in one place.
    // The visitor's IP is passed in X-MySearch-Client-IP together with the shared PROXY_KEY;
    // ip/functions_project.php (getClientIP) trusts that header only when the key matches.

    require __DIR__.'/config.php';

    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($method !== 'GET' && $method !== 'HEAD') {
        http_response_code(405);
        header('Allow: GET, HEAD');
        exit;
    }

    // Same rule as on the main site: behind a local reverse proxy REMOTE_ADDR is
    // private/reserved, so the first X-Forwarded-For entry is used instead.
    $client = $_SERVER['REMOTE_ADDR'] ?? '';
    if (!filter_var($client, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $forwarded = trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
        if (filter_var($forwarded, FILTER_VALIDATE_IP)) $client = $forwarded;
    }

    // Response headers worth passing through (everything else is the upstream server's business)
    $pass = ['content-type', 'cache-control', 'expires', 'last-modified', 'etag', 'access-control-allow-origin', 'location'];
    $headers = [];

    $ch = curl_init(UPSTREAM.($_SERVER['REQUEST_URI'] ?? '/'));
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_NOBODY => $method === 'HEAD',
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => [
            'User-Agent: '.($_SERVER['HTTP_USER_AGENT'] ?? ''),
            'X-MySearch-Client-IP: '.$client,
            'X-MySearch-Proxy-Key: '.PROXY_KEY,
        ],
        CURLOPT_HEADERFUNCTION => function ($ch, $line) use (&$headers, $pass) {
            $parts = explode(':', $line, 2);
            if (count($parts) === 2 && in_array(strtolower(trim($parts[0])), $pass, true)) {
                $headers[] = trim($line);
            }
            return strlen($line);
        },
    ]);
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);

    if ($body === false || $status === 0) {
        http_response_code(502);
        header('Content-Type: text/plain; charset=utf-8');
        header('Cache-Control: no-store');
        echo "Upstream unavailable\n";
        exit;
    }

    http_response_code($status);
    foreach ($headers as $h) {
        // Keep redirects on this host: an absolute upstream URL would leave the tested route
        if (stripos($h, 'location:') === 0) {
            $h = str_ireplace(UPSTREAM, 'https://'.$_SERVER['HTTP_HOST'], $h);
        }
        header($h);
    }
    echo $body;
