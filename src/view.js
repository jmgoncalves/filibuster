/** File: view.js
 * View
 *
 * Authors:
 *   - jmgoncalves
 *
 * Copyright:
 *   (c) 2014 jmgoncalves All rights reserved.
 */
'use strict';

/** Class: View
 * Filibuster View class
 * Handles UI events and manipulates the DOM
 *
 * Parameters:
 *   (Comms) self - itself
 *   (Core) Core - Filibuster core component, holding the application data model and event names
 *   (jQuery) $ - jQuery
 *   (Handlebars) Handlebars - Handlebars.js templating library (http://handlebarsjs.com/)
 */
var View = (function(self, Core, $, Handlebars) {

    /** Array: visibleChats
     *  Array of chats which are visible
     *  
     *  Contains jid_ids, String which locally id of the contact, given by self.jidToId
     *  Should have one or 0 elements at all times, but the array is used to handle race conditions
     */
    self.visibleChats = [];

    /** Variable: defaultImageSrc
     *  The default image to be displayed when vcard doens't have an image
     */
    self.defaultImageSrc = './res/img/default.png';


    /** Function: initializeChatDOM
     *  TODO
     *
     *  Parameters:
     *   (String) jid_id - local id of the user, based on his JID
     */
    self.initializeChatDOM = function(jid_id) {
        var imgSrc = self.defaultImageSrc;
        if (Core.contactList[jid_id].vcard.image !== null)
            imgSrc = Core.contactList[jid_id].vcard.image;

        // append handlebars template
        $('#chat-area').append($(self.chatTemplate({ 
            'jid_id': jid_id,
            'jid': Core.contactList[jid_id].jid,
            'fn': Core.contactList[jid_id].vcard.fn,
            'nickname': Core.contactList[jid_id].vcard.nickname,
            'image': imgSrc
        })));

        // handle pending cases
        if (Core.contactList[jid_id].subscription === Core.subscriptionStatus.INBOUND_REQUEST) {
            var chatDiv = $('#chat-'+jid_id);
            chatDiv.children('.chat-messages').addClass('hidden'); // TODO why hide it?
            chatDiv.children('.chat-input').addClass('hidden');
            chatDiv.children('.user-info').append($(self.inboundTemplate({ 'jid': Core.contactList[jid_id].jid })));
        }
        //if (Core.contactList[jid_id].subscription === Core.subscriptionStatus.OUTBOUND_REQUEST) TODO
        
        // bind data
        $('#chat-' + jid_id).data('jid_id', jid_id);
    };

    /** Function: updateUserInfo
     *  TODO
     *
     *  Parameters:
     *   (String) jid_id - local id of the user, based on his JID
     */
    self.updateUserInfo = function(jid_id) {
        // append handlebars template
        var uInfo = $('#chat-'+jid_id+' .user-info');
        uInfo.children('.full-name').text(Core.contactList[jid_id].vcard.fn);
        uInfo.children('.nickname').text(Core.contactList[jid_id].vcard.nickname);
        if (Core.contactList[jid_id].vcard.image === null)
            uInfo.children('.contact-image').attr('src', self.defaultImageSrc);
        else
            uInfo.children('.contact-image').attr('src', Core.contactList[jid_id].vcard.image);

        // pending cases TODO ?
    };

    /** Function: changeChatFocus
     *  TODO
     *
     *  Parameters:
     *   (String) jid_id - local id of the user, based on his JID
     */
    self.changeChatFocus = function (jid_id) {
        if (self.visibleChats.length==0)
            $('#profile').addClass('hidden');

        if (jid_id !== undefined) {
            self.visibleChats.unshift(jid_id);

            var chat = $('#chat-area #chat-' + jid_id);
            if (chat.length === 0) {
               self.initializeChatDOM(jid_id);
            }
        }

        while (self.visibleChats.length > 1) 
            $('#chat-area #chat-' + self.visibleChats.pop()).addClass('hidden');

        if (self.visibleChats.length === 1) {
            if (jid_id !== undefined) {
                $('#chat-' + self.visibleChats[0]).removeClass('hidden');
                $('#chat-' + self.visibleChats[0] + ' input').focus();
            } else {
                $('#chat-' + self.visibleChats[0]).addClass('hidden');
                self.visibleChats.pop();
                $('#profile').removeClass('hidden');
            }
        } else {
            $('#profile').removeClass('hidden');
        }
    };

    /** Function: acceptPendingContact
     *  TODO
     *
     *  Parameters:
     *   (String) jid_id - local id of the user, based on his JID
     */
    self.acceptPendingContact = function(jid_id) {
        // cleanup chat area
        $('#chat-' + jid_id + ' .chat-messages').removeClass('hidden');
        $('#chat-' + jid_id + ' .chat-input').removeClass('hidden');
        $('#chat-' + jid_id + ' .user-info').empty();

        Core.updateContact(jid_id,'','',Core.subscriptionStatus.SUBSCRIBED);

        $(document).trigger(Core.events.ACCEPT_PENDING, jid_id); // change core data? only on confirmation?
    };

    /** Function: rejectPendingContact
     *  TODO
     *
     *  Parameters:
     *   (String) jid_id - local id of the user, based on his JID
     */
    self.rejectPendingContact = function(jid_id) {
        Core.updateContact(jid_id,'','',Core.subscriptionStatus.REMOVE);
        $(document).trigger(Core.events.REJECT_PENDING, jid_id);
    };

    /** Function: onConnected
     *  Handles Core CONNECTED event on behalf of the UI
     */
    self.onConnected = function () {
        // roster update
        $('#lnk-profile .roster-contact')
            .addClass('online')
            .removeClass('offline')
            .text(Core.me.name);

        $('#login .error-message').text(''); // reset error message
        $('#login').addClass('hidden'); // hide login div
        $('#connected').removeClass('hidden'); // show profile div
    };

    /** Function: onDisconnected
     *  Handles Core DISCONNECTED event on behalf of the UI
     */
    self.onDisconnected = function () {
        self.contactList = {}; // TODO???

        $('#roster-area ul').empty(); // TODO think offline behaviour - what state is kept?
        //$('#chat-area div').remove(); // TODO this would remove profile also
         $('#lnk-profile .roster-contact')
            .removeClass('online')
            .addClass('offline')
            .text('offline');
        $('#login').removeClass('hidden');
        $('#connected').addClass('hidden');
    };

    /** Function: updateContact
     *  Handles Core UPDATE_CONTACT event on behalf of the UI
     *  Updates the entry of the roster identified by jid_id according to the data in Core.contactList
     *
     *  Parameters:
     *   (Object) ev - event object
     *   (String) jid_id - local id of the user, based on his JID
     */
    self.updateContact = function (ev, jid_id) {
        if (Core.contactList[jid_id] === undefined) {
            // removed contact
            $('#roster-'+jid_id).remove();
            $('#chat-'+jid_id).remove();
        } else {
            var rosterElement = $('#roster-' + jid_id);
            if (rosterElement.length === 0) {
                // new contact
                $('#roster-area ul').append($(self.contactTemplate(Core.contactList[jid_id])));
                var rosterLink = $('#roster-' + jid_id + ' a');
                rosterLink.data('jid_id', jid_id);

                // handle pending subscriptions TODO move this outside if? valid on new and on exiting contact?
                if (Core.contactList[jid_id].subscription === Core.subscriptionStatus.INBOUND_REQUEST) {
                    rosterLink.removeClass('offline')
                        .addClass('pending-inbound');
                }
                if (Core.contactList[jid_id].subscription === Core.subscriptionStatus.OUTBOUND_REQUEST) {
                    rosterLink.removeClass('offline')
                        .addClass('pending-outbound');
                }
            } else {
                // existing contact
                var rosterLink2 = rosterElement.children('a');
                rosterLink2.text(Core.contactList[jid_id].name);
                if (Core.contactList[jid_id].subscription === Core.subscriptionStatus.SUBSCRIBED) {
                    rosterLink2.removeClass('pending-inbound')
                        .removeClass('pending-outbound');
                    self.updatePresence(null,jid_id);
                }
            }
        }
    };

    /** Function: updatePresence
     *  Handles Core UPDATE_PRESENCE event on behalf of the UI
     *  Updates the presence information of the entry of the roster identified by jid_id according to the data in Core.contactList
     *
     *  Parameters:
     *   (Object) ev - event object
     *   (String) jid_id - local id of the user, based on his JID
     */
    self.updatePresence = function(ev, jid_id) {
        var contact = $('#roster-area li#roster-' + jid_id + ' .roster-contact')
                .removeClass('online')
                .removeClass('away')
                .removeClass('dnd')
                .removeClass('pending')
                .removeClass('offline');
        
        var mainResource = Core.contactList[jid_id].mainResource;
        if (mainResource === null) {
            contact.addClass('offline');
        } else {
            var show = Core.contactList[jid_id].presence[mainResource].show;
            if (show === '' || show === 'chat') {
                contact.addClass('online');
            } 
            if (show === 'away' || show === 'xa') {
                contact.addClass('away');
            }
            if (show === 'dnd') {
                contact.addClass('dnd');
            }
        }
    };

    /** Function: chatKeypress
     *  Handles UI keypress event on chat inputs
     *  Triggers Core SEND_COMPOSING or SEND_MESSAGE events
     *
     *  Parameters:
     *   (Object) ev - event object
     */
    self.chatKeypress = function (ev) {
        self.logUIEvents(ev,this); // TODO :(
        var jid_id = $(this).parent().data('jid_id');

        if (ev.which === 13) {
            // send message
            ev.preventDefault();
            var body = $(this).val();

            $(document).trigger(Core.events.SEND_MESSAGE, [ jid_id, body ]);

            var myMsg = $(self.chatMessageTemplate({ 
                    'name': Core.me.name,
                    'body': body}));
            $(this).parent().find('.chat-messages').append(myMsg);
            myMsg.find('.chat-name').addClass('me') // <span class='chat-name me'>

            //self.scrollChat(Comms.jidToId(jid)); TODO

            $(this).val('');

            // TODO composing doesn't expire, only on msg send, and it's not part of view, maybe core?
            $(this).parent().data('composing', false);
        } else {
            // send composing
            var composing = $(this).parent().data('composing');
            if (!composing) {
                $(document).trigger(Core.events.COMPOSING_MESSAGE, jid_id);
                $(this).parent().data('composing', true);
            }
        }
    };

    /** Function: messageReceived
     *  Handles Core MESSAGE_RECEIVED event on behalf of the UI
     *  Updates adds the new message to the chat screen identified by jid_id
     *  TODO keep log in Core?
     *
     *  Parameters:
     *   (Object) ev - event object
     *   (String) jid_id - local id of the user, based on his JID
     *   (String) body - text of the received chat message
     */
    self.messageReceived = function (ev, jid_id, body) {
        self.changeChatFocus(jid_id);

        // remove notifications since user is now active
        $('#chat-' + jid_id + ' .chat-event').remove();
        // add the new message
        $('#chat-' + jid_id + ' .chat-messages').append(
            $(self.chatMessageTemplate({ 
                'name': Core.contactList[jid_id].name,
                'body': body}))); 

        self.scrollChat(jid_id);
    };

    /** Function: composingReceived
     *  Handles Core COMPOSING_RECEIVED event on behalf of the UI
     *  Updates adds the composing status to the chat screen identified by jid_id
     *  TODO may be repeated?
     *
     *  Parameters:
     *   (Object) ev - event object
     *   (String) jid_id - local id of the user, based on his JID
     */
    self.composingReceived = function (ev, jid_id) {
        // handle composing chatstate
        $('#chat-' + jid_id + ' .chat-messages').append(
            $(self.chatEventTemplate({
            'name': Core.contactList[jid_id].name})));

        self.scrollChat(jid_id);  
    };

    /** Function: scrollChat
     *  Utility function to scroll chat window
     *
     *  Parameters:
     *   (Object) ev - event object
     *   (String) jid_id - local id of the user, based on his JID
     */
    self.scrollChat = function (jid_id) {
        var div = $('#chat-' + jid_id + ' .chat-messages').get(0);
        div.scrollTop = div.scrollHeight;
    };

    /** Function: connectButton
     *  Function triggered when user presses the 'Login' button
     */
    self.connectButton = function() {
        var jid = $('#login #jid').val();
        var pw = $('#login #password').val();
        // TODO validate format!

        $(document).trigger(Core.events.CONNECT, [ jid, pw, self.boshUrl ] );
        
    };

    /** Function: onConnError
     *  Handles Core CONNECTION_ERROR event on behalf of the UI
     */
    self.onConnError = function() {
        $('#login .error-message').text('Connection error to BOSH endpoint '+Core.boshUrl);
    };

    /** Function: onAuthError
     *  Handles Core AUTHENTICATION_ERROR event on behalf of the UI
     */
    self.onAuthError = function() {
        $('#login .error-message').text('Bad username and password combination');
    };

    /** Function: logUIEvents
     *  Logs monitored UI events in case debug mode is on
     *
     *  Parameters:
     *   (Object) ev - event object
     *   (Array) elem - array that has the event context element in the first position
     */
    self.logUIEvents = function(ev,elem) {
        if (Core.debug)
            console.log('%c'+ev.type+' in '+$(elem)[0].outerHTML, 'color: purple');
    };

    self.updateProfile = function(ev) {
        var profileDiv = $('#connected .user-info');

        // full name
        if (Core.me.fn !== undefined)
            profileDiv.find('.full-name input').val(Core.me.fn);
        else
            profileDiv.find('.full-name input').val('');

        // nickname
        if (Core.me.fn !== undefined)
            profileDiv.find('.nickname input').val(Core.me.nickname);
        else
            profileDiv.find('.nickname input').val('');
        
        // image
        if (Core.me.image !== undefined)
            profileDiv.find('.contact-image').attr('src', Core.me.image);
        else
            profileDiv.find('.contact-image').attr('src', self.defaultImageSrc);

        // roster name
        $('#lnk-profile a').text(Core.me.name);
    };

    self.setVcardInfo = function() {
        var profile = $('#connected .user-info');
        $(document).trigger(Core.events.SET_PROFILE, [ 
            profile.find('.full-name input').val(),
            profile.find('.nickname input').val(),
            ]);
    };

    /** Function: init
     *  Initialize View: compile Handlebars templates and register to Core and UI events
     */
    self.init = function() {
        // listen to Core events
        $(document).on(Core.events.CONNECTED, self.onConnected);
        $(document).on(Core.events.DISCONNECTED, self.onDisconnected);
        $(document).on(Core.events.CONNECTION_ERROR, self.onConnError);
        $(document).on(Core.events.AUTHENTICATION_ERROR, self.onAuthError);
        $(document).on(Core.events.UPDATE_PROFILE, self.updateProfile);
        $(document).on(Core.events.UPDATE_CONTACT, self.updateContact);
        $(document).on(Core.events.UPDATE_CONTACT_INFO, self.updateUserInfo);
        $(document).on(Core.events.MESSAGE_RECEIVED, self.messageReceived);
        $(document).on(Core.events.COMPOSING_RECEIVED, self.composingReceived);
        $(document).on(Core.events.UPDATE_PRESENCE, self.updatePresence);

        // listen to UI events
        $('#roster-area ul').on('click', 'li a', function(ev){
            self.logUIEvents(ev,this);
            self.changeChatFocus($(this).data('jid_id'));
        });
        $('#chat-area').on('keypress','div input.chat-input', self.chatKeypress);
        $('#chat-area').on('click','.accept-subscription', function(ev){
            self.logUIEvents(ev,this);
            self.acceptPendingContact($(this).parent().parent().parent().parent().data('jid_id')); // a > p > div.inbound > div.user-info > div#chat-*
        });
        $('#chat-area').on('click','.reject-subscription', function(ev){
            self.logUIEvents(ev,this);
            self.rejectPendingContact($(this).parent().parent().parent().parent().data('jid_id'));
        });
        $('#lnk-profile').on('click','a', function(ev){
            self.logUIEvents(ev,this);
            self.changeChatFocus();
        });
        $('#login').on('click','a', function(ev){
            self.logUIEvents(ev,this);
            self.connectButton();
        });
        $('#connected').on('click','a', function(ev){
            self.logUIEvents(ev,this);
            console.log($(this));
            var linkId = $(this)[0].id;
            if (linkId === 'logout')
                $(document).trigger(Core.events.DISCONNECT);
            if (linkId === 'update-vcard')
                self.setVcardInfo();
        });

        // Handlebars templates compilation
        var templateSrc = $('#chat-template').html();
        self.chatTemplate = Handlebars.compile(templateSrc);
        templateSrc = $('#contact-template').html();
        self.contactTemplate = Handlebars.compile(templateSrc);
        templateSrc = $('#chat-message-template').html();
        self.chatMessageTemplate = Handlebars.compile(templateSrc);
        templateSrc = $('#chat-event-template').html();
        self.chatEventTemplate = Handlebars.compile(templateSrc);
        templateSrc = $('#inbound-subscription-template').html();
        self.inboundTemplate = Handlebars.compile(templateSrc);
    };

    return self;
}(View || {}, Core, jQuery, Handlebars));