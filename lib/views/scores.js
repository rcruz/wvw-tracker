var View,
    viewTemplate,
    api = require("../api");

View = Backbone.View.extend({
    initialize: function () {
        var view = this;
        $.get("templates/scores.html", function (data) {
            viewTemplate = data;
            view.render();
        });
    },
    render: function () {
        var view = this;
        api.findMatchScore(this.model.get("worldName"), function (scores) {
            var template = _.template(viewTemplate, {
                scores: scores
            });
            view.$el.html(template);
        });

    },
    display: function (model) {
        this.render();
    },
    hide: function () {
        this.$el.hide();
    }
});

module.exports = View;
