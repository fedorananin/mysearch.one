<?php
    // /ip — the visitor's IP as plain text, nothing else
    include ("functions_project.php");

    header('Content-Type: text/plain; charset=utf-8');
    header('Cache-Control: no-store');
    header('Access-Control-Allow-Origin: *');

    echo getClientIP();
