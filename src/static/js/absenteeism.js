(function() {
    window.Absenteeism = Backbone.Model.extend();

    window.AbsenteeismView = Backbone.View.extend({
        tagName: 'tr',
        initialize: function() {
            _.bindAll(this, 'render');
        },
        render: function() {
            var abs_template_html = $('#absenteeism_form').html();
            var abs_template = Handlebars.compile(abs_template_html);

            debugger
            $(this.el).html(abs_template(this.model.toJSON()));

            var self = this;
            $(this.el).find('input[type=text]').datepicker({
                format: 'dd/mm/yyyy',
                autoclose: true,
                language: 'pt-BR',
            })

            return this;
        },
    });

    window.AbsenteeismCollection = Backbone.Collection.extend({
        model: Absenteeism
    });

    window.AbsenteeismReport = Backbone.View.extend({
        el: function () { return $('#main'); },
        initialize: function() {
            _.bindAll(this, 'render');
        },
        render: function() {
            var view = $(this.el).find('#table_body');
            this.collection.each(function(model) {
                var model_view = new AbsenteeismView({model: model});
                view.append(model_view.render().el);
            });
            return this;
        },
    });
})();

