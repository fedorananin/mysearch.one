<?php

// basic settings
$ai_temporary = 'true';
$ai_model = '';
$ai_search = 'search';
$ai_domain = 'chatgpt.com';
$ai_provider = 'chatgpt';

$default_bang = 'google';


// --- helpers ----------------------------------------------------------------
function set_pref_cookie($name, $value)
{
    // Secure only over HTTPS so local (http) dev can still store cookies.
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (isset($_SERVER['SERVER_PORT']) && (string) $_SERVER['SERVER_PORT'] === '443');
    setcookie($name, $value, [
        'expires'  => time() + (90 * 24 * 60 * 60),
        'path'     => '/',
        'secure'   => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function sanitize_ai_model($v)
{
    return preg_replace('/[^a-zA-Z0-9\.:\/@#\-]/', '', substr(trim($v), 0, 125));
}

function sanitize_ai_domain($v)
{
    return preg_replace('/[^a-z0-9\-\.\/]/', '', mb_strtolower(trim($v)));
}

function render_page($content)
{
    $page = file_get_contents(__DIR__ . '/page.html');
    return str_replace('###html###', $content, $page);
}

$mode = $_GET['mode'] ?? '';
if ($mode <> 'settings' and $mode <> 'howitworks') $mode = '';

// Raw query is what we redirect with; do NOT HTML-escape it here, or characters
// like & ' " < get corrupted before reaching the target search engine.
$q = (isset($_GET['q']) && is_string($_GET['q'])) ? $_GET['q'] : '';


// Each service is declared once as: target URL => list of aliases (bangs).
// The flat $bangs lookup used throughout the app is built from this below.
$bang_aliases = [
    'https://ya.ru/search/?text={{{s}}}' => ['ya', 'yandex', 'я', 'яндекс'],
    'https://www.google.com/search?q={{{s}}}&num=100' => ['g', 'google', 'г', 'гугл'],
    'https://www.youtube.com/results?search_query={{{s}}}' => ['y', 'yt', 'youtube', 'ютюб', 'ю', 'ютуб', 'ют'],
    'https://www.bing.com/search?q={{{s}}}' => ['b', 'bing', 'б', 'бинг'],
    'https://duckduckgo.com/?q={{{s}}}' => ['d', 'duck', 'duckduck', 'duckduckgo', 'д', 'дак', 'дакдак', 'дакдакго'],
    'https://kagi.com/search?q={{{s}}}' => ['k', 'kagi', 'к', 'каги'],
    'https://search.brave.com/search?q={{{s}}}' => ['br', 'brave', 'бр', 'брейв'],
    'https://www.baidu.com/s?ie=utf-8&wd={{{s}}}' => ['bd', 'baidu', 'бд', 'байду', 'баиду'],
    'https://maps.google.com/maps?q={{{s}}}' => ['gm', 'gmaps', 'map', 'maps', 'гм', 'гк', 'гкарты', 'гмапс', 'гмэпс', 'мэпс'],
    'https://yandex.ru/maps/?text={{{s}}}' => ['ymaps', 'як', 'якарты', 'карты'],
    'https://en.wikipedia.org/w/index.php?search={{{s}}}' => ['w', 'wiki', 'wikipedia'],
    'https://ru.wikipedia.org/w/index.php?search={{{s}}}' => ['в', 'вики', 'википедиа', 'википедия'],
    'https://github.com/search?type=repositories&q={{{s}}}' => ['git', 'github'],
    'https://stackoverflow.com/search?q={{{s}}}' => ['st', 'stack', 'stackoverflow'],
    'https://knowyourmeme.com/search?context=entries&sort=&q={{{s}}}' => ['kym', 'meme', 'knowyourmeme'],
    'https://emojipedia.org/en/search?q={{{s}}}' => ['emoji', 'emojipedia'],
    'https://open.spotify.com/search/{{{s}}}' => ['spotify'],
    'https://www.imdb.com/find/?q={{{s}}}' => ['imdb'],
    'https://www.kinopoisk.ru/index.php?first=no&kp_query={{{s}}}' => ['kino', 'kpoisk', 'kinopoisk', 'кино', 'кпоиск', 'кинопоиск'],
    'https://kino.watch/item/search?query={{{s}}}' => ['kpub', 'kinopub', 'кпаб', 'кинопаб'],
    'https://kinogo.luxury/search/{{{s}}}' => ['kgo', 'kinogo', 'кго', 'киного'],
    'https://www.urbandictionary.com/define.php?term={{{s}}}' => ['ud', 'urban', 'urbandictionary'],
    '{{{ai_link}}}' => ['ai', 'ии', 'аи'],
    'https://translate.google.com/?sl=auto&tl=en&text={{{s}}}' => ['tr', 'translate', 'тр', 'переводчик'],
    'https://www.deepl.com/translator#auto/en/{{{s}}}' => ['deepl', 'дипл'],
    'https://chatgpt.com/?q={{{s}}}&hints=search&temporary-chat=true' => ['chatgpt', 'chat', 'gpt', 'чатгпт', 'чат', 'гпт'],
    'https://claude.ai/new?q={{{s}}}' => ['claude', 'cl', 'клод', 'кл'],
    'https://www.perplexity.ai/search?q={{{s}}}' => ['perplexity', 'перплексити'],
    'https://www.reddit.com/search?q={{{s}}}' => ['r', 'reddit', 'р', 'реддит', 'редит'],
    'https://x.com/search?q={{{s}}}' => ['x', 'tw', 'twitter', 'х', 'твитер', 'твиттер'],
    'https://www.facebook.com/search/top/?q={{{s}}}' => ['fb', 'facebook', 'фб', 'фейсбук'],
    'https://www.pinterest.com/search/pins/?rs=typed&q={{{s}}}' => ['pin', 'pinterest', 'пин', 'пинтерест'],
    'https://rutracker.org/forum/tracker.php?nm={{{s}}}' => ['rutracker', 'рутрекер'],
    'https://rutor.org/search/1/0/100/0/{{{s}}}' => ['rutor', 'рутор'],
    'https://1337x.to/search/{{{s}}}/1/' => ['1337', '1337x', '1337х'],
    'https://flibusta.is/booksearch?ask={{{s}}}' => ['флиб', 'флибуста', 'flib', 'flibusta'],
    'https://oceanofpdf.com/?s={{{s}}}' => ['oceanofpdf', 'opdf'],
    'https://pornolab.net/forum/tracker.php?&nm={{{s}}}' => ['pl', 'plab', 'pornolab'],
    'https://www.xvideos.com/?k={{{s}}}' => ['xv', 'xvid', 'xvideos'],
    'https://www.xnxx.com/search/{{{s}}}' => ['xn', 'xnxx'],
    'https://xhamster.com/search/{{{s}}}' => ['xh', 'xham', 'xhamster'],
    'https://www.pornhub.com/video/search?search={{{s}}}' => ['ph', 'phub', 'pornhub', 'пх', 'пхаб', 'порнхаб'],
    'https://www.youporn.com/search/?query={{{s}}}' => ['yp', 'yporn', 'youporn'],
    'https://www.pornpics.com/?q={{{s}}}' => ['pp', 'ppics', 'pornpics'],
    'https://www.wikifeet.com/search/{{{s}}}' => ['wikifeet', 'wf', 'feet'],
    'https://pmvhaven.com/search/{{{s}}}' => ['pmv', 'pmvhaven'],
    'https://spankbang.com/s/{{{s}}}' => ['spank', 'spankbang'],
    'https://ip.mysearch.one/?ip={{{s}}}' => ['ip', 'айпи', 'ип'],
    'https://www.g2a.com/search?query={{{s}}}' => ['g2a', 'г2а'],
    'https://plati.market/search/{{{s}}}' => ['plati', 'плати'],
    'https://www.aliexpress.com/wholesale?SearchText={{{s}}}' => ['ali', 'aliexpress', 'али'],
    'https://www.ozon.ru/search/?text={{{s}}}' => ['ozon', 'oz', 'озон'],
    'https://www.wildberries.ru/catalog/0/search.aspx?search={{{s}}}' => ['wb', 'wildberries', 'вб', 'вайлдберриз'],
    'https://www.avito.ru/all?q={{{s}}}' => ['avito', 'av', 'авито'],
    'https://www.amazon.com/s?k={{{s}}}' => ['am', 'amazon'],
    'https://developer.mozilla.org/en-US/search?q={{{s}}}' => ['mdn'],
    'https://www.npmjs.com/search?q={{{s}}}' => ['npm'],
    'https://pypi.org/search/?q={{{s}}}' => ['pypi'],
    'https://www.wolframalpha.com/input/?i={{{s}}}' => ['wa', 'wolfram'],
    'https://web.archive.org/web/*/{{{s}}}' => ['archive', 'wayback'],
    'https://www.openstreetmap.org/search?query={{{s}}}' => ['osm'],
    'https://www.twitch.tv/search?term={{{s}}}' => ['twitch', 'tv'],
    'https://www.tiktok.com/search?q={{{s}}}' => ['tt', 'tiktok'],
    'https://soundcloud.com/search?q={{{s}}}' => ['sc', 'soundcloud'],
    'https://www.flaticon.com/search?word={{{s}}}' => ['flaticon', 'icons'],
    'https://fontawesome.com/search?q={{{s}}}&ic=free-collection' => ['fa', 'fontawesome'],
    'https://unsplash.com/s/photos/{{{s}}}?license=free' => ['unsplash', 'photos'],
    'https://www.instagram.com/explore/search/keyword/?q={{{s}}}' => ['ig', 'insta', 'instagram', 'иг', 'инста', 'инстаграм'],
];

$bangs = [];
foreach ($bang_aliases as $bang_url => $bang_alias_list) {
    foreach ($bang_alias_list as $bang_alias) {
        $bangs[$bang_alias] = $bang_url;
    }
}
$bangs_list = array_keys($bangs);

// Bare-word shortcuts (typing the word alone redirects). Same URL => aliases form.
$shortcut_groups = [
    'https://mysearch.one' => ['search', 'mysearch', 'поиск', 'поисковик'],
    'https://pornolab.net/forum/tracker.php?&nm=1080p' => ['pl', 'plab', 'pornolab', 'пл', 'плаб', 'порнолаб'],
    'https://www.youporn.com' => ['юпорн'],
    'https://www.pornpics.com' => ['порнпикс'],
    'https://www.xvideos.com' => ['хвидеос'],
    'https://xhamster.com' => ['ххамстер'],
    'https://xnxx.com' => ['хнхх'],
    'https://vk.com' => ['vk', 'вк'],
    'https://www.linkedin.com' => ['li', 'linked', 'linkedin', 'ли', 'линкед', 'линкедин'],
    'https://www.urbandictionary.com' => ['urban dictionary'],
];

$shortcuts_extra = [];
foreach ($shortcut_groups as $shortcut_url => $shortcut_alias_list) {
    foreach ($shortcut_alias_list as $shortcut_alias) {
        $shortcuts_extra[$shortcut_alias] = $shortcut_url;
    }
}

$ip_queries = ["my ip", "myip", "my ip address", "what is my ip", "what is my ip address", "мой айпи", "мой ip", "какой у меня ip-адрес", "какой у меня ip адрес", "мой айпи адрес"];
$pomodoro_queries = ["pomodoro", "pomodoro timer", "pomodoro timer online", "pomo", "pomotimer", "помодоро", "помодоро таймер", "помо", "помотаймер"];

foreach ($ip_queries as $k => $v) {
    $shortcuts_extra[$v] = 'https://ip.mysearch.one';
}
foreach ($pomodoro_queries as $k => $v) {
    $shortcuts_extra[$v] = 'https://pomodoro.mysearch.one';
}

// cookie magic — read prefs from cookies, then refresh their 90-day expiry
if (isset($_COOKIE['ai_temporary'])) {
    $ai_temporary = ($_COOKIE['ai_temporary'] === 'true') ? 'true' : 'false';
}
set_pref_cookie('ai_temporary', $ai_temporary);

if (isset($_COOKIE['ai_model'])) {
    $ai_model = sanitize_ai_model($_COOKIE['ai_model']);
}
set_pref_cookie('ai_model', $ai_model);

if (isset($_COOKIE['ai_search'])) {
    $ai_search = (trim($_COOKIE['ai_search']) === 'search') ? 'search' : '';
}
set_pref_cookie('ai_search', $ai_search);

if (isset($_COOKIE['ai_domain'])) {
    $ai_domain_value = sanitize_ai_domain($_COOKIE['ai_domain']);
    if ($ai_domain_value <> '') $ai_domain = $ai_domain_value;
}
set_pref_cookie('ai_domain', $ai_domain);

if (isset($_COOKIE['ai_provider'])) {
    $allowed_providers = ['chatgpt', 'claude', 'perplexity', 'custom'];
    $ai_provider = in_array($_COOKIE['ai_provider'], $allowed_providers, true) ? $_COOKIE['ai_provider'] : 'chatgpt';
}
set_pref_cookie('ai_provider', $ai_provider);

if (isset($_COOKIE['default_bang'])) {
    $default_bang_value = trim($_COOKIE['default_bang']);
    if (in_array($default_bang_value, $bangs_list, true)) {
        $default_bang = $default_bang_value;
    }
}
set_pref_cookie('default_bang', $default_bang);


$bang = '';
$original_bang = '';
if ($q <> '') {
    $parts = explode(' ', $q);
    $b = end($parts);
    if (!empty($b) && (substr($b, 0, 1) === '!' || substr($b, 0, 1) === '/' || substr($b, 0, 1) === '-' || substr($b, 0, 1) === ':' || substr($b, 0, 1) === '@')) {
        $bb = substr($b, 1);
        $bbb = substr($b, 0, 1);
        // Remove the last element from the array
        array_pop($parts);
        // Rebuild $q without the bang command
        $q = implode(' ', $parts);
    } else {
        $bb = '';
        $bbb = '';
    }
    if ($bb == '') {
        $bang = $default_bang;
        $original_bang = '';
    } else {
        if (in_array($bb, $bangs_list, true)) {
            $bang = $bb;
            $original_bang = $bb;
        } else {
            $bang = $default_bang;
            $q .= ' ' . $bbb . $bb;
            $original_bang = '';
        }
    }
}

function redirect($link)
{
    echo '<!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Redirecting...</title>
                    <link rel="icon" href="/favicon.ico" sizes="any">
                    <link rel="icon" type="image/png" href="/favicon.png">
                    <link rel="shortcut icon" href="/favicon.ico">
                    <meta http-equiv="refresh" content="0;url=' . $link . '">
                    <script type="text/javascript">
                        window.location.href = \'' . $link . '\';
                    </script>
                    <style>
                    body{background: color #191991;}
                    </style>
                </head>
                <body>
                    <p>If you are not redirected automatically, please <a href="' . $link . '">click here</a>.</p>
                </body>
                </html>';
}


if ($mode == '' and $q <> '') {
    $link = $bangs[$bang];
    if ($ai_provider == 'custom') {
        $ai_link = 'https://' . $ai_domain . '/?q={{{s}}}';
        if (!empty($ai_search)) {
            $ai_link .= '&hints=' . $ai_search;
        }
        if (!empty($ai_model)) {
            $ai_link .= '&model=' . $ai_model;
        }
        if ($ai_temporary == 'true') {
            $ai_link .= '&temporary-chat=true';
        }
        $link = str_replace('{{{ai_link}}}', $ai_link, $link);
    } else {
        $ai_link = $bangs[$ai_provider];
        $link = str_replace('{{{ai_link}}}', $ai_link, $link);
    }

    // rawurlencode (%20 for spaces) is correct for both query strings and URL
    // paths; urlencode's "+" would break path-based bangs like /search/{{{s}}}.
    if ($bang == 'unsplash' || $bang == 'photos') {
        $q_unsplash = str_replace(' ', '-', $q);
        $link = str_replace('{{{s}}}', rawurlencode($q_unsplash), $link);
    } else {
        $link = str_replace('{{{s}}}', rawurlencode($q), $link);
    }

    $shortcuts = [];
    foreach ($bangs as $k => $v) {
        $sl = str_replace('{{{ai_link}}}', $ai_link, $v);
        $sl = preg_replace('/^(https?:\/\/[^\/]+).*$/', '$1', $sl);
        $shortcuts[$k] = $sl;
    }
    $shortcuts = array_merge($shortcuts, $shortcuts_extra);

    if ($original_bang == '' and in_array(mb_strtolower($q), array_keys($shortcuts))) $link = $shortcuts[mb_strtolower($q)];


    //echo '<h3>'.$link.'</h3>';
    redirect($link);
    exit;
}


if ($mode == 'settings') {
    if (isset($_GET['apply'])) {
        if ($_GET['apply'] == 'yes') {
            if (isset($_POST['default_bang'])) {
                $default_bang = trim($_POST['default_bang']);
                if (in_array($default_bang, $bangs_list, true)) {
                    set_pref_cookie('default_bang', $default_bang);
                }
            }

            if (isset($_POST['ai_provider'])) {
                $ai_provider = trim($_POST['ai_provider']);
                $allowed_providers = ['chatgpt', 'claude', 'perplexity', 'custom'];
                if (in_array($ai_provider, $allowed_providers, true)) {
                    set_pref_cookie('ai_provider', $ai_provider);
                }
            }

            if (isset($_POST['ai_model'])) {
                set_pref_cookie('ai_model', sanitize_ai_model($_POST['ai_model']));
            }

            if (isset($_POST['ai_domain'])) {
                set_pref_cookie('ai_domain', sanitize_ai_domain($_POST['ai_domain']));
            }
            if (isset($_POST['ai_temporary'])) {
                $ai_temporary = (trim($_POST['ai_temporary']) === 'true') ? 'true' : 'false';
                set_pref_cookie('ai_temporary', $ai_temporary);
            }
            header('Location: /');
            exit;
        }
    } else {
        $html = '<hr>';
        $html .= '<div class="text">';
        $html .= '<form method="post" action="/?mode=settings&apply=yes">';

        // Default Bang settings
        $html .= '<div class="settings-group">';
        $html .= '<h3>Default search engine</h3>';
        $html .= '<select name="default_bang">';
        $allowed_bangs = ['google', 'yandex', 'bing', 'duckduckgo', 'brave', 'kagi', 'baidu', 'ai'];
        foreach ($allowed_bangs as $bang_key) {
            if (isset($bangs[$bang_key])) {
                $html .= '<option value="' . $bang_key . '"' . ($default_bang == $bang_key ? ' selected' : '') . '>' . $bang_key . '</option>';
            }
        }
        $html .= '</select>';
        $html .= '</div>';
        $html .= '<br><input type="submit" value="Save"><hr>';

        // AI Provider settings
        $html .= '<div class="settings-group">';
        $html .= '<h3>AI provider</h3>';
        $html .= '<select name="ai_provider">';
        $html .= '<option value="chatgpt"' . ($ai_provider == 'chatgpt' ? ' selected' : '') . '>ChatGPT</option>';
        $html .= '<option value="claude"' . ($ai_provider == 'claude' ? ' selected' : '') . '>Claude</option>';
        $html .= '<option value="perplexity"' . ($ai_provider == 'perplexity' ? ' selected' : '') . '>Perplexity</option>';
        $html .= '<option value="custom"' . ($ai_provider == 'custom' ? ' selected' : '') . '>Custom OpenWebUI</option>';
        $html .= '</select>';
        $html .= '<p><strong>These settings configure how the "ai" bang works.</strong> Note that individual bangs for ChatGPT (!chatgpt), Claude (!claude), and Perplexity (!perplexity) work without any additional configuration.</p>';
        $html .= '</div>';

        // AI Model settings (if applicable)
        $html .= '<div class="settings-group">';
        $html .= '<h3>AI model (only for OpenWebUI)</h3>';
        $html .= '<input type="text" name="ai_model" value="' . htmlspecialchars($ai_model) . '" placeholder="AI model (if applicable)">';
        $html .= '<p>If you configured a prefix for your model, you need to enter it with the format <code>prefix.model</code></p>';
        $html .= '</div>';

        // AI Domain settings
        $html .= '<div class="settings-group">';
        $html .= '<h3>AI domain (only for OpenWebUI)</h3>';
        $html .= '<input type="text" name="ai_domain" value="' . htmlspecialchars($ai_domain) . '" placeholder="AI domain">';
        $html .= '</div>';

        // Temporary AI settings
        $html .= '<div class="settings-group">';
        $html .= '<h3>Temporary chat (only for OpenWebUI)</h3>';
        $html .= '<select name="ai_temporary">';
        $html .= '<option value="true"' . ($ai_temporary == 'true' ? ' selected' : '') . '>Yes</option>';
        $html .= '<option value="false"' . ($ai_temporary == 'false' ? ' selected' : '') . '>No</option>';
        $html .= '</select>';
        $html .= '</div>';

        $html .= '<div class="settings-submit">';
        $html .= '<br><input type="submit" value="Save">';
        $html .= '</div>';
        $html .= '</form>';
        $html .= '<p>All your settings will be stored in cookies for 90 days. Each time you use mysearch.one, cookies are prolonged for another 90 days.</p>';
        $html .= '</div><br><br><br><br>';
        echo render_page($html);
    }
}

if ($mode == '' and $q == '') {
    echo render_page('');
}

if ($mode == 'howitworks') {
    echo render_page(file_get_contents(__DIR__ . '/howitworks.txt'));
}
