var ScoresView = require("./views/scores"),
    TimeLeftView = require("./views/timeleft"),
    ScoresModel = require("./models/scores");

function onDocumentReady() {
    var worldName = prompt("Server name?", localStorage && localStorage.worldName || ""),
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
}

// init
$(document).ready(onDocumentReady);
