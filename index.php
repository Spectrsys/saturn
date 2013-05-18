<?php
require_once 'google-api-php-client/src/Google_Client.php';
require_once 'google-api-php-client/src/contrib/Google_CalendarService.php';
session_start();

$client = new Google_Client();
$client->setApplicationName("Saturn");

// Visit https://code.google.com/apis/console?api=calendar to generate your
// client id, client secret, and to register your redirect uri.
 $client->setClientId('512508236814-d35qanajio78edinfs3sekn56g8ia07l.apps.googleusercontent.com');
 $client->setClientSecret('Onhyzb0B8l1VltUAjcslrLbk');
 $client->setRedirectUri('http://saturnproject.com');
// $client->setDeveloperKey('insert_your_developer_key');
$cal = new Google_CalendarService($client);

if (isset($_GET['logout'])) {
    unset($_SESSION['token']);
}

if (isset($_GET['code'])) {
    $client->authenticate($_GET['code']);
    $_SESSION['token'] = $client->getAccessToken();
    header('Location: http://' . $_SERVER['HTTP_HOST'] . $_SERVER['PHP_SELF']);
}

if (isset($_SESSION['token'])) {
    $client->setAccessToken($_SESSION['token']);
}

if ($client->getAccessToken()) {
    $calList = $cal->calendarList->listCalendarList();
    print "<h1>Calendar List</h1><pre>" . print_r($calList, true) . "</pre>";


    $_SESSION['token'] = $client->getAccessToken();
} else {
    $authUrl = $client->createAuthUrl();
    print "<a class='login' href='$authUrl'>Connect Me!</a>";
}
?>

