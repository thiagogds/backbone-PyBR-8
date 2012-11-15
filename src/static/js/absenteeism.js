(function() {
    //convert string to date in pt-br format DD/MM/YYYY
    var strdt = function(str) {
        return moment(str, "DD/MM/YYYY").toDate();
    }

    window.Absenteeism = Backbone.Model.extend({
        validate: function(attributes) {
            var data_inicio_atestado = strdt(attributes.inicio_atestado);
            var data_fim_atestado = strdt(attributes.fim_atestado);
            var data_inicio_revisado = strdt(attributes.inicio_revisado);
            var data_fim_revisado = strdt(attributes.fim_revisado);

            if(data_inicio_atestado.getYear() <  0 ||
               data_fim_atestado.getYear() <  0 ||
               data_inicio_revisado.getYear() <  0 ||
               data_fim_revisado.getYear() <  0 ) {
                return "Data inválida";
            }

            if (data_fim_atestado < data_inicio_atestado) {
                return "Data Final Atestadada não pode ser menor que a Data Inicial Atestada";
            }
            if (data_fim_revisado < data_inicio_revisado) {
                return "Data Final Abonada não pode ser menor que a Data Inicial Abonada";
            }
            if (data_inicio_revisado < data_inicio_atestado) {
                return "Data Incial Abonada não pode ser menor que a Data Inicial Atestada";
            }
            if (data_fim_revisado > data_fim_atestado){
                return "Data Final Abonada não pode ser maior que a Data Final Atestada";
            }
        }
    });

    window.AbsenteeismView = Backbone.View.extend({
        events: {
            'click .remove': 'remove',
        },
        tagName: 'tr',
        initialize: function() {
            _.bindAll(this, 'render');
            _.bindAll(this, 'remove');
        },
        render: function() {
            var abs_template_html = $('#absenteeism_form').html();
            var abs_template = Handlebars.compile(abs_template_html);

            $(this.el).html(abs_template(this.model.toJSON()));

            var self = this;
            $(this.el).find('input[type=text]').datepicker({
                format: 'dd/mm/yyyy',
                autoclose: true,
                language: 'pt-BR',
            })

            return this;
        },
        remove: function() {
            $(this.el).remove();
            this.model.collection.remove(this.model);
        },
    });

    window.AbsenteeismCollection = Backbone.Collection.extend({
        model: Absenteeism
    });

    window.AbsenteeismReport = Backbone.View.extend({
        events: {
            'click .add': 'add_entry',
        },
        el: function () { return $('#main'); },
        initialize: function() {
            _.bindAll(this, 'render');
            _.bindAll(this, 'add');
            _.bindAll(this, 'add_entry');
            this.collection.on('add', this.add);
        },
        render: function() {
            var view = $(this.el).find('#table_body');
            this.collection.each(function(model) {
                var model_view = new AbsenteeismView({model: model});
                view.append(model_view.render().el);
            });
            return this;
        },
        add: function(item) {
            var entry = new AbsenteeismView({model:item});
            $(this.el).find('#table_body').append(entry.render().el);
        },
        add_entry: function() {
            this.collection.add(new_absenteeism());
        },
    });
})();

