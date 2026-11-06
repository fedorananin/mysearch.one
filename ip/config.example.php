<?php
// Copy this file to config.php (which is gitignored) and fill in real values.

// Token for the free ipinfo.io country_asn database (https://ipinfo.io/account/data-downloads)
define('IPINFO_TOKEN', '');

// Long random string. update.php refuses to run without it:
// https://ip.mysearch.one/update.php?key=<UPDATE_KEY>
define('UPDATE_KEY', '');

// Long random string shared with the proxy host (ip-proxy/config.php, same value).
// Requests carrying it may pass the visitor's IP in X-MySearch-Client-IP.
// Empty = proxied requests are not trusted (the page would show the proxy's IP).
define('PROXY_KEY', '');
