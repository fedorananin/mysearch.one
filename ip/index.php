<?php
    define('FLAG_CDN', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.3.2/flags/');

    include ("addons/BrowserDetection.php");
    include ("addons/MaxMind/autoload.php");

    include ("functions_project.php");

    $useragent = $_SERVER['HTTP_USER_AGENT'];
    $remote = $_SERVER['REMOTE_ADDR'];
    if (!filter_var($remote, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $forwarded = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
        $forwarded = trim($forwarded);
        if (filter_var($forwarded, FILTER_VALIDATE_IP)) $remote = $forwarded;
    }
    $ip = $real_ip = $remote;
    //$ip='45.154.89.177';
    $get_ip=@$_GET['ip'];
    if ($get_ip<>''){
        // Validate that $get_ip is a valid IP address
        if (filter_var($get_ip, FILTER_VALIDATE_IP)) {
            $ip = htmlspecialchars($get_ip);
        }
    }


    $browser=getBrowserData($useragent);

    $ip_data=getIPData($ip);

?>
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title><?php echo $ip_data['ip'].' → '.$ip_data['country_name']; ?></title>
        <link rel="icon" href="favicon.png" type="image/png">
        <?php echo '<link rel="icon" href="'.FLAG_CDN.'1x1/'.$ip_data['country_code'].'.svg" type="image/svg+xml">'; ?>
        <link rel="canonical" href="https://ip.mysearch.one" />
        <script defer src="https://cloud.umami.is/script.js" data-website-id="99e24bb6-9edd-4ab9-a040-b30607ed8b59" data-tag="ip"></script>
        <meta property="og:title" content="IP lookup" />
        <meta property="og:description" content="IP geolocation information" />
        <meta property="og:image" content="https://ip.mysearch.one/favicon.png" />
        <meta property="og:url" content="https://ip.mysearch.one" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="IP lookup" />

        <style>
            *, * *, * * * {
                box-sizing: border-box;
            }
            html, body {
                min-height: 100vh;
                margin: 0;
                padding: 0;
            }
            body {
                background-color: #191919;
                color: #D4D4D4;
                font-family: system-ui, Arial, sans-serif;
                text-align: center;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                width:100%;
            }
            a {
                color: #8ab4f8;
                text-decoration: none;
                transition: color 0.2s ease;
            }
            a:hover {
                color: #aecbfa;
                text-decoration: underline;
            }
            img.flag {
                display: block;
                width: 100%;
                margin: 0 auto;
                max-width: 128px;
            }
            h1.ip {
                text-align: center;
                font-weight: 900;
                font-size: 450%;
                margin: 0 0;
                line-height: 0.9;
            }
            p.country {
                text-align: center;
                font-size: 175%;
                margin: 10px 0;
            }
            p.country > span{
                font-size:75%;
            }
            p.browser {
                text-align: center;
                font-size: 125%;
                margin: 10px 0;
            }
            hr {
                border: none;
                height: 1px;
                background-color: #333;
                margin: 32px 0;
                opacity: 0.7;
                width: 100%;
            }
            form{
                display: block;
                width:100%;
            }
            .search-input {
                width: 100% !important;
                max-width:100%;
                padding: 12px 16px;
                font-size: 110%;
                border: 1px solid #333;
                border-radius: 8px;
                background-color: #252525;
                color: #d4d4d4;
                outline: none;
                transition: all 0.3s ease;
                display: block;
            }
            .search-input:focus {
                border-color: #4d4d4d;
                box-shadow: 0 0 8px rgba(255, 255, 255, 0.1);
            }
            
            /* Styles for screens less than 700px */
            @media screen and (max-width: 700px) {
                h1.ip {
                    font-size: 300%;
                }
                p.country {
                    font-size: 140%;
                }
                p.browser {
                    font-size: 110%;
                }
                .container {
                    padding: 10px;
                }
            }

            /* Styles for screens less than 550px */
            @media screen and (max-width: 550px) {
                h1.ip {
                    font-size: 250%;
                }
                p.country {
                    font-size: 130%;
                }
                p.browser {
                    font-size: 105%;
                }
                .container {
                    padding: 6px;
                }
            }
        </style>
    </head>
    <body>
    <div class="container">
        <h1 class="ip"><?php echo $ip_data['ip'];  ?></h1>
        <p class="asn">
            <?php
                echo '<small>🌐 <a href="'.$ip_data['asn_url'].'" target="_blank" title="'.$ip_data['asn_code'].'">'.$ip_data['asn_name'].'</a></small>';
            ?>
        </p>
        <hr>
        <p class="flag">
            <?php
                echo '<img class="flag" src="'.FLAG_CDN.'4x3/'.$ip_data['country_code'].'.svg" alt="'.htmlspecialchars($ip_data['country_name']).' flag">';
            ?>
        </p>
        <p class="country">
            <?php
                echo '<b>'.$ip_data['country_name'].'</b><br>'.$ip_data['region_name'].', '.$ip_data['city_name'];
            ?>
            <br>
            <span>⌚ <?php echo $ip_data['timezone'].' ('.$ip_data['timezone_offset'].')'; ?></span>
            <br>
            <span>🌍 <?php echo $ip_data['continent_name']; ?></span>
        </p>
        <hr>
        <form action="/" method="get">
            <?php
                echo '<input type="search" name="ip" value="'.$ip.'" placeholder="Type in any IPv4" class="search-input">';
            ?>
        </form>
        <p style="margin-top:4px;font-size:80%;margin-bottom:0;">Enter any IP address to get detailed information about its location, network, and timezone.</p>
        <hr>
        <?php
            if ($ip==$real_ip){
                echo '<p>🖥️ '.$browser['string'].'</p><hr>';
            }
        ?>
        <p><!--<a href="/api.html">Free API</a><br>--><small>© 2025 ⁃ Made by <a href="https://www.linkedin.com/in/fedorananin/" target="_blank">Fёdor Ananin</a></small></p>
    </div>
    </body>
</html>
<?php
?>