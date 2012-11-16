(function() {
    //convert string to date in pt-br format DD/MM/YYYY
    var strdt = function(str) {
        return moment(str, "DD/MM/YYYY").toDate();
    }

    window.Absenteeism = Backbone.Model.extend({
        validate: function(attributes) {
            var data_inicio_atestado = strdt(attributes.atested_begin);
            var data_fim_atestado = strdt(attributes.atested_end);
            var data_inicio_revisado = strdt(attributes.revised_begin);
            var data_fim_revisado = strdt(attributes.revised_end);

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
            'blur input[name=atested_begin]': 'update_value',
            'blur input[name=atested_end]': 'update_value',
            'blur input[name=revised_begin]': 'update_value',
            'blur input[name=revised_end]': 'update_value'
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
            var data_inicio_atestado = $(this.el).find('input[name=atested_begin]').val();
            var data_fim_atestado = $(this.el).find('input[name=atested_end]').val();
            var data_inicio_revisado = $(this.el).find('input[name=revised_begin]').val();
            var data_fim_revisado = $(this.el).find('input[name=revised_end]').val();

            this.model.set({
                'atested_begin': data_inicio_atestado,
                'atested_end': data_fim_atestado,
                'revised_begin': data_inicio_revisado,
                'revised_end': data_fim_revisado,
            });
        },
        restore_view: function(model, message) {
            $(this.el).find('input[name=atested_begin]').val(this.model.get('atested_begin'));
            $(this.el).find('input[name=atested_end]').val(this.model.get('atested_end'));
            $(this.el).find('input[name=revised_begin]').val(this.model.get('revised_begin'));
            $(this.el).find('input[name=revised_end]').val(this.model.get('revised_end'));
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
            'click .confirm': 'save',
        },
        el: function () { return $('#main'); },
        initialize: function() {
            _.bindAll(this, 'render');
            _.bindAll(this, 'add');
            _.bindAll(this, 'add_entry');
            _.bindAll(this, 'save');
            _.bindAll(this, 'process_success');
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
        process_success: function (data) {
        },
        save: function() {
            var self = this;
            var post_data = {};
            var absenteeism = {};
            var values = [];
            this.collection.each(function(model) {
                values.push(model.toJSON());
            });
            absenteeism['adm_obs'] = $(this.el).find('textarea[name="adm_obs"]').val();
            absenteeism['medical_obs'] = $(this.el).find('textarea[name="medical_obs"]').val();
            absenteeism['entries'] = values;
            post_data['absenteeism'] = absenteeism;
            $.ajax({
                type: 'POST',
                url: window.post_url,
                data: {data: JSON.stringify(post_data)},
                success: function(data) {
                    self.process_success(data);
                },
                dataType: 'json'
            });
        },
    });


    jQuery(document).ajaxSend(function(event, xhr, settings) {
        function getCookie(name) {
            var cookieValue = null;
            if (document.cookie && document.cookie != '') {
                var cookies = document.cookie.split(';');
                for (var i = 0; i < cookies.length; i++) {
                    var cookie = jQuery.trim(cookies[i]);
                    // Does this cookie string begin with the name we want?
                    if (cookie.substring(0, name.length + 1) == (name + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            return cookieValue;
        }
        function sameOrigin(url) {
            // url could be relative or scheme relative or absolute
            var host = document.location.host; // host + port
            var protocol = document.location.protocol;
            var sr_origin = '//' + host;
            var origin = protocol + sr_origin;
            // Allow absolute or scheme relative URLs to same origin
            return (url == origin || url.slice(0, origin.length + 1) == origin + '/') ||
                (url == sr_origin || url.slice(0, sr_origin.length + 1) == sr_origin + '/') ||
                // or any other URL that isn't scheme relative or absolute i.e relative.
                !(/^(\/\/|http:|https:).*/.test(url));
        }
        function safeMethod(method) {
            return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
        }

        if (!safeMethod(settings.type) && sameOrigin(settings.url)) {
            xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
        }
    });


})();

