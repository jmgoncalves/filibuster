Filibuster
==========

Intro
-----

Filibuster is a web-based XMPP client by jmgoncalves. It uses Strophe, jQuery and Handlebars.js.

Configure BOSH Endpoint
-----------------------

Filibuster can be served as a normal webapp on a HTTP server, and it uses [BOSH](http://xmpp.org/extensions/xep-0124.html) to connect to the XMPP server over an HTTP connection.

Recent browsers support CORS configurations, which is required so that the Filibuster code served by your standard HTTP server can connect to the XMPP server HTTP binding. However, you can make your web server behave as a reverse proxy to the XMPP server, bypassing the need for CORS.

The configurations described below assume you use this method and that your XMPP server listens to BOSH on port 7070 on host *yourxmppserver.com*, and that your HTTP server listens to port 80 on host *yourhttpserver.com*.

### Filibuster

Edit *index.html* in the root of Filibuster

    <!-- init -->
    <script>Filibuster.init({
      url: 'http://yourhttpserver.com/bosh/',
      debug: false
    });</script>

### Apache2

After your Filibuster alias

    # Filibuster
    Alias /filibuster "YOUR_FILIBUSTER_CHECKOUT_DIR"

    <Directory "YOUR_FILIBUSTER_CHECKOUT_DIR">
        Options Indexes FollowSymLinks
        AllowOverride None
        Order allow,deny
        Allow from all
    </Directory>

Add the reverse proxy

    # Proxy to bypass CORS
    ProxyPass /bosh/ http://yourxmppserver.com:7070/http-bind/
    ProxyPassReverse /bosh/ http://yourxmppserver.com:7070/http-bind/

### nginx

TODO