<?php
    // /json — everything we know about the visitor's IP (or ?ip=<address>) as JSON.
    // Browser data is included only for the visitor's own IP, like on the page.
    include ("addons/BrowserDetection.php");
    include ("addons/MaxMind/autoload.php");
    include ("functions_project.php");

    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('Access-Control-Allow-Origin: *');

    $ip = getRequestedIP();
    if ($ip === null) {
        http_response_code(400);
        $response = ['error' => 'Invalid IP address'];
    } else {
        $response = getPublicIPData($ip, $ip === getClientIP());
    }

    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE), "\n";
