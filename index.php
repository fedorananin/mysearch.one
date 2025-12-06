<?php

    // basic settings
    $ai_temporary='true';
    $ai_model='';
    $ai_search='search';
    $ai_domain='chatgpt.com';
    $ai_provider='chatgpt';

    $default_bang='google';


    $mode=@$_GET['mode'];
    if ($mode<>'settings' and $mode<>'howitworks')$mode='';

    if (isset($_GET['q'])){
        $q=htmlspecialchars($_GET['q']);
    }else{
        $q='';
    }


    $bangs=[
        'ya'=>'https://ya.ru/search/?text={{{s}}}',
        'yandex'=>'https://ya.ru/search/?text={{{s}}}',
        'я'=>'https://ya.ru/search/?text={{{s}}}',
        'яндекс'=>'https://ya.ru/search/?text={{{s}}}',

        'g'=>'https://www.google.com/search?q={{{s}}}&num=100',
        'google'=>'https://www.google.com/search?q={{{s}}}&num=100',
        'г'=>'https://www.google.com/search?q={{{s}}}&num=100',
        'гугл'=>'https://www.google.com/search?q={{{s}}}&num=100',

        'y'=>'https://www.youtube.com/results?search_query={{{s}}}',
        'yt'=>'https://www.youtube.com/results?search_query={{{s}}}',
        'youtube'=>'https://www.youtube.com/results?search_query={{{s}}}',
        'ютюб'=>'https://www.youtube.com/results?search_query={{{s}}}',
        'ю'=>'https://www.youtube.com/results?search_query={{{s}}}',
        'ютуб'=>'https://www.youtube.com/results?search_query={{{s}}}',
        'ют'=>'https://www.youtube.com/results?search_query={{{s}}}',

        'b'=>'https://www.bing.com/search?q={{{s}}}',
        'bing'=>'https://www.bing.com/search?q={{{s}}}',
        'б'=>'https://www.bing.com/search?q={{{s}}}',
        'бинг'=>'https://www.bing.com/search?q={{{s}}}',

        'd'=>'https://duckduckgo.com/?q={{{s}}}',
        'duck'=>'https://duckduckgo.com/?q={{{s}}}',
        'duckduck'=>'https://duckduckgo.com/?q={{{s}}}',
        'duckduckgo'=>'https://duckduckgo.com/?q={{{s}}}',
        'д'=>'https://duckduckgo.com/?q={{{s}}}',
        'дак'=>'https://duckduckgo.com/?q={{{s}}}',
        'дакдак'=>'https://duckduckgo.com/?q={{{s}}}',
        'дакдакго'=>'https://duckduckgo.com/?q={{{s}}}',

        'k'=>'https://kagi.com/search?q={{{s}}}',
        'kagi'=>'https://kagi.com/search?q={{{s}}}',
        'к'=>'https://kagi.com/search?q={{{s}}}',
        'каги'=>'https://kagi.com/search?q={{{s}}}',

        'br'=>'https://search.brave.com/search?q={{{s}}}',
        'brave'=>'https://search.brave.com/search?q={{{s}}}',
        'бр'=>'https://search.brave.com/search?q={{{s}}}',
        'брейв'=>'https://search.brave.com/search?q={{{s}}}',

        'bd'=>'https://www.baidu.com/s?ie=utf-8&wd={{{s}}}',
        'baidu'=>'https://www.baidu.com/s?ie=utf-8&wd={{{s}}}',
        'бд'=>'https://www.baidu.com/s?ie=utf-8&wd={{{s}}}',
        'байду'=>'https://www.baidu.com/s?ie=utf-8&wd={{{s}}}',
        'баиду'=>'https://www.baidu.com/s?ie=utf-8&wd={{{s}}}',

        'gm'=>'https://maps.google.com/maps?q={{{s}}}',
        'gmaps'=>'https://maps.google.com/maps?q={{{s}}}',
        'map'=>'https://maps.google.com/maps?q={{{s}}}',
        'maps'=>'https://maps.google.com/maps?q={{{s}}}',
        'гм'=>'https://maps.google.com/maps?q={{{s}}}',
        'гк'=>'https://maps.google.com/maps?q={{{s}}}',
        'гкарты'=>'https://maps.google.com/maps?q={{{s}}}',
        'гмапс'=>'https://maps.google.com/maps?q={{{s}}}',
        'гмэпс'=>'https://maps.google.com/maps?q={{{s}}}',
        'мэпс'=>'https://maps.google.com/maps?q={{{s}}}',

        'ymaps'=>'https://yandex.ru/maps/?text={{{s}}}',
        'як'=>'https://yandex.ru/maps/?text={{{s}}}',
        'якарты'=>'https://yandex.ru/maps/?text={{{s}}}',
        'карты'=>'https://yandex.ru/maps/?text={{{s}}}',

        'w'=>'https://en.wikipedia.org/w/index.php?search={{{s}}}',
        'wiki'=>'https://en.wikipedia.org/w/index.php?search={{{s}}}',
        'wikipedia'=>'https://en.wikipedia.org/w/index.php?search={{{s}}}',
        'в'=>'https://ru.wikipedia.org/w/index.php?search={{{s}}}',
        'вики'=>'https://ru.wikipedia.org/w/index.php?search={{{s}}}',
        'википедиа'=>'https://ru.wikipedia.org/w/index.php?search={{{s}}}',
        'википедия'=>'https://ru.wikipedia.org/w/index.php?search={{{s}}}',

        'git'=>'https://github.com/search?type=repositories&q={{{s}}}',
        'github'=>'https://github.com/search?type=repositories&q={{{s}}}',

        'st'=>'https://stackoverflow.com/search?q={{{s}}}',
        'stack'=>'https://stackoverflow.com/search?q={{{s}}}',
        'stackoverflow'=>'https://stackoverflow.com/search?q={{{s}}}',

        'kym'=>'https://knowyourmeme.com/search?context=entries&sort=&q={{{s}}}',
        'meme'=>'https://knowyourmeme.com/search?context=entries&sort=&q={{{s}}}',
        'knowyourmeme'=>'https://knowyourmeme.com/search?context=entries&sort=&q={{{s}}}',

        'emoji'=>'https://emojipedia.org/en/search?q={{{s}}}',
        'emojipedia'=>'https://emojipedia.org/en/search?q={{{s}}}',

        'spotify'=>'https://open.spotify.com/search/{{{s}}}',

        'imdb'=>'https://www.imdb.com/find/?q={{{s}}}',

        'kino'=>'https://www.kinopoisk.ru/index.php?first=no&kp_query={{{s}}}',
        'kpoisk'=>'https://www.kinopoisk.ru/index.php?first=no&kp_query={{{s}}}',
        'kinopoisk'=>'https://www.kinopoisk.ru/index.php?first=no&kp_query={{{s}}}',
        'кино'=>'https://www.kinopoisk.ru/index.php?first=no&kp_query={{{s}}}',
        'кпоиск'=>'https://www.kinopoisk.ru/index.php?first=no&kp_query={{{s}}}',
        'кинопоиск'=>'https://www.kinopoisk.ru/index.php?first=no&kp_query={{{s}}}',

        'kpub'=>'https://kino.pub/item/search?query={{{s}}}',
        'kinopub'=>'https://kino.pub/item/search?query={{{s}}}',
        'кпаб'=>'https://kino.pub/item/search?query={{{s}}}',
        'кинопаб'=>'https://kino.pub/item/search?query={{{s}}}',

        'ud'=>'https://www.urbandictionary.com/define.php?term={{{s}}}',
        'urban'=>'https://www.urbandictionary.com/define.php?term={{{s}}}',
        'urbandictionary'=>'https://www.urbandictionary.com/define.php?term={{{s}}}',

        'ai'=>'{{{ai_link}}}',
        'ии'=>'{{{ai_link}}}',
        'аи'=>'{{{ai_link}}}',

        'tr'=>'https://translate.google.com/?sl=auto&tl=en&text={{{s}}}',
        'translate'=>'https://translate.google.com/?sl=auto&tl=en&text={{{s}}}',
        'тр'=>'https://translate.google.com/?sl=auto&tl=en&text={{{s}}}',
        'переводчик'=>'https://translate.google.com/?sl=auto&tl=en&text={{{s}}}',
        'deepl'=>'https://www.deepl.com/translator#auto/en/{{{s}}}',
        'дипл'=>'https://www.deepl.com/translator#auto/en/{{{s}}}',

        'chatgpt'=>'https://chatgpt.com/?q={{{s}}}&hints=search&temporary-chat=true',
        'chat'=>'https://chatgpt.com/?q={{{s}}}&hints=search&temporary-chat=true',
        'gpt'=>'https://chatgpt.com/?q={{{s}}}&hints=search&temporary-chat=true',
        'чатгпт'=>'https://chatgpt.com/?q={{{s}}}&hints=search&temporary-chat=true',
        'чат'=>'https://chatgpt.com/?q={{{s}}}&hints=search&temporary-chat=true',
        'гпт'=>'https://chatgpt.com/?q={{{s}}}&hints=search&temporary-chat=true',

        'claude'=>'https://claude.ai/new?q={{{s}}}',
        'cl'=>'https://claude.ai/new?q={{{s}}}',
        'клод'=>'https://claude.ai/new?q={{{s}}}',
        'кл'=>'https://claude.ai/new?q={{{s}}}',

        'perplexity'=>'https://www.perplexity.ai/search?q={{{s}}}',
        'перплексити'=>'https://www.perplexity.ai/search?q={{{s}}}',

        'r'=>'https://www.reddit.com/search?q={{{s}}}',
        'reddit'=>'https://www.reddit.com/search?q={{{s}}}',
        'р'=>'https://www.reddit.com/search?q={{{s}}}',
        'реддит'=>'https://www.reddit.com/search?q={{{s}}}',
        'редит'=>'https://www.reddit.com/search?q={{{s}}}',

        'x'=>'https://x.com/search?q={{{s}}}',
        'tw'=>'https://x.com/search?q={{{s}}}',
        'twitter'=>'https://x.com/search?q={{{s}}}',
        'х'=>'https://x.com/search?q={{{s}}}',
        'твитер'=>'https://x.com/search?q={{{s}}}',
        'твиттер'=>'https://x.com/search?q={{{s}}}',

        'fb'=>'https://www.facebook.com/search/top/?q={{{s}}}',
        'facebook'=>'https://www.facebook.com/search/top/?q={{{s}}}',
        'фб'=>'https://www.facebook.com/search/top/?q={{{s}}}',
        'фейсбук'=>'https://www.facebook.com/search/top/?q={{{s}}}',

        'pin'=>'https://www.pinterest.com/search/pins/?rs=typed&q={{{s}}}',
        'pinterest'=>'https://www.pinterest.com/search/pins/?rs=typed&q={{{s}}}',
        'пин'=>'https://www.pinterest.com/search/pins/?rs=typed&q={{{s}}}',
        'пинтерест'=>'https://www.pinterest.com/search/pins/?rs=typed&q={{{s}}}',

        'rutracker'=>'https://rutracker.org/forum/tracker.php?nm={{{s}}}',
        'рутрекер'=>'https://rutracker.org/forum/tracker.php?nm={{{s}}}',

        'rutor'=>'https://rutor.org/search/1/0/100/0/{{{s}}}',
        'рутор'=>'https://rutor.org/search/1/0/100/0/{{{s}}}',
        
        '1337'=>'https://1337x.to/search/{{{s}}}/1/',
        '1337x'=>'https://1337x.to/search/{{{s}}}/1/',
        '1337х'=>'https://1337x.to/search/{{{s}}}/1/',

        'флиб'=>'https://flibusta.is/booksearch?ask={{{s}}}',
        'флибуста'=>'https://flibusta.is/booksearch?ask={{{s}}}',
        'flib'=>'https://flibusta.is/booksearch?ask={{{s}}}',
        'flibusta'=>'https://flibusta.is/booksearch?ask={{{s}}}',

        'oceanofpdf'=>'https://oceanofpdf.com/?s={{{s}}}',
        'opdf'=>'https://oceanofpdf.com/?s={{{s}}}',

        'pl'=>'https://pornolab.net/forum/tracker.php?&nm={{{s}}}',
        'plab'=>'https://pornolab.net/forum/tracker.php?&nm={{{s}}}',
        'pornolab'=>'https://pornolab.net/forum/tracker.php?&nm={{{s}}}',

        'xv'=>'https://www.xvideos.com/?k={{{s}}}',
        'xvid'=>'https://www.xvideos.com/?k={{{s}}}',
        'xvideos'=>'https://www.xvideos.com/?k={{{s}}}',

        'xn'=>'https://www.xnxx.com/search/{{{s}}}',
        'xnxx'=>'https://www.xnxx.com/search/{{{s}}}',

        'xh'=>'https://xhamster.com/search/{{{s}}}',
        'xham'=>'https://xhamster.com/search/{{{s}}}',
        'xhamster'=>'https://xhamster.com/search/{{{s}}}',

        'ph'=>'https://www.pornhub.com/video/search?search={{{s}}}',
        'phub'=>'https://www.pornhub.com/video/search?search={{{s}}}',
        'pornhub'=>'https://www.pornhub.com/video/search?search={{{s}}}',
        'пх'=>'https://www.pornhub.com/video/search?search={{{s}}}',
        'пхаб'=>'https://www.pornhub.com/video/search?search={{{s}}}',
        'порнхаб'=>'https://www.pornhub.com/video/search?search={{{s}}}',

        'yp'=>'https://www.youporn.com/search/?query={{{s}}}',
        'yporn'=>'https://www.youporn.com/search/?query={{{s}}}',
        'youporn'=>'https://www.youporn.com/search/?query={{{s}}}',

        'pp'=>'https://www.pornpics.com/?q={{{s}}}',
        'ppics'=>'https://www.pornpics.com/?q={{{s}}}',
        'pornpics'=>'https://www.pornpics.com/?q={{{s}}}',

        'wikifeet'=>'https://www.wikifeet.com/search/{{{s}}}',
        'wf'=>'https://www.wikifeet.com/search/{{{s}}}',
        'feet'=>'https://www.wikifeet.com/search/{{{s}}}',

        'pmv'=>'https://pmvhaven.com/search/{{{s}}}',
        'pmvhaven'=>'https://pmvhaven.com/search/{{{s}}}',

        'spank'=>'https://spankbang.com/s/{{{s}}}',
        'spankbang'=>'https://spankbang.com/s/{{{s}}}',

        'ip'=>'https://ip.mysearch.one/?ip={{{s}}}',
        'айпи'=>'https://ip.mysearch.one/?ip={{{s}}}',
        'ип'=>'https://ip.mysearch.one/?ip={{{s}}}',

        'g2a'=>'https://www.g2a.com/search?query={{{s}}}',
        'г2а'=>'https://www.g2a.com/search?query={{{s}}}',

        'plati'=>'https://plati.market/search/{{{s}}}',
        'плати'=>'https://plati.market/search/{{{s}}}',

        'ali'=>'https://www.aliexpress.com/wholesale?SearchText={{{s}}}',
        'aliexpress'=>'https://www.aliexpress.com/wholesale?SearchText={{{s}}}',
        'али'=>'https://www.aliexpress.com/wholesale?SearchText={{{s}}}',

        'ozon'=>'https://www.ozon.ru/search/?text={{{s}}}',
        'oz'=>'https://www.ozon.ru/search/?text={{{s}}}',
        'озон'=>'https://www.ozon.ru/search/?text={{{s}}}',

        'wb'=>'https://www.wildberries.ru/catalog/0/search.aspx?search={{{s}}}',
        'wildberries'=>'https://www.wildberries.ru/catalog/0/search.aspx?search={{{s}}}',
        'вб'=>'https://www.wildberries.ru/catalog/0/search.aspx?search={{{s}}}',
        'вайлдберриз'=>'https://www.wildberries.ru/catalog/0/search.aspx?search={{{s}}}',

        'avito'=>'https://www.avito.ru/all?q={{{s}}}',
        'av'=>'https://www.avito.ru/all?q={{{s}}}',
        'авито'=>'https://www.avito.ru/all?q={{{s}}}',

        'am'=>'https://www.amazon.com/s?k={{{s}}}',
        'amazon'=>'https://www.amazon.com/s?k={{{s}}}',

        'mdn'=>'https://developer.mozilla.org/en-US/search?q={{{s}}}',
        'npm'=>'https://www.npmjs.com/search?q={{{s}}}',
        'pypi'=>'https://pypi.org/search/?q={{{s}}}',

        'wa'=>'https://www.wolframalpha.com/input/?i={{{s}}}',
        'wolfram'=>'https://www.wolframalpha.com/input/?i={{{s}}}',

        'archive'=>'https://web.archive.org/web/*/{{{s}}}',
        'wayback'=>'https://web.archive.org/web/*/{{{s}}}',

        'osm'=>'https://www.openstreetmap.org/search?query={{{s}}}',

        'twitch'=>'https://www.twitch.tv/search?term={{{s}}}',
        'tv'=>'https://www.twitch.tv/search?term={{{s}}}',
        'tt'=>'https://www.tiktok.com/search?q={{{s}}}',
        'tiktok'=>'https://www.tiktok.com/search?q={{{s}}}',
        'sc'=>'https://soundcloud.com/search?q={{{s}}}',
        'soundcloud'=>'https://soundcloud.com/search?q={{{s}}}',

        'flaticon'=>'https://www.flaticon.com/search?word={{{s}}}',
        'icons'=>'https://www.flaticon.com/search?word={{{s}}}',

        'fa'=>'https://fontawesome.com/search?q={{{s}}}&ic=free-collection',
        'fontawesome'=>'https://fontawesome.com/search?q={{{s}}}&ic=free-collection',

        'unsplash'=>'https://unsplash.com/s/photos/{{{s}}}?license=free',
        'photos'=>'https://unsplash.com/s/photos/{{{s}}}?license=free',
    ];

    $shortcuts_extra=[
        'search'=>'https://mysearch.one',
        'mysearch'=>'https://mysearch.one',
        'поиск'=>'https://mysearch.one',
        'поисковик'=>'https://mysearch.one',

        'pl'=>'https://pornolab.net/forum/tracker.php?&nm=1080p',
        'plab'=>'https://pornolab.net/forum/tracker.php?&nm=1080p',
        'pornolab'=>'https://pornolab.net/forum/tracker.php?&nm=1080p',
        'пл'=>'https://pornolab.net/forum/tracker.php?&nm=1080p',
        'плаб'=>'https://pornolab.net/forum/tracker.php?&nm=1080p',
        'порнолаб'=>'https://pornolab.net/forum/tracker.php?&nm=1080p',

        'юпорн'=>'https://www.youporn.com',
        'порнпикс'=>'https://www.pornpics.com',
        'хвидеос'=>'https://www.xvideos.com',
        'ххамстер'=>'https://xhamster.com',
        'хнхх'=>'https://xnxx.com',

        'vk'=>'https://vk.com',
        'вк'=>'https://vk.com',

        'ig'=>'https://instagram.com',
        'insta'=>'https://instagram.com',
        'instagram'=>'https://instagram.com',
        'иг'=>'https://instagram.com',
        'инста'=>'https://instagram.com',
        'инстаграм'=>'https://instagram.com',

        'li'=>'https://www.linkedin.com',
        'linked'=>'https://www.linkedin.com',
        'linkedin'=>'https://www.linkedin.com',
        'ли'=>'https://www.linkedin.com',
        'линкед'=>'https://www.linkedin.com',
        'линкедин'=>'https://www.linkedin.com',

        'urban dictionary'=>'https://www.urbandictionary.com',

    ];

    $ip_queries = ["my ip", "myip", "my ip address", "what is my ip", "what is my ip address", "мой айпи", "мой ip", "какой у меня ip-адрес", "какой у меня ip адрес", "мой айпи адрес"];
    $pomodoro_queries = ["pomodoro", "pomodoro timer", "pomodoro timer online", "pomo", "pomotimer", "помодоро", "помодоро таймер", "помо", "помотаймер"];

    foreach ($ip_queries as $k=>$v){$shortcuts_extra[$v]='https://ip.mysearch.one';}
    foreach ($pomodoro_queries as $k=>$v){$shortcuts_extra[$v]='https://pomodoro.mysearch.one';}

        // cookie magic
        if (isset($_COOKIE['ai_temporary'])) {
            if ($_COOKIE['ai_temporary'] === 'true') {
                $ai_temporary = 'true';
            } else {
                $ai_temporary = 'false';
            }
        }
        setcookie('ai_temporary', $ai_temporary, time() + (90 * 24 * 60 * 60), '/');
        if (isset($_COOKIE['ai_model'])) {
            $ai_model = preg_replace('/[^a-zA-Z0-9\.:\/@#\-]/', '', substr(trim($_COOKIE['ai_model']), 0, 125));
        }
        setcookie('ai_model', $ai_model, time() + (90 * 24 * 60 * 60), '/');
        if (isset($_COOKIE['ai_search'])) {
            $ai_search_value = trim($_COOKIE['ai_search']);
            $ai_search = ($ai_search_value === 'search') ? 'search' : '';
        }
        setcookie('ai_search', $ai_search, time() + (90 * 24 * 60 * 60), '/');
    
        if (isset($_COOKIE['ai_domain'])) {
            $ai_domain_value = trim($_COOKIE['ai_domain']);
            $ai_domain_value = mb_strtolower($ai_domain_value);
            $ai_domain_value = preg_replace('/[^a-z0-9\-\.\/]/', '', $ai_domain_value);
            if ($ai_domain_value<>'')$ai_domain=$ai_domain_value;
        }
        setcookie('ai_search', $ai_search, time() + (90 * 24 * 60 * 60), '/');
        if (isset($_COOKIE['ai_provider'])) {
            if ($_COOKIE['ai_provider']=='chatgpt'){
                $ai_provider='chatgpt';
            }elseif ($_COOKIE['ai_provider']=='claude'){
                $ai_provider='claude';
            }elseif ($_COOKIE['ai_provider']=='perplexity'){
                $ai_provider='perplexity';
            }elseif ($_COOKIE['ai_provider']=='custom'){
                $ai_provider='custom';
            }else{
                $ai_provider='chatgpt';
            }
        }
        setcookie('ai_provider', $ai_provider, time() + (90 * 24 * 60 * 60), '/');
        
        if (isset($_COOKIE['default_bang'])) {
            $default_bang_value = trim($_COOKIE['default_bang']);
            $bangs_list = array_keys($bangs);
            if (in_array($default_bang_value, $bangs_list)) {
                $default_bang = $default_bang_value;
            }
        }
        setcookie('default_bang', $default_bang, time() + (90 * 24 * 60 * 60), '/');


    $bang='';
    $original_bang='';
    if ($q<>''){
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
            $bb='';
            $bbb='';
        }
        if ($bb==''){
            $bang=$default_bang;
            $original_bang='';
        }else{
            $bangs_list=array_keys($bangs);
            if (in_array($bb, $bangs_list)) {
                $bang = $bb;
                $original_bang=$bb;
            } else {
                $bang = $default_bang;
                $q.=' '.$bbb.$bb;
                $original_bang='';
            }
        }
    }

    if ($bang=='browser')$mode='browser';

    function redirect($link){
        echo '<!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Redirecting...</title>
                    <script src="https://cloud.umami.is/script.js" data-website-id="99e24bb6-9edd-4ab9-a040-b30607ed8b59" data-tag="search-redirect"></script>
                    <meta http-equiv="refresh" content="0;url='.$link.'">
                    <script type="text/javascript">
                        window.location.href = \''.$link.'\';
                    </script>
                    <style>
                    body{background: color #191991;}
                    </style>
                </head>
                <body>
                    <p>If you are not redirected automatically, please <a href="'.$link.'">click here</a>.</p>
                </body>
                </html>';
    }
    

    if ($mode=='' and $q<>''){
        $link=$bangs[$bang];
        if ($ai_provider=='custom'){
            $ai_link='https://'.$ai_domain.'/?q={{{s}}}';
            if (!empty($ai_search)){$ai_link.='&hints='.$ai_search;}
            if (!empty($ai_model)){$ai_link.='&model='.$ai_model;}
            if ($ai_temporary=='true'){$ai_link.='&temporary-chat=true';}
            $link=str_replace('{{{ai_link}}}', $ai_link, $link);
        }else{
            $ai_link=$bangs[$ai_provider];
            $link=str_replace('{{{ai_link}}}', $ai_link, $link);
        }
        
        if ($bang == 'unsplash' || $bang == 'photos') {
            $q_unsplash = str_replace(' ', '-', $q);
            $link=str_replace('{{{s}}}', urlencode($q_unsplash), $link);
        } else {
            $link=str_replace('{{{s}}}', urlencode($q), $link);
        }

        $shortcuts=[];
        foreach($bangs as $k=>$v){
            $sl='';
            $sl=@str_replace('{{{ai_link}}}', @$ai_link, $v);
            $sl=preg_replace('/^(https?:\/\/[^\/]+).*$/', '$1', $sl);
            $shortcuts[$k]=$sl;
        }
        $shortcuts=array_merge($shortcuts, $shortcuts_extra);

        if ($original_bang=='' and in_array(mb_strtolower($q), array_keys($shortcuts)))$link=$shortcuts[mb_strtolower($q)];


        //echo '<h3>'.$link.'</h3>';
        redirect($link);
        exit;
    }


    /*if ($mode=='browser'){
        $link=$bangs[$bang];
        $ai_link='https://'.$ai_domain.'/?q={{{s}}}';
        if (!empty($ai_search)){$ai_link.='&hints='.$ai_search;}
        if (!empty($ai_model)){$ai_link.='&model='.$ai_model;}
        if ($ai_temporary=='true'){$ai_link.='&temporary-chat=true';}
        $link=str_replace('{{{ai_link}}}', $ai_link, $link);
        $link=str_replace('{{{s}}}', urlencode($q), $link);
        $html='<hr><h3>'.$q.'</h3><p>Try a couple more searches, so your browser can recognise mysearch.one as a search engine.</p>'."<p>Don't forget the '/browser' bang in the end.</p>";
        $page=file_get_contents('page.html');
        $page=str_replace('###html###', $html, $page);
        echo $page;
        exit;
    }*/

    if ($mode=='settings'){
        if (isset($_GET['apply'])){
            if ($_GET['apply']=='yes'){
                if (isset($_POST['default_bang'])) {
                    $default_bang = trim($_POST['default_bang']);
                    $bangs_list = array_keys($bangs);
                    if (in_array($default_bang, $bangs_list)) {
                        setcookie('default_bang', $default_bang, time() + (90 * 24 * 60 * 60), '/');
                    }
                }
                
                if (isset($_POST['ai_provider'])) {
                    $ai_provider = trim($_POST['ai_provider']);
                    $allowed_providers = ['chatgpt', 'claude', 'perplexity', 'custom'];
                    if (in_array($ai_provider, $allowed_providers)) {
                        setcookie('ai_provider', $ai_provider, time() + (90 * 24 * 60 * 60), '/');
                    }
                }
                
                if (isset($_POST['ai_model'])) {
                    $ai_model = trim($_POST['ai_model']);
                    setcookie('ai_model', $ai_model, time() + (90 * 24 * 60 * 60), '/');
                }
                
                if (isset($_POST['ai_domain'])) {
                    $ai_domain = trim($_POST['ai_domain']);
                    setcookie('ai_domain', $ai_domain, time() + (90 * 24 * 60 * 60), '/');
                }
                if (isset($_POST['ai_temporary'])) {
                    $ai_temporary = trim($_POST['ai_temporary']);
                    setcookie('ai_temporary', $ai_temporary, time() + (90 * 24 * 60 * 60), '/');
                }
                header('Location: /');
                exit;
            }
        }else{
            $page=file_get_contents('page.html');
            $html='<hr>';
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
            
            // AI Search settings
            $html .= '<input type="hidden" name="ai_search" value="no">';
            
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
            $page=str_replace('###html###', $html, $page);
            echo $page;
        }
    }

    if ($mode=='' and $q==''){
        $page=file_get_contents('page.html');
        $page=str_replace('###html###', '', $page);
        echo $page;
    }

    if ($mode=='howitworks'){
        $page=file_get_contents('page.html');
        $html=file_get_contents('howitworks.txt');
        $page=str_replace('###html###', $html, $page);
        echo $page;
    }


?>