<!DOCTYPE html>
    <!-- saved from url=(0014)about:internet -->
    <!--[if lt IE 7]> <html itemscope itemtype="http://schema.org/Blog" xmlns="http://www.w3.org/1999/xhtml" xmlns:fb="http://www.facebook.com/2008/fbml" xml:lang="en-US" class="no-js lt-ie9 lt-ie8 lt-ie7" ng-app="saturnApp"> <![endif]-->
    <!--[if IE 7 ]>    <html itemscope itemtype="http://schema.org/Blog" xmlns="http://www.w3.org/1999/xhtml" xmlns:fb="http://www.facebook.com/2008/fbml" xml:lang="en-US" class="no-js lt-ie9 lt-ie8" ng-app="saturnApp"> <![endif]-->
    <!--[if IE 8 ]>    <html itemscope itemtype="http://schema.org/Blog" xmlns="http://www.w3.org/1999/xhtml" xmlns:fb="http://www.facebook.com/2008/fbml" xml:lang="en-US" class="no-js lt-ie9" ng-app="saturnApp"> <![endif]-->
    <!--[if gt IE 8]><!--> <html itemscope itemtype="http://schema.org/Blog" xmlns="http://www.w3.org/1999/xhtml" xmlns:fb="http://www.facebook.com/2008/fbml" xml:lang="en-US" class="no-js" ng-app="saturnApp">	<!--<![endif]-->

    <head>
        <!--Meta Tags-->
        <meta charset="UTF-8" />
        <meta name="language" content="en-US" />

        <!--IE-->
        <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />
        <meta http-equiv="imagetoolbar" content="no" />
        <meta http-equiv="Page-Enter" content="blendTrans(duration=0)" />
        <meta http-equiv="Page-Exit" content="blendTrans(duration=0)" />
        <meta name="SKYPE_TOOLBAR" content="SKYPE_TOOLBAR_PARSER_COMPATIBLE" />

        <!--Mobile-->
        <meta name="viewport" content="width=device-width" />

        <!--Styles-->
        <link rel="stylesheet" type="text/css" href="css/bootstrap.min.css"/>
        <link rel="stylesheet" type="text/css" href="css/bootstrap-responsive.min.css"/>
        <link rel="stylesheet" type="text/css" href="css/angular-ui.min.css" />
        <link rel="stylesheet" type="text/css" href="css/fullcalendar.css"/>
        <link rel="stylesheet" type="text/css" href="css/bootstrap-timepicker.min.css"/>
        <link rel="stylesheet" type="text/css" href="css/font-awesome.min.css"/>
        <link rel="stylesheet" type="text/css" href="themes/smoothness/jquery-ui-1.10.2.smoothness.min.css"/>
        <link rel="stylesheet" type="text/css" href="css/application.css"/>

        <!--Scripts-->
        <script type="text/javascript" src="js/modernizr.2.6.2.min.js" charset="utf-8"></script>
        <!--[if lte IE 8]>
        <script src="js/angular-ui-ieshiv.min.js" charset="UTF-8"></script>
        <![endif]-->

        <!--Title-->
        <title>AngularJS Callendar</title>
    </head>
    <body data-spy="scroll" data-target="#sidebar .nav">
        <div class="navbar navbar-fixed-top">
            <div class="navbar-inner">
                <div class="container">
                    <a href="#/" class="brand">
                        <i class="icon-beer"></i>
                        Saturn
                    </a>

                    <!--user navigation-->
                    <nav id="user-nav" class="pull-right nav-">
                        <ul>
                            <li>
                                <div class="btn-group">
                                    <a class="btn dropdown-toggle" data-toggle="dropdown" href="#">
                                        <i class="icon-user"></i>
                                        John Doe
                                        <span class="icon-caret-down"></span>
                                    </a>
                                    <ul class="dropdown-menu">
                                        <li><a href="#">Action</a></li>
                                        <li><a href="#">Another action</a></li>
                                        <li><a href="#">Something else here</a></li>
                                        <li class="divider"></li>
                                        <li><a href="#">Separated link</a></li>
                                    </ul>
                                </div>
                            </li>
                            <li>
                                <a href="#/settings">
                                    <i class="icon-wrench" data-toggle="tooltip" data-placement="bottom" title="Account settings"></i>
                                </a>
                            </li>
                            <li>
                                <a href="/user/logout">
                                    <i class="icon-signout" data-toggle="tooltip" data-placement="bottom" title="Sign out"></i>
                                </a>
                            </li>
                        </ul>
                    </nav>
                    <!--/user navigation-->
                </div>
            </div>
        </div>

        <div class="container-fluid">
            <div class="row-fluid" ng-view></div>
        </div>

        <!--Scripts-->
        <!--[if lt IE 7 ]>
        <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/chrome-frame/1.0.2/CFInstall.min.js" charset="utf-8"></script>
        <script type="text/javascript">window.attachEvent("onload",function(){CFInstall.check({mode:"overlay"})})</script>
        <![endif]-->

        <!--libraries-->
        <script src="//ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js" charset="utf-8"></script>
        <script src="//ajax.googleapis.com/ajax/libs/jqueryui/1.10.2/jquery-ui.min.js" charset="UTF-8"></script>
        <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.1.4/angular.min.js" charset="UTF-8"></script>
        <script src="https://apis.google.com/js/client.js?onload=handleClientLoad" charset="utf-8"></script>

        <!--dependencies-->
        <script src="js/angular-resource.min.js" charset="UTF-8"></script>
        <script src="js/bootstrap.min.js" charset="UTF-8"></script>
        <script src="js/jquery.colorPicker.min.js" charset="UTF-8"></script>
        <script src="js/angular-ui.min.js" charset="UTF-8"></script>
        <script src="js/ui-bootstrap-tpls-0.3.0.min.js" charset="UTF-8"></script>
        <script src="js/bootstrap-timepicker.min.js" charset="UTF-8"></script>
        <script src="js/fullcalendar.min.js" charset="UTF-8"></script>
        <script src="js/gcal.js" charset="UTF-8"></script>

        <!--directives-->
        <script type="text/javascript" src="js/directives/timepicker.js" charset="utf-8"></script>
        <script type="text/javascript" src="js/directives/colorpicker.js" charset="utf-8"></script>

        <!--application-->
        <script type="text/javascript" src="js/application.js" charset="utf-8"></script>
    </body>
</html>