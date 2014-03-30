/** File: filibuster.js
 * Filibuster
 *
 * Authors:
 *   - jmgoncalves
 *
 * Copyright:
 *   (c) 2014 jmgoncalves All rights reserved.
 */
'use strict';

/** Class: Filibuster
 * Filibuster base class
 *
 * Parameters:
 *   (Filibuster) self - itself
 *   (Core) Core - Filibuster core component, holding the application data model and event names
 *   (Comms) Comms - Filibuster communications component, handling XMPP events and interfacing with Strophe
 *   (Core) View - Filibuster view component, handling UI events and controlling the DOM
 */
var Filibuster = (function(self, Core, Comms, View) {

	/** Object: about
     *  About Filibuster
	 *
	 *  Contains:
	 *   (String) name - Filibuster
	 *   (Float) version - Filibuster version
	 */
	self.about = {
		name: 'Filibuster',
		version: '0.0.1'
	};

	/** Function: init
	 *  Configure parameters and initialize components
	 *
	 *  Parameters:
	 *   (Object) configuration of Filibuster, which contains:
     *     (String) url - URL to the BOSH binding
     *     (Boolean) debug - boolean indicating whether debug mode is enabled (if true prints XMPP and UI events to the console)
	 */
	self.init = function(config) {
        // Validate parameters
        // TODO url

        // Configure parameters
		Core.boshUrl = config.url;
		Core.debug = Boolean(config.debug);

        // Initialize components
        View.init();
        Comms.init();
	};

	return self;
}(Filibuster || {}, Core, Comms, View));
