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
            'blur input[name=inicio_atestado]': 'update_value',
            'blur input[name=fim_atestado]': 'update_value',
            'blur input[name=inicio_revisado]': 'update_value',
            'blur input[name=fim_revisado]': 'update_value'
        },
        tagName: 'tr',
        initialize: function() {
            _.bindAll(this, 'render');
            _.bindAll(this, 'remove');
            _.bindAll(this, 'update_value');
            _.bindAll(this, 'restore_view');
            this.model.on('error', this.restore_view);
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
            }).on('changeDate', function(ev) {
                self.update_value(ev);
            });

            return this;
        },
        remove: function() {
            $(this.el).remove();
            this.model.collection.remove(this.model);
        },
        update_value: function(event) {
            var data_inicio_atestado = $(this.el).find('input[name=inicio_atestado]').val();
            var data_fim_atestado = $(this.el).find('input[name=fim_atestado]').val();
            var data_inicio_revisado = $(this.el).find('input[name=inicio_revisado]').val();
            var data_fim_revisado = $(this.el).find('input[name=fim_revisado]').val();

            this.model.set({
                'inicio_atestado': data_inicio_atestado,
                'fim_atestado': data_fim_atestado,
                'inicio_revisado': data_inicio_revisado,
                'fim_revisado': data_fim_revisado,
            });
        },
        restore_view: function(model, message) {
            $(this.el).find('input[name=inicio_atestado]').val(this.model.get('inicio_atestado'));
            $(this.el).find('input[name=fim_atestado]').val(this.model.get('fim_atestado'));
            $(this.el).find('input[name=inicio_revisado]').val(this.model.get('inicio_revisado'));
            $(this.el).find('input[name=fim_revisado]').val(this.model.get('fim_revisado'));
            $('#myModal .modal-body p').html(message);
            $('#myModal').modal('toggle');
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

