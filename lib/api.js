var api,
    matchListUrl = "https://api.guildwars2.com/v1/wvw/matches.json",
    matchDetailsUrl = "https://api.guildwars2.com/v1/wvw/match_details.json",
    worldNamesUrl = "https://api.guildwars2.com/v1/world_names.json?lang=en",
    worldNames = {};

function makeRequest(url, options, success, error) {
    options = options || {};
    var requestUrl = url + "?",
        queryStringParams = {},
        option;

    for (option in options) {
        if (options.hasOwnProperty(option)) {
            queryStringParams[option] = options[option];
        }
    }
    requestUrl += $.param(queryStringParams);

    $.ajax({
        url: requestUrl,
        type: "get",
        data: undefined,
        success: function (result) {
            var value = typeof result === "string" ? result : JSON.stringify(result);
            if (result && success) {
                success(result);
            } else if (error) {
                error(result);
            }
        },
        error: function (jqxhr, errorMsg) {
                   error(errorMsg);
               }
    });
}

function findWorldId(name, callback) {
    makeRequest(worldNamesUrl, {}, function (data) {
        var worldId;

        data.forEach(function (dataPoint) {
            worldNames[dataPoint.id] = dataPoint.name;
            if (dataPoint.name === name) {
                worldId = dataPoint.id;
            }
        });

        callback({
            "worldId": worldId
        });
    });
}

function findWvWMatchId(worldId, callback) {
    worldId = parseInt(worldId);
    makeRequest(matchListUrl, {}, function (data) {
        data.wvw_matches.forEach(function (dataPoint) {
            if (dataPoint.red_world_id === worldId
                || dataPoint.green_world_id === worldId
                || dataPoint.blue_world_id === worldId) {
                callback({
                    "matchId": dataPoint.wvw_match_id,
                    "red": worldNames[dataPoint.red_world_id],
                    "green": worldNames[dataPoint.green_world_id],
                    "blue": worldNames[dataPoint.blue_world_id],
                    "endTime" : dataPoint.end_time
                });
            }
        });
    });
}

function findMatchDetails(matchId, callback) {
    makeRequest(matchDetailsUrl, {"match_id": matchId}, function (data) {
        callback({
            scores: {
                "red": data.scores[0],
                "blue": data.scores[1],
                "green": data.scores[2],
            }
        });
    });
}

function findMatchScore(name, callback) {
    findWorldId(name, function (data) {
        findWvWMatchId(data.worldId, function (matchData) {
            findMatchDetails(matchData.matchId, function (data) {
                var scores = [];
                scores.push({
                    "name": matchData.red,
                    "score": data.scores.red,
                    "color": "rgba(255, 0, 0, 0.2)"
                });
                scores.push({
                    "name": matchData.green,
                    "score": data.scores.green,
                    "color": "rgba(0, 255, 0, 0.2)"
                });
                scores.push({
                    "name": matchData.blue,
                    "score": data.scores.blue,
                    "color": "rgba(0, 0, 255, 0.2)"
                });

                function compare(a,b) {
                    if (a.score > b.score)
                        return -1;
                    if (a.score < b.score)
                        return 1;
                    return 0;
                }

                scores.sort(compare);
                callback(scores);
            });
        });
    });
}

function findTimeLeft(name, callback) {
    findWorldId(name, function (data) {
        findWvWMatchId(data.worldId, callback);
    });
}
api = {
    findWorldId: findWorldId,
    findWvWMatchId: findWvWMatchId,
    findMatchScore: findMatchScore,
    findTimeLeft: findTimeLeft
};

module.exports = api;
