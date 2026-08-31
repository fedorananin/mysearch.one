<?php
    include ("addons/BrowserDetection.php");
    include ("addons/MaxMind/autoload.php");

    include ("functions_project.php");


    $get_ua=@$_GET['browser'];
    $get_ip=@$_GET['ip'];
    $get_token=@$_GET['token'];

    $tokens=[
        'ihwgefiowugefoiuwgfoighy9p78yq479gpusefb87ogfwgn',
        'gilwuegfoqwiygf98p34gyouashfp9iuawfp9n8wyfp9nyp9'
    ];

    if (in_array($get_token, $tokens)){
        if ($get_ip<>'' and in_array($get_ip, ['my', 'this', 'current']))$get_ip=$_SERVER['REMOTE_ADDR'];
    if ($get_ua<>'' and in_array($get_ua, ['my', 'this', 'current']))$get_ua=$_SERVER['HTTP_USER_AGENT'];

    $response=[];

    if ($get_ip){
        $response['ip']=getIPData($get_ip);
    }
    if ($get_ua){
        $response['browser']=getBrowserData($get_ua);
    }


    $json=json_encode($response, JSON_UNESCAPED_UNICODE);

    echo $json;
    }else{
        echo 'prohibited';
    }

    

?>