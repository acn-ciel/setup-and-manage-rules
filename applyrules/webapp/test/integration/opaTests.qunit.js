/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require(["applyrules/test/integration/AllJourneys"
], function () {
	QUnit.start();
});
