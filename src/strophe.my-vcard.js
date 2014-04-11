
function VCard() {}

// TODO prototype functions have unscoped jQuery! is it ok?
// TODO is it ok to depend on jQuery??

VCard.prototype.toXML = function() {
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

VCard.prototype.fromXML = function(stanza) {
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

Strophe.addConnectionPlugin('vcard', {
  _connection: null,
  
  init: function(conn) {
    this._connection = conn;
    return Strophe.addNamespace('VCARD', 'vcard-temp');
  },

  get: function(jid, callback) {
    var iq = $iq({
      to: jid,
      type: "get"
    });
    iq.c("vCard", {
      xmlns: Strophe.NS.VCARD
    });

    return this._connection.sendIQ(iq, function(stanza){
        var vc = new VCard();
        vc.fromXML(stanza);
        callback(vc);
    },  function(){
        callback(null);
    });
  },

  set: function(vCard, callback) {
    var iq = $iq({
      type: "set"
    });
    iq.cnode(vCard.toXML());
    this._connection.sendIQ(iq, function(){
        callback(true);
    },  function(){
        callback(false);
    });
  }
});

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
