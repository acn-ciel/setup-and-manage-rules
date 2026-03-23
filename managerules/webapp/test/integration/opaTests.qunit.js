/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require(["managerules/test/integration/AllJourneys"
], function () {
	QUnit.start();
});
