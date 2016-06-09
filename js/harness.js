Harness = function() {

    var SESSIONS_JSON_FILE = 'session_config.json';
    var PROXY_CONTROL_URL = 'http://127.0.0.1:8080/proxy/8008/limit';
    var player = null;
    var configs = null;
    var nextConfigIndex = 0;
    var sessionTimeout = NaN;
    var metrics = null;
    var networkModulator = null;
    var currentSessionInfo = null;

    function init() {

        player = dashjs.MediaPlayer().create();
        player.initialize(document.getElementById('video'), null, true);
        player.on(dashjs.MediaPlayer.events.PLAYBACK_STARTED, onPlaybackStarted);
        player.on(dashjs.MediaPlayer.events.PLAYBACK_ENDED, onPlaybackEnded);
        player.on(dashjs.MediaPlayer.events.PLAYBACK_ERROR, onError);
        player.on(dashjs.MediaPlayer.events.ERROR, onError);
        player.on(dashjs.MediaPlayer.events.BUFFER_LEVEL_STATE_CHANGED, onBufferStateChange);
        player.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_START, onQualityChanged);

        metrics = new Metrics();
        networkModulator = new NetworkModulator();
        loadSessionConfig();
    }

    function next() {
        stopSessionTimeout();

        var config = getNextSessionConfig();
        if (config) {

            currentSessionInfo = new SessionInfo();
            currentSessionInfo.time = performance.now();
            currentSessionInfo.wallclockTime = Date.now();
            currentSessionInfo.mpd = config.url;
            currentSessionInfo.id = getGUID();
            currentSessionInfo.abr = config.abr;
            currentSessionInfo.fastSwitch = config.fastSwitch;
            currentSessionInfo.profile = config.profile;

            player.enableBufferOccupancyABR(config.abr === 'bola');
            player.setFastSwitchEnabled(config.fastSwitch);

            metrics.createSession(currentSessionInfo);

            networkModulator.loadProfile(config.profile, function() {
                player.attachSource(config.url);
            });

            startSessionTimeout(config.test_duration);
        }
    }

    function getNextSessionConfig() {

        if (nextConfigIndex === configs.length) {
            nextConfigIndex = 0;
        }

        var config = configs[nextConfigIndex];
        ++nextConfigIndex;
        return config;
    }

    function startSessionTimeout(delay) {
        stopSessionTimeout();
        sessionTimeout = setTimeout(function () {
            sessionTimeout = null;
            singleEnded("ended:timeout")
        }, delay * 1000);
    }

    function stopSessionTimeout() {
        if (sessionTimeout) {
            clearTimeout(sessionTimeout);
        }
        sessionTimeout = null;
    }

    ////////////////////////////////////////////////
    /// EVENTS & METRICS
    ////////////////////////////////////////////////

    function onBufferStateChange(e) {
        if (e.mediaType === 'video') {
            var metricSet = new MetricSet();
            metricSet.eventType = e.state;
            captureMetricSet(metricSet);
        }
    }

    function onQualityChanged(e) {
        if (e.mediaType === 'video') {
            var metricSet = new MetricSet();
            metricSet.eventType = e.type;
            metricSet.lastQualityLoaded = e.oldQuality;
            metricSet.nextQualityLoading = e.newQuality;
            metricSet.isUpShiftInQuality = e.oldQuality < e.newQuality;
            metricSet.bandwidth = "we need bandwidth from event please";
            captureMetricSet(metricSet);
        }
    }

    function onPlaybackEnded(e) {
        singleEnded(e.type)
    }

    function singleEnded(type) {
        var metricSet = new MetricSet();
        metricSet.eventType = type;
        captureMetricSet(metricSet);
        next();
    }

    function onPlaybackStarted(e) {
        var metricSet = new MetricSet();
        metricSet.eventType = e.type;
        captureMetricSet(metricSet);
    }

    function onError(e) {
        var metricSet = new Metrics();
        metricSet.eventType = e.type;
        //Need more error info here.
        captureMetricSet(metricSet);
        player.reset();
        next();
    }

    function captureMetricSet(metricSet) {
        metricSet.eventTime = performance.now();
        metricSet.wallclockTime = Date.now();
        metricSet.sessionInfo = currentSessionInfo;
        metricSet.bufferLevel = player.getBufferLength();
        metricSet.playheadTime = player.time();
        metricSet.lastQualityLoaded = isNaN(metricSet.lastQualityLoaded) ? player.getQualityFor('video') : metricSet.lastQualityLoaded;
        metrics.push(currentSessionInfo.id, metricSet);
    }

    ////////////////////////////////////////////////
    /// UTILS
    ////////////////////////////////////////////////

    function loadSessionConfig() {
        var xhr = new XMLHttpRequest();
        xhr.overrideMimeType("application/json");
        xhr.open('GET', SESSIONS_JSON_FILE);
        xhr.onloadend = function() {
            // TODO: check for errors
            if (xhr.status >= 200 && xhr.status <= 299) {
                configs = JSON.parse(xhr.responseText).configs;
                next();
            }
        };
        xhr.send();
    }

    function getGUID() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }

    return {
        init: init
    }


}

Harness.prototype = {
    constructor: Harness
}


