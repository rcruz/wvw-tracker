var ScoresView = require("./views/scores"),
    TimeLeftView = require("./views/timeleft"),
    ResetView = require("./views/reset"),
    ScoresModel = require("./models/scores");

function onDocumentReady() {
    var worldName = localStorage && localStorage.worldName || prompt("Server name?"),
        scoresModel = new ScoresModel({
            worldName: worldName
        });

    localStorage.worldName = worldName;

    window.views = {};

    window.views.scores = new ScoresView({
        model: scoresModel,
        el: $("#scores")
    });

    window.views.timeleft = new TimeLeftView({
        model: scoresModel,
        el: $("#timeleft")
    });

    window.views.reset = new ResetView({
        el: $("#reset")
    });
}

// init
$(document).ready(onDocumentReady);
