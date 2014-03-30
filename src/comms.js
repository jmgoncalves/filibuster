/** File: comms.js
 * Comms
 *
 * Authors:
 *   - jmgoncalves
 *
 * Copyright:
 *   (c) 2014 jmgoncalves All rights reserved.
 */
'use strict';

/** Class: Comms
 * Filibuster Comms class
 * Handles XMPP events and interfaces with Strophe
 *
 * Parameters:
 *   (Comms) self - itself
 *   (Core) Core - Filibuster core component, holding the application data model and event names
 *   (Strophe) Strophe - Strophe.js XMPP library (http://strophe.im/)
 *   (jQuery) $ - jQuery
 */
var Comms = (function(self, Core, Strophe, $) {
    
    /** Variable: connection
     *  Strophe connection
     */
    self.connection = null;

    /** Variable:  initialPresenceTimer
     *  String identifying a JavaScript timer for waiting to send initial presence
     *  If not null, it means that the function self.initialPresence is cycling, waiting for the initial roster query result
     */
    self.initialPresenceTimer = null;

    /** Variable:  vcardTimer
     *  String identifying a JavaScript timer for waiting to request vcard info
     *  If not null, it means that the function self.? is cycling, requesting vcards for the jid_ids in self.vcardQueue
     */
    self.vcardTimer = null;

    /** Variable:  vcardQueue
     *  TODO
     */
    self.vcardQueue = [];

    /** Function: jidToId
     *  Calculates local id, suitable to use in DOM, from jid
     *
     *  Parameters:
     *   (String) jid - JID of the user
     */
    self.jidToId = function (jid) {
        return Strophe.getBareJidFromJid(jid)
            .replace(/@/g, '-')
            .replace(/\./g, '-');
    };

    /** Function: connect
     *  Called when UI requests connection
     *
     *  Parameters:
     *   (Object) ev - event object
     *   (String) jid - JID
     *   (String) pw - password
     */
    self.connect = function(ev, jid, pw) {
        var conn = new Strophe.Connection(Core.boshUrl);

        // debug mode
        if (Core.debug) {
            conn.rawOutput = function (data) {
                console.log('%c'+data, 'color: blue');
            };
            conn.rawInput = function (data) {
                console.log('%c'+data, 'color: green');
            };
        }
        
        // build connection and handle resulting states
        conn.connect(jid, pw, function (status) {
            if (status === Strophe.Status.CONNECTED) {
                // update profile
                Core.me.jid = Strophe.getBareJidFromJid(Comms.connection.jid);
                Core.me.name = Core.me.jid; // TODO get from vcard
                Core.me.resource = Strophe.getResourceFromJid(Comms.connection.jid);
                $(document).trigger(Core.events.CONNECTED);
            } 
            if (status === Strophe.Status.DISCONNECTED)
                $(document).trigger(Core.events.DISCONNECTED);
            if (status === Strophe.Status.CONNFAIL)
                $(document).trigger(Core.events.CONNECTION_ERROR);
            if (status === Strophe.Status.AUTHFAIL)
                $(document).trigger(Core.events.AUTHENTICATION_ERROR);
        });

        self.connection = conn;
    };

    /** Function: disconnect
     *  Called when UI requests disconnection
     *
     *  Parameters:
     *   (Object) ev - event object
     */
    self.disconnect = function(ev) {
        if ( self.connection !== null ) { // triggered multiple times?!
            self.connection.disconnect();
            self.connection = null;
            $(document).trigger(Core.events.DISCONNECTED);
        }
    };

    /** Function: onConnected
     *  Handles Core CONNECTED event on behalf of the XMPP logic
     *
     *  Parameters:
     *   (Object) ev - event object
     */
    self.onConnected = function (ev) {
        // Initial roster request
        var getRoster = $iq({type: 'get'}).c('query', {xmlns: 'jabber:iq:roster'}); 
        self.connection.sendIQ(getRoster, self.onRoster);

        // XMPP Handlers registration
        self.connection.addHandler(self.onRoster,'jabber:iq:roster', 'iq', 'set');
        self.connection.addHandler(self.onMessage, null, 'message', 'chat');
        self.connection.addHandler(self.onPresence, null, 'presence');

        // a client SHOULD request the roster before sending initial presence - delay it
        self.initialPresenceTimer = window.setTimeout(Comms.initialPresence,500);
    };

    /** Function: initialPresence
     *  Verifies that contactList has been populated and consequently sends initial presence
     */
    self.initialPresence = function() {
        if ( Object.keys(Core.contactList).length > 0 ) {
            window.clearTimeout(self.initialPresenceTimer);
            self.initialPresenceTimer = null;
            self.connection.send($pres());
            self.getVCardInfo(null);
        }
        else
            console.log('%cWARNING: initial presence pending initial roster result...', 'color: red');
    };

    /** Function: onRoster
     *  Handles the initial jabber:iq:roster query result and roster inbound set IQs and accordingly updates contactList
     *
     *  Parameters:
     *   (String) iq - result or set roster IQ
     */
    self.onRoster = function (iq) {
        $(iq).find('item').each(function () {
            var sub = $(this).attr('subscription');
            var jid = $(this).attr('jid');
            var name = $(this).attr('name') || jid;
            var jid_id = Comms.jidToId(jid);
            if (sub === 'remove')
                Core.updateContact(jid_id, jid, name, Core.subscriptionStatus.REMOVE);
            else {
                Core.updateContact(jid_id, jid, name, Core.subscriptionStatus.SUBSCRIBED);
                //self.getVCardInfo(jid_id); // TODO better interaction
                self.vcardQueue.push(jid_id);
            }
        });

        if (self.vcardTimer === null && self.vcardQueue.length > 0)
            self.vcardTimer = window.setTimeout(Comms.handleVCardQueue,1000);

        return true;
    };

    /** Function: onPresence
     *  Handles presence updates
     *
     *  Parameters:
     *   (String) presence - inbound presence update
     */
    self.onPresence = function (presence) {
        var ptype = $(presence).attr('type');
        var from = $(presence).attr('from');
        var bareJid = Strophe.getBareJidFromJid(from);
        
        if (bareJid === Core.me.jid) {
            // handle same JID presence
            if (ptype !== 'error') {
                if (ptype === 'unavailable') {
                    for (var i = 0; i < Core.me.otherResources.length; i++) {
                        if (Core.me.otherResources[i] === from) {
                            Core.me.otherResources.splice(i,1);
                            break;
                        }
                    }
                } else {
                    Core.me.otherResources.push(from);
                }
            }
        } else {
            if (ptype === 'subscribe') {
                // handle subscription requests
                Core.updateContact(self.jidToId(bareJid), bareJid, bareJid, Core.subscriptionStatus.INBOUND_REQUEST);
            } else if (ptype !== 'error') {
                // handle others presence
                if (ptype === 'unavailable') {
                    Core.presenceUnavailable(self.jidToId(bareJid),
                        Strophe.getResourceFromJid(from));
                } else {
                    var show = $(presence).find('show').text();
                    var status = $(presence).find('status').text();
                    Core.updatePresence(self.jidToId(bareJid),from,
                        Strophe.getResourceFromJid(from),show,status);
                }
            }
        }

        return true;
    };

    /** Function: onMessage
     *  Handles received messages, which can be text or events
     *
     *  Parameters:
     *   (String) message - inbound message stanza
     */
    self.onMessage = function (message) {
        var jMessage = $(message);
        var jid_id = self.jidToId(Strophe.getBareJidFromJid(jMessage.attr('from')));
        var composing = jMessage.find('composing');
        var body = jMessage.find('body');

        if (body.length > 0) {
            $(document).trigger(Core.events.MESSAGE_RECEIVED, [jid_id, body.text()]);
        }

        if (composing.length > 0) {
            $(document).trigger(Core.events.COMPOSING_RECEIVED, jid_id);
        }

        return true;
    };

    /** Function: sendMessage
     *  Sends a text message to a contact via XMPP
     *
     *  Parameters:
     *   (Object) ev - event object
     *   (String) jid_id - local id of the user, based on his JID
     *   (String) body - text body of the message to be sent
     */
    self.sendMessage = function (ev, jid_id, body) {
        var jid = Core.contactList[jid_id].presence[Core.contactList[jid_id].mainResource].fullJid; // TODO doesn't work for offline!

        var message = $msg({to: jid,
                            'type': 'chat'})
            .c('body').t(body).up()
            .c('active', {xmlns: 'http://jabber.org/protocol/chatstates'});
        Comms.connection.send(message);
    };

    /** Function: composingMessage
     *  Sends a composing event message to a contact via XMPP
     *
     *  Parameters:
     *   (Object) ev - event object
     *   (String) jid_id - local id of the user, based on his JID
     */
    self.composingMessage = function (ev, jid_id) {
        var jid = Core.contactList[jid_id].presence[Core.contactList[jid_id].mainResource].fullJid; // TODO doesn't work for offline!

        var notify = $msg({to: jid, 'type': 'chat'})
            .c('composing', {xmlns: 'http://jabber.org/protocol/chatstates'});
        Comms.connection.send(notify);

    };

    /** Function: sendSubscribedPresence
     *  Sends a presence subscription authorization and a presence subscription request to a contact via XMPP
     *
     *  Parameters:
     *   (Object) ev - event object
     *   (String) jid_id - local id of the user, based on his JID
     */
    self.sendSubscribedPresence = function (ev, jid_id) {
        self.connection.send($pres({
            to: Core.contactList[jid_id].jid,
            'type': 'subscribed'}));
        self.connection.send($pres({
            to: Core.contactList[jid_id].jid,
            'type': 'subscribe'}));
    };

    /** Function: sendSubscribedPresence
     *  Sends a presence unsubscription request via XMPP
     *
     *  Parameters:
     *   (Object) ev - event object
     *   (String) jid_id - local id of the user, based on his JID
     */
    self.sendUnsubscribedPresence = function (ev, jid_id) {
        self.connection.send($pres({
            to: Core.contactList[jid_id].jid,
            'type': 'unsubscribed'}));
    };

    self.handleVCardQueue = function () {
        if (self.vcardQueue.length > 0) {
            self.getVCardInfo(self.vcardQueue.pop());
        }
        else {
            window.clearTimeout(self.vcardTimer);
            self.vcardTimer = null;
        }
    };

    self.getVCardInfo = function (jid_id) {
        var jid = null;

        if (jid_id === null)
            jid = Core.me.jid;

        if (Core.contactList[jid_id] !== undefined)
            jid = Core.contactList[jid_id].jid;

        if (jid !== null)
            self.connection.vcard.get(function(stanza) {
                var $vCard = $(stanza).find("vCard");
                
                // full name
                var fn = $vCard.find('FN');
                console.log(fn);
                if (fn.length === 1)
                    fn = fn.text();
                else
                    fn = null;
                
                // nickname
                var nickname = $vCard.find('NICKNAME');
                if (nickname.length === 1)
                    nickname = nickname.text();
                else
                    nickname = null;

                // image
                var image = $vCard.find('BINVAL');
                if (image.length === 1)
                    image = 'data:'+$vCard.find('TYPE').text()+';base64,'+image.text();
                else
                    image = null;

                // update
                Core.updateVcard(jid_id, fn, nickname, image);
            }, jid);
    };

    self.setVCardInfo = function (ev, fullName, nickname) {
        //var vcard = $('<vCard/>');
        //vcard.attr('xmlns','vcard-temp');
        //vcard.append('<FN>'+fullName+'</FN>');
        //vcard.append('<NICKNAME>'+nickname+'</NICKNAME>');
        //vcard.append('<BDAY>2014-03-04</BDAY>');
        //vcard.append('<PHOTO><TYPE>image/png</TYPE><BINVAL></BINVAL></PHOTO>');
        var vcard = $($.parseXML('<FN>'+fullName+'</FN>'));
        self.connection.vcard.set(self.setVCardInfoSuccess, vcard.children()[0], Core.me.jid, self.setVCardInfoError);
    };

    self.setVCardInfoSuccess = function () {
        console.log('sucess!');
        console.log(arguments);
    };

    self.setVCardInfoError = function () {
        console.log('error!');
        console.log(arguments);
    };


    /** Function: init
     *  Initialize Comms: register to Core events and unload
     */
    self.init = function() {
        // listen to Core events
        $(document).on(Core.events.CONNECT, self.connect);
        $(document).on(Core.events.CONNECTED, self.onConnected);
        $(document).on(Core.events.DISCONNECT, self.disconnect);
        $(document).on(Core.events.SEND_MESSAGE, self.sendMessage);
        $(document).on(Core.events.COMPOSING_MESSAGE, self.composingMessage);
        $(document).on(Core.events.ACCEPT_PENDING, self.sendSubscribedPresence);
        $(document).on(Core.events.REJECT_PENDING, self.sendUnsubscribedPresence);
        $(document).on(Core.events.SET_PROFILE, self.setVCardInfo);

        // disconnect before unload
        window.addEventListener('beforeunload', self.disconnect);
    };

    return self;
}(Comms || {}, Core, Strophe, jQuery));