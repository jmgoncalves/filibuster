/** File: core.js
 * Core
 *
 * Authors:
 *   - jmgoncalves
 *
 * Copyright:
 *   (c) 2014 jmgoncalves All rights reserved.
 */
'use strict';

/** Class: Core
 * Filibuster Core class
 * Defines the data model and used events
 *
 * Parameters:
 *   (Core) self - itself
 *   (jQuery) $ - jQuery
 */
var Core = (function(self, $) {
    /** Variable: boshUrl
     *  The HTTP URL with the BOSH endoint
     */
    self.boshUrl = undefined;

    /** Variable: me
     *  Contact information of the local client
     *
     *  Contains:
     *   (String) jid - bare JID used to log in
     *   (String) name - name set in vCard-temp
     *   (String) resource - local resource
     *   (Array) otherResources - Full JIDs of other resources logged in with this bare JID
     */
    self.me = {
        jid: null,
        name: null,
        fn: undefined,
        nickname: undefined,
        image: undefined,
        resource: null,
        otherResources: []
    };

    /** Variable: contactList
     *  Map of contact objects that are displayed in the roster-area
     *
     *  Contains 0 or more 'Contact' Objects identified by a String which is the local id of the contact, given by self.jidToId
     *  Each 'Contact' Object contains:
     *   (String) jid - JID of the contact
     *   (String) name - name of the contact (from vCard-temp?)
     *   (Object) vcard - Object containing vcard information, e.g. { fn: 'Juliet Capulet', nickname: 'Julie', image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAA' }
     *   (Object) presence - Object containing 'Presence' Objects identified by resource, e.g. { balcony: { fullJid: 'juliet@example.com/balcony', show: 'dnd', status: 'busy!' } }
     *   (String) mainResource - resource to which messages will be routed
     *   (Number) subscription - subscription status of the contact, as defined by self.subscriptionStatus
     *   (String) jid_id - the local id, for convenience
     */
    self.contactList = {};

    /** Variable: subscriptionStatus
     *  Object holding the constants that define the subscription status
     *  
     *  Contains the following statuses:
     *   (Number) OUTBOUND_REQUEST - 
     *   (Number) INBOUND_REQUEST - 
     *   (Number) SUBSCRIBED - 
     *   (Number) REMOVE - 
     */
    self.subscriptionStatus = {
        OUTBOUND_REQUEST: 0,
        INBOUND_REQUEST: 1,
        SUBSCRIBED: 2,
        REMOVE: 3
    };

    /** Variable: events
     *  Object holding the constants that define the event names used within Filibuster
     *  
     *  Contains the following events:
     *   (String) CONNECT - triggered when the user clicks the "Login" button
     *   (String) CONNECTED - triggered when a connection and authentication to the XMPP server is successfully completed
     *   (String) CONNECTION_ERROR - triggered when a connection to the XMPP server is unsuccessful
     *   (String) AUTHENTICATION_ERROR - triggered when an authentication attempt with the XMPP server is unsuccessful
     *   (String) DISCONNECT - triggered when the user clicks the "Logout" button
     *   (String) DISCONNECTED - triggered when an established connection to the XMPP server is terminated
     *   (String) UPDATE_CONTACT - triggered when a contact information update is received from the XMPP server
     *   (String) UPDATE_CONTACT - triggered when a contact vcard is received from the XMPP server
     *   (String) UPDATE_PRESENCE - triggered when a presence information update is received from the XMPP server
     *   (String) SEND_MESSAGE - triggered when the user hits "enter" on the chat input, in order to send the composed message
     *   (String) COMPOSING_MESSAGE - triggered when the user types on the chat input, composing a message
     *   (String) MESSAGE_RECEIVED - triggered when a chat message sent by a contact is received from the XMPP server
     *   (String) COMPOSING_RECEIVED - triggered when a composing event message sent by a contact is received from the XMPP server
     *   (String) ACCEPT_PENDING - triggered when the user clicks the "Accept" button on an incoming presence subscription request div
     *   (String) REJECT_PENDING - triggered when the user clicks the "Reject" button on an incoming presence subscription request div
     */
    self.events = {
        CONNECT: 'Filibuster:CONNECT',
        CONNECTED: 'Filibuster:CONNECTED',
        CONNECTION_ERROR: 'Filibuster:CONNECTION_ERROR',
        AUTHENTICATION_ERROR: 'Filibuster:AUTHENTICATION_ERROR',
        DISCONNECT: 'Filibuster:DISCONNECT',
        DISCONNECTED: 'Filibuster:DISCONNECTED',
        UPDATE_PROFILE: 'Filibuster:UPDATE_PROFILE',
        SET_PROFILE: 'Filibuster:SET_PROFILE',
        UPDATE_CONTACT: 'Filibuster:UPDATE_CONTACT',
        UPDATE_CONTACT_INFO: 'Filibuster:UPDATE_CONTACT_INFO',
        UPDATE_PRESENCE: 'Filibuster:UPDATE_PRESENCE',
        SEND_MESSAGE: 'Filibuster:SEND_MESSAGE',
        COMPOSING_MESSAGE: 'Filibuster:COMPOSING_MESSAGE',
        MESSAGE_RECEIVED: 'Filibuster:MESSAGE_RECEIVED',
        COMPOSING_RECEIVED: 'Filibuster:COMPOSING_RECEIVED',
        ACCEPT_PENDING: 'Filibuster:ACCEPT_PENDING',
        REJECT_PENDING: 'Filibuster:REJECT_PENDING'
    };

    /** Function: updateContact
     *  Updates contactList
     *
     *  Parameters:
     *   (String) jid_id - local id of the user, based on his JID
     *   (String) jid - the JID of the user
     *   (String) name - the name of the user
     *   (Number) subscription - the type of subscription that connects the remote user to the local user, as defined in self.subscriptionStatus
     */
    self.updateContact = function (jid_id, jid, name, subscription) {
        // TODO verify subscription is a valid code

        if (subscription === self.subscriptionStatus.REMOVE) {
            // removed contact
            self.contactList[jid_id] = undefined;
        } else {
            if (self.contactList[jid_id] === undefined) {
                // new contact
                self.contactList[jid_id] = {
                    jid: jid,
                    name: name,
                    vcard: {
                        fn: '-',
                        nickname: '-',
                        image: null
                    },
                    presence: {},
                    mainResource: null,
                    subscription: subscription,
                    jid_id: jid_id
                };
            } else {
                // existing contact
                self.contactList[jid_id].name = name;
                self.contactList[jid_id].subscription = subscription;
            }
        }
        $(document).trigger(Core.events.UPDATE_CONTACT, jid_id);
    };

    /** Function: updateVcard
     *  Updates the vCard of a contact
     *
     *  Parameters:
     *   (String) jid_id - local id of the user, based on his JID
     *   (String) fn - 
     *   (String) nickname - 
     *   (Number) image - 
     */
    self.updateVcard = function (jid_id, fn, nickname, image) {
        // TODO validate parameters?
        
        if (jid_id === null) {
            self.me.fn = fn;
            self.me.nickname = nickname;
            self.me.image = image;

            // update name
            if (fn !== undefined)
                self.me.name = fn;
            if (nickname !== undefined)
                self.me.name = nickname;

            $(document).trigger(Core.events.UPDATE_PROFILE);
        } else {
            self.contactList[jid_id].vcard.fn = fn;
            self.contactList[jid_id].vcard.nickname = nickname;
            self.contactList[jid_id].vcard.image = image;

            // update name
            if (fn !== undefined)
                self.contactList[jid_id].name = fn;
            if (nickname !== undefined)
                self.contactList[jid_id].name = nickname;

            $(document).trigger(Core.events.UPDATE_CONTACT_INFO, jid_id);

            if (fn !== undefined || nickname !== undefined)
                $(document).trigger(Core.events.UPDATE_CONTACT, jid_id);
        }
    };

    /** Function: updatePresence
     *  Updates the contactList presence field
     *
     *  Parameters:
     *   (String) jid_id - local id of the user, based on his JID
     *   (String) fullJid - the full JID to which the presence update refers to
     *   (String) resource - the resource to which the presence update refers to
     *   (String) show - the presence status specification (e.g. 'dnd', 'away', ...) as defined @ http://tools.ietf.org/html/rfc6121#section-4.7.2.1
     *   (String) status - the presence status message (free text)
     */
    self.updatePresence = function(jid_id, fullJid, resource, show, status) {
        if (self.contactList[jid_id].presence[resource] === undefined) {
            self.contactList[jid_id].presence[resource] = {
                'fullJid': fullJid,
                'show': show,
                'status': status
            };
        } else {
            self.contactList[jid_id].presence[resource].show = show;
            self.contactList[jid_id].presence[resource].status = status;
        }
        self.contactList[jid_id].mainResource = resource; // TODO naive determination of main resource 

        $(document).trigger(Core.events.UPDATE_PRESENCE, jid_id);
    };

    /** Function: presenceUnavailable
     *  Removes the presence information referring to a specific resource from the contactList (it probably went offline)
     *
     *  Parameters:
     *   (String) jid_id - local id of the user, based on his JID
     *   (String) resource - the resource to which the presence removal refers to
     */
    self.presenceUnavailable = function(jid_id, resource) {
        self.contactList[jid_id].presence[resource] = undefined;
        if (self.contactList[jid_id].mainResource === resource) {
            self.contactList[jid_id].mainResource = null; // TODO assign other main resource?
            $(document).trigger(Core.events.UPDATE_PRESENCE, jid_id);
        }
    };

	return self;
}(Core || {}, jQuery));
