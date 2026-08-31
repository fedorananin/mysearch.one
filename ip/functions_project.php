<?php

    function getBrowserData($useragent){
        $Browser = new foroco\BrowserDetection();
        $result = $Browser->getAll($useragent);
        if ($result['os_title']=='Windows 10')$result['os_title']='Windows 10/11';
        if ($result['os_title']=='Android 10')$result['os_title']='Android 10+';
        $webview=false;
        $desktop_mode=false;
        if ($result['browser_android_webview'] or $result['browser_ios_webview'])$webview=true;
        if ($result['device_type']=='desktop' or $result['browser_desktop_mode'])$desktop_mode=true;
        $browser=[
            'device'=>$result['device_type'],
            'os_family'=>$result['os_family'],
            'os'=>$result['os_title'],
            'bits'=>$result['64bits_mode'] ? "64" : "32",
            'browser_name'=>$result['browser_name'],
            'browser_version'=>$result['browser_version'],
            'webview'=>$webview,
            'desktop_mode'=>$desktop_mode,
        ];
        $browser['string']=$browser['browser_name'].' '.$browser['browser_version'].', '.$browser['os'].', '.$browser['device'];
        return $browser;
    }


    function calculateTimezoneOffset($timezone) {
        if ($timezone != 'Etc/UTC' and mb_strtolower($timezone)<>'unknown') {
            try {
                $timezone_obj = new DateTimeZone($timezone);
                $now = new DateTime('now', $timezone_obj);
                $offset_seconds = $timezone_obj->getOffset($now);
                $hours = floor(abs($offset_seconds) / 3600);
                $minutes = floor((abs($offset_seconds) % 3600) / 60);
                $sign = $offset_seconds >= 0 ? '+' : '-';
                return "UTC $sign" . sprintf("%d:%02d", $hours, $minutes);
            } catch (Exception $e) {
                return "UTC +0:00";
            }
        } elseif (mb_strtolower($timezone)=='unknown') {
            return "UTC +Unknown";
        } else {
            return "UTC +0:00";
        }
    }

    function getIPData($ip){
        $reader1 = new MaxMind\Db\Reader(__DIR__.'/ip_database.mmdb');
        $reader2 = new MaxMind\Db\Reader(__DIR__.'/geolite2-city-ipv4.mmdb');
        $reader3 = new MaxMind\Db\Reader(__DIR__.'/dbip-city-lite.mmdb');
        if(!filter_var($ip, FILTER_VALIDATE_IP))$ip='0.0.0.0';
        $data=$reader1->get($ip);
        $ip_data=[];
        if ($ip=='127.0.0.1'){
            $ip_data=[
                'ip'=>$ip,
                'city_name'=>'localhost',
                'region_name'=>'localhost',
                'latitude'=>0,
                'longitude'=>0,
                'timezone'=>'Etc/UTC',
                'timezone_offset'=>calculateTimezoneOffset('Etc/UTC'),
                'country_code'=>'xx',
                'country_name'=>'localhost',
                'continent_code'=>'xx',
                'continent_name'=>'World',
                'asn_code'=>'localhost',
                'asn_name'=>'localhost',
                'asn_domain'=>'localhost',
                'asn_url'=>'/',
            ];
        }elseif(!is_array($data)){
            $ip_data=[
                'ip'=>$ip,
                'city_name'=>'Unknown',
                'region_name'=>'Unknown',
                'latitude'=>0,
                'longitude'=>0,
                'timezone'=>'Etc/UTC',
                'timezone_offset'=>calculateTimezoneOffset('Etc/UTC'),
                'country_code'=>'xx',
                'country_name'=>'Unknown',
                'continent_code'=>'xx',
                'continent_name'=>'World',
                'asn_code'=>'Unknown',
                'asn_name'=>'Unknown',
                'asn_domain'=>'localhost',
                'asn_url'=>'/',
            ];
        }else{
            $data_extra=$reader2->get($ip);
            $data_extra_backup=$reader3->get($ip);
            $cc=(string) @$data_extra['country_code'];
            $level=1;
            if (mb_strtolower($cc)<>mb_strtolower($data['country'])){
                if (mb_strtolower($data['country'])==mb_strtolower($data_extra_backup['country']['iso_code'])){
                    $level=2;
                    $data_extra=[
                        'city'=>$data_extra_backup['city']['names']['en'],
                        'state1'=>$data_extra_backup['subdivisions'][0]['names']['en'],
                        'state2'=>'',
                        'latitude'=>$data_extra_backup['location']['latitude'],
                        'longitude'=>$data_extra_backup['location']['longitude'],
                        'timezone'=>'Unknown',
                    ];
                }else{
                    $level=0;
                    $data_extra=[
                        'city'=>'Unknown',
                        'state1'=>'Unknown',
                        'state2'=>'',
                        'latitude'=>0,
                        'longitude'=>0,
                        'timezone'=>'Unknown',
                    ];
                }
            }
            if ($level==1 and mb_strtolower($data['country'])==mb_strtolower($data_extra_backup['country']['iso_code'])){
                if (@$data_extra['city']=='')$data_extra['city']=$data_extra_backup['city']['names']['en'];
                if (@$data_extra['state1']=='')$data_extra['state1']=$data_extra_backup['subdivisions'][0]['names']['en'];
                if (@$data_extra['latitude']=='')$data_extra['latitude']=$data_extra_backup['location']['latitude'];
                if (@$data_extra['longitude']=='')$data_extra['longitude']=$data_extra_backup['location']['longitude'];
                if (@$data_extra['timezone']=='')$data_extra['timezone']='Unknown';
            }

            if (@$data_extra['city']=='')$data_extra['city']='Unknown';
            if (@$data_extra['state1']=='')$data_extra['state1']='Unknown';
            if (@$data_extra['latitude']=='')$data_extra['latitude']=0;
            if (@$data_extra['longitude']=='')$data_extra['longitude']=0;
            if (@$data_extra['timezone']=='')$data_extra['timezone']='Unknown';

            if (@$data['asn']=='')$data['asn']='Unknown';
            if (@$data['as_name']=='')$data['as_name']='Unknown';
            $ip_data=[
                'ip'=>$ip,
                'city_name'=>$data_extra['city'],
                'region_name'=>isset($data_extra['state2']) && !empty($data_extra['state2']) ? $data_extra['state1'] . ', ' . $data_extra['state2'] : $data_extra['state1'],
                'latitude'=>$data_extra['latitude'],
                'longitude'=>$data_extra['longitude'],
                'timezone'=>$data_extra['timezone'],
                'timezone_offset'=>calculateTimezoneOffset($data_extra['timezone']),
                'country_code'=>mb_strtolower($data['country']),
                'country_name'=>$data['country_name'],
                'continent_code'=>mb_strtolower($data['continent']),
                'continent_name'=>$data['continent_name'],
                'asn_code'=>$data['asn'],
                'asn_name'=>$data['as_name'],
                'asn_domain'=>$data['as_domain'],
                'asn_url'=>empty($data['as_domain']) ? '/' : 'https://'.$data['as_domain'],
            ];
        }

        return $ip_data;
    }

?>