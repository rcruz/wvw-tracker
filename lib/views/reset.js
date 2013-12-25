var View,
    viewTemplate;

View = Backbone.View.extend({
    initialize: function () {
        var view = this;
        $.get("templates/reset.html", function (data) {
            viewTemplate = data;
            view.render();
        });
    },
    render: function () {
        var template = _.template(viewTemplate, {
        });
        this.$el.html(template);
    },
    display: function (model) {
        this.model = model;
        this.render();
    },
    hide: function () {
        this.$el.hide();
    },
    events: {
        "click #resetBtn": "reset"
    },
    reset: function () {
        localStorage.clear();
        alert("Cleared")
    }
});

module.exports = View;
