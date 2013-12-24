var View,
    viewTemplate,
    api = require("../api");

View = Backbone.View.extend({
    initialize: function () {
        var view = this;
        $.get("templates/timeleft.html", function (data) {
            viewTemplate = data;
            api.findTimeLeft(view.model.get("worldName"), view.render.bind(view));
        });
    },
    render: function (data) {
        var timeleft = countdown(new Date(data.endTime), null, countdown.HOURS|countdown.MINUTES|countdown.SECONDS|countdown.MILLISECONDS);
        var template = _.template(viewTemplate, {
            timeleft: {
                hours: timeleft.hours,
                mins: timeleft.minutes < 10 ? ("0" + timeleft.minutes) : timeleft.minutes,
                secs: timeleft.seconds < 10 ? ("0" + timeleft.seconds) : timeleft.seconds,
                msecs: timeleft.milliseconds < 100 ? "0" : timeleft.milliseconds.toString()[0]
            }
        });
        this.$el.html(template);
        setTimeout(this.render.bind(this, data), 100);
    },
    display: function (model) {
        this.model = model;
        this.render();
    },
    hide: function () {
        this.$el.hide();
    }
});

module.exports = View;
