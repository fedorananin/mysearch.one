<?php
    $q=@$_GET['q'];
    if ($q<>''){
        echo file_get_contents('https://search.brave.com/api/suggest?q='.urlencode($q));
    }else{
        echo json_encode([''=>['pomodoro timer', 'what is my ip', 'google', 'youtube', 'yandex']], JSON_UNESCAPED_UNICODE);
    }
?>