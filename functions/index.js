const functions = require('firebase-functions');
const admin = require('firebase-admin');

const GeoFire = require('geofire');

admin.initializeApp(functions.config().firebase);

exports.initializeUser = functions.auth.user().onCreate(event => {
    const user = event.data;
    const userId = user.uid;

    const database = admin.database();

    // Initialize user.
    database.ref('users/' + userId).set({
        reports: {
            // Asset == false means the report has NOT been approved.
            // All users start with a forever-unapproved '0000000' so that the assets subsection is actually generated.
            '00000000': false
        }
    });
});

exports.approveReport = functions.database.ref('unapproved_reports/{reportId}').onWrite(event => {
    const reportId = event.params.reportId;

    const report = event.data.val();

    console.log('report: ' + report.toString());

    const userId = report.uid;
    const body = report.body;
    const title = report.title;
    const timestamp = report.timestamp;
    const locationLabel = report.locationLabel;
    const latitude = report.locationLat; // todo create location { lat, long, name format}
    const longitude = report.locationLong;

    const db = admin.firestore();
    const database = admin.database();

    let updates = {};
    updates['/users/' + userId + '/reports/' + reportId + '/'] = true;

    database.ref().update(updates).then(() => {
        console.log('set valid ' + ' for ' + reportId + ' of ' + userId + ' to false.')
    }).catch((error) => {
        console.log('WARNING: failed to update report list for user: ' + error);
    });

    const reportsRef = db.collection("reports");

    let hasBody = (body != null && body != '');

    let document = reportsRef.doc(reportId).set({
        uid: userId,
        body: body,
        hasbody: hasBody,
        title: title,
        timestamp: timestamp,
        location: locationLabel
    });

    // Initialize user.
    // database.ref('approved_reports/' + reportId).set();

    const geoFire = new GeoFire(admin.database().ref('/report_locations/'));

    let location = [latitude, longitude];

    geoFire.set(reportId, location).then(() => {
        console.log('set ' + location + ' for ' + reportId);
    }).catch((error) => {
        console.log('ERROR: ' + error);
    });
});