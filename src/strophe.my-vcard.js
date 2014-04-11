/** File: strophe.my-vcard.js
 * vCard plugin for Strophe with full vCard parsing
 * Beware: depends on jQuery
 *
 * Authors:
 *   - jmgoncalves
 *
 * Copyright:
 *   (c) 2014 jmgoncalves All rights reserved.
 */
'use strict';

/** Class: MyVCardPlugin
 *  My Strophe vCard Plugin
 *
 *  Parameters:
 *   (Comms) self - itself
 *   (Strophe) Strophe - Strophe.js XMPP library (http://strophe.im/)
 *   (jQuery) $ - jQuery
 */
var MyVCardPlugin = (function(self, Strophe, $) {

    /** Variable: _connection
     *  Strophe connection
     */
    var _connection = null;

    /** Class: VCard
     *  Holds vCard data
     */
    self.VCard = function(){};

    /** Function: VCard.toXML
     *  Transforms VCard Class data into vCard XML
     */
    self.VCard.prototype.toXML = function() {
        var str = '<vCard xmlns="vcard-temp">';
        if (this.fn !== undefined)
          str += '<FN>'+this.fn+'</FN>';
        if (this.nickname !== undefined)
          str += '<NICKNAME>'+this.nickname+'</NICKNAME>';
        if (this.image !== undefined) {
          // TODO split
          str += '<PHOTO><TYPE>image/png</TYPE><BINVAL></BINVAL></PHOTO>';
        }
        str += '</vCard>';
        return ($.parseXML(str)).documentElement; 
    };

    /** Function: VCard.fromXML
     *  Updates a VCard Class data from vCard XML
     *
     *  Parameters:
     *    (XMPP Stanza) stanza - an XMPP stanza containing a vCard
     */
    self.VCard.prototype.fromXML = function(stanza) {
        var vCard = $(stanza).find("vCard");

        // full name
        var fn = vCard.find('FN');
        console.log(fn);
        if (fn.length === 1)
            this.fn = fn.text();
        
        // nickname
        var nickname = vCard.find('NICKNAME');
        if (nickname.length === 1)
            this.nickname = nickname.text();

        // image
        var image = vCard.find('BINVAL');
        if (image.length === 1)
            this.image = 'data:'+vCard.find('TYPE').text()+';base64,'+image.text();
    };

    /** Function: get
     *  Get a user vCard from the server
     *
     *  Parameters:
     *    (String) jid - JID
     *    (Function) callback - the funcion to callback with the result
     */
    self.get = function(jid, callback) {
        var iq = $iq({
            to: jid,
            type: "get"
        });
        iq.c("vCard", {
            xmlns: Strophe.NS.VCARD
        });

        return self._connection.sendIQ(iq, function(stanza){
            var vc = new self.VCard();
            vc.fromXML(stanza);
            callback(vc);
        },  function(){
            callback(null);
        });
    }

    /** Function: set
     *  Update this user's vCard
     *
     *  Parameters:
     *    (Object) vCard - a VCard object holding the user's updated vCard info
     *    (Function) callback - the funcion to callback with the result
     */
    self.set = function(vCard, callback) {
        var iq = $iq({
            type: "set"
        });
        iq.cnode(vCard.toXML());
        self._connection.sendIQ(iq, function(){
            callback(true);
        },  function(){
            callback(false);
        });
    }

    /** Function: init
     *  Register MyVCardPlugin in Strophe
     */
    self.init = function() {
        Strophe.addConnectionPlugin('vcard', {
            
            init: function(conn) {
              self._connection = conn;
              return Strophe.addNamespace('VCARD', 'vcard-temp');
            },

            get: self.get,
            set: self.set,
            VCard: self.VCard
        });
    }

  return self;
  
}(MyVCardPlugin || {}, Strophe, jQuery));

MyVCardPlugin.init();

// <vCard xmlns='vcard-temp'>
//   <FN>Peter Saint-Andre</FN>
//   <N>
//     <FAMILY>Saint-Andre</FAMILY>
//     <GIVEN>Peter</GIVEN>
//     <MIDDLE/>
//   </N>
//   <NICKNAME>stpeter</NICKNAME>
//   <URL>http://www.xmpp.org/xsf/people/stpeter.shtml</URL>
//   <BDAY>1966-08-06</BDAY>
//   <ORG>
//     <ORGNAME>XMPP Standards Foundation</ORGNAME>
//     <ORGUNIT/>
//   </ORG>
//   <TITLE>Executive Director</TITLE>
//   <ROLE>Patron Saint</ROLE>
//   <TEL><WORK/><VOICE/><NUMBER>303-308-3282</NUMBER></TEL>
//   <TEL><WORK/><FAX/><NUMBER/></TEL>
//   <TEL><WORK/><MSG/><NUMBER/></TEL>
//   <ADR>
//     <WORK/>
//     <EXTADD>Suite 600</EXTADD>
//     <STREET>1899 Wynkoop Street</STREET>
//     <LOCALITY>Denver</LOCALITY>
//     <REGION>CO</REGION>
//     <PCODE>80202</PCODE>
//     <CTRY>USA</CTRY>
//   </ADR>
//   <TEL><HOME/><VOICE/><NUMBER>303-555-1212</NUMBER></TEL>
//   <TEL><HOME/><FAX/><NUMBER/></TEL>
//   <TEL><HOME/><MSG/><NUMBER/></TEL>
//   <ADR>
//     <HOME/>
//     <EXTADD/>
//     <STREET/>
//     <LOCALITY>Denver</LOCALITY>
//     <REGION>CO</REGION>
//     <PCODE>80209</PCODE>
//     <CTRY>USA</CTRY>
//   </ADR>
//   <EMAIL><INTERNET/><PREF/><USERID>stpeter@jabber.org</USERID></EMAIL>
//   <JABBERID>stpeter@jabber.org</JABBERID>
//   <DESC>
//     More information about me is located on my 
//     personal website: http://www.saint-andre.com/
//   </DESC>
// </vCard>
