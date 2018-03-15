# shOUT Backend
## The definitive development guide.

### Components

The shOUT backend utilizes two “databases” because each provides vital functionalities that the other lacks.

[Realtime Database](#realtime-database) This is the Firebase database solution that developers have traditionally utilized in the past. We use it for two primary needs. It is used in conjunction with Geofire to provide location queries (allowing us to look up reports by location/radius) and it is used for clients (Android/iOS) to push “unapproved reports” to. See [Unapproved Reports](#unapproved-reports) for detailed information.

[Firestore](#firestore) This is the next generation Firebase database solution and the successor to Firebase Realtime Database. We utilize Firestore to store “approved reports” (reports that have received moderation and should be seen by any app user). It is used because it provides advanced filtering and query systems that allow us to quickly and efficiently retrieve the most recent reports and the most recent reports that have bodies (making them stories).

### Realtime Database

The realtime database is used for two primary purposes: unapproved reports and report locations.

#### Unapproved Reports

Unapproved reports are reports that are pushed to the backend but have received no moderator approval (NOTE: In the development stages of shOUT all reports with valid details are accepted by an "auto moderator" function).

Unapproved reports are found under the root child `unapproved_reports`. An unaproved report has the following structure:

```
(unique report id): {
    "title": “The Title.”

    "locationLabel": “123 Example Street”
    
    "locationLat": “14.1”
    
    "locationLong": “15.6”
    
    "timestamp": “12042840524”
    
    "uid": “oaihrgiuarbgaiuh3”
    
    "body": “The Body...”
}
```

Below is a description of each key, its value, and the value requirements.

| Key         | Type        | Value       |
| ----------- | ----------- | ----------- |
|title | string | This is the title of the report. It is mandatory and limited to 140 characters.|
|locationLabel | string | This should be the address name or the lat/lng fallback of the location. This string will always be displayed with the report.|
|locationLat| decimal | This is the latitude of the report.”
|locationLong| decimal | This is the longitude of the report.”
|timestamp| long | This is a timestamp of the report. The format is milliseconds from the Epoch and the data type is a long (or equivalent). The backend will currently reject any report older than 2016.”
|uid | string | This is the unique id of the user who generates the report. Get this from your firebase authentication API. See [uid](uid)”
|body | string | This is the body/details of the report. This is optional and not restricted by length”

Unapproved reports can be created by any client but can only be read and modified after creation by the backend.

#### Report Locations

We also utilize the Realtime Database to store report locations. This is done with the [Geofire API](https://github.com/firebase/geoFire). Report locations can be found under the root child `report_locations`. These should only be accessed be a Geofire API. Each report location follows the format...

```
"unique report id": {
    *geofire internals*
}
```

You can read more about the unique report id (here)[#unique-report-ids].

To query for report locations I recommend basing your implementation on this Java example of a Geofire query: 

```
DatabaseReference ref = FirebaseDatabase.getInstance().getReference("report_locations");

double radius = //current map radius + ~1km is a good idea;
GeoFire geoFire = new GeoFire(ref);
geoQuery = geoFire.queryAtLocation(new GeoLocation(center.latitude, center.longitude), radius);
    
geoQuery.addGeoQueryEventListener(() -> {
    @Override
    public void onKeyEntered(String key, GeoLocation location) {
        // add pin
    }

    @Override
    public void onCancelled(DatabaseError databaseError) {
        Log.d("ERROR", "Database Error");
            }
        });
    }

    @Override
    public void onKeyExited(String key) {
       // remove pin
    }

    @Override
    public void onKeyMoved(String key, GeoLocation location) {
        // move pin to new location
        // not currently used by our database
    }

    @Override
    public void onGeoQueryReady() {
        // used to signall end of loading process
        // (in case you want to show a spinning loader of some sort)
    }

    @Override
    public void onGeoQueryError(DatabaseError error) {
        // handle any errors
    }
};
```
NOTE: You should never attempt to query the entire database at once. Always calculate the visible map radius with padding and then update the query as needed.

#### Unique Report IDs

To generate a unique report simply push empty data to the Realtime Database root child `unapproved_reports` and it will return a new, unique key.

This is the Java API code.

```
String reportId = FirebaseDatabase.getInstance().getReference("unapproved_reports").push().getKey();
                  
```

We use a unique key from the `unapproved reports` database as no report should ***ever*** be deleted from here and thus it is the safest database to ensure every report id is unique. *NOTE: This solution may be altered in the future.*

### Firestore

The Firestore is used for approved reports and resources storage (resources currently reside in the Realtime Database but are being relocated).

#### Approved Reports

An approved reports is always stored under the collection `reports` with the document id identical to its [unique report id](#unique-report-ids) from the Realtime Database. This is done to easy the translation between the Realtime Databse and Firestore (specifically for geoqueries).

Each report follows this structure:

```
"title": “The Title.”
"timestamp": “12042840524”
"location": "123 Example St"    
"uid": “oaihrgiuarbgaiuh3” 
"hasbody": true   
"body": “The Body...”
```

A summary of each key and value is available below.

| Key         | Type        | Value       |
| ----------- | ----------- | ----------- |
|title | string |This is the title of the report. It is mandatory and limited to 140 characters.|
|location | string | This should be the address name or the lat/lng fallback of the location. This string will always be displayed with the report.|
|timestamp| long | This is a timestamp of the report. The format is milliseconds from the Epoch and the data type is a long (or equivalent). The backend will currently reject any report older than 2016.”
|uid | string | This is the unique id of the user who generates the report. *NOTE: This field is not accessible to clients for security and privacy reasons.*”
|hasbody | boolean | This is a simple boolean flag for indexing. It indicates if the body of the report is empty.
|body | string |  This is the body/details of the report. This is optional and not restricted by length”

#### Resources

Resources are stored in the Firestore in the collection `resources` with arbitrary document ids corresponding *somewhat* to the resource's name (*NOTE: The keys should not be used as titles however*). An example may be the Women's Center with the key `womens-center`.

Every resource follows this structure:

```
position: 0
name: “The Title.”
url: “12042840524”
address: "123 Example St"    
description: “oaihrgiuarbgaiuh3”
phones: ...    
```

With the subcollection `phones` having arbitrarily named documents following this structure:

```
number: "+1 123-456-7890"
label: "Hotline"
description: "This is a hotline."
"emergency": false
```

A summary of each key, its value, its optionality, and its type for `resources` is available below.

| Key         | Type        | Is Optional | Value       |
| ----------- | ----------- | ----------- | ----------- |
|position | integer | no | This determines where the resource is placed in the resource list. If two resources have the same position they are sorted by key alphabetically (ignoring case) |
|name | string | no | The name of the resource as it should appear in the resource preview and title.|
|url| string | yes | The resource's website. *NOTE: Ensure this is correctly formatted with https://, www., etc. as some phones will not correct your errors.*”
|address | string | yes | The address to provide to the native mapping application.”
|description | string | no | A short, informative description of what the resource is an how it can help the user.
|phones | collection | yes | A collection of phone numbers for this resource.”

... and the `phones` format...

| Key         | Type        | Is Optional | Value       |
| ----------- | ----------- | ----------- | ----------- |
|number | integer | no | The phone number for the resource. *NOTE: This must be a properly formatted number. Consider including the country code too.* |
|label | string | yes | The name of the phone number to display in the UI (this must be fairly short, something like "Hotline" or "Counseling" is the best) |
|description| string | yes | This is a description of what the phone number is for. This is really only currently shown/used when the number is listed as an emergency number. This will then be shown in a popup informing the user they are calling an emergency number and providing this description.
|emergency | boolean | no | Whether or not this number is for emergencies (most resources will list this on their websites)

TODO: Investigate storing resource/phone availability hours.