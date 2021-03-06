MetricsCollectionService = function() {

    $.couch.urlPrefix = '<URL TO YOUR COUCH DB>';

    var DB_DEV = "dashabr_test_results_dev";
    var DB_PROD = "dashabr_test_results";
    var DB_NAME = DB_DEV;

    var document = null;

    function initialize() {1
        document = new MetricSessionDocument();
    }

    function addToDocument(key, value) {
        document[key] = value;
    }

    function saveDocumentToDB() {
        $.couch.db(DB_NAME).saveDoc(document, {
            success: function(data) {
                console.log(data);
            },
            error: function(status) {
                console.log(status);
            }
        });
    }

    return {
        initialize: initialize,
        addToDocument: addToDocument,
        saveDocumentToDB: saveDocumentToDB
    }

}


MetricsCollectionService.prototype = {
    constructor: MetricsCollectionService
}
