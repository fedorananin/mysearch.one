<?php
// Proxy for Brave search suggestions.
// A server-side proxy is REQUIRED because Brave's suggest endpoint sends no
// CORS headers, so the browser cannot fetch it directly from client-side JS.
// It also keeps the user's IP from being exposed to Brave.

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=600');

$q = (isset($_GET['q']) && is_string($_GET['q'])) ? trim($_GET['q']) : '';

// OpenSearch suggestion format: [query, [suggestions]]
if ($q === '') {
    echo json_encode(['', ['pomodoro timer', 'what is my ip', 'google', 'youtube', 'yandex']], JSON_UNESCAPED_UNICODE);
    exit;
}

$url = 'https://search.brave.com/api/suggest?q=' . urlencode($q);
$body = false;

if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 2,
        CURLOPT_TIMEOUT        => 3,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (compatible; mysearch.one suggest proxy)',
    ]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    // No curl_close(): it is a no-op since PHP 8.0 and deprecated in 8.5.
    if ($code < 200 || $code >= 300) {
        $body = false;
    }
} else {
    // Fallback if cURL is unavailable; still bounded by a timeout.
    $ctx = stream_context_create(['http' => ['timeout' => 3]]);
    $body = @file_get_contents($url, false, $ctx);
}

if ($body === false || $body === '') {
    // Graceful degradation: valid empty suggestion list, not a broken response.
    echo json_encode([$q, []], JSON_UNESCAPED_UNICODE);
    exit;
}

echo $body;
