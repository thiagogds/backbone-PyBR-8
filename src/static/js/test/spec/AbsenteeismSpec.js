describe("Absenteeism", function() {
    beforeEach(function() {
        this.initial_data = {
          'inicio_atestado': "03/01/2012",
          'fim_atestado': "04/01/2012",
          'inicio_revisado': "03/01/2012",
          'fim_revisado': "04/01/2012",
        };

        this.absenteeism = new Absenteeism(this.initial_data);
        this.absenteeismCollection = new AbsenteeismCollection([this.absenteeism])
        this.absenteeismReportView = new AbsenteeismReport({collection: this.absenteeismCollection})
    });

    describe("AbsenteeismReport View", function() {
        beforeEach(function() {
            loadFixtures("absenteeism.html");
        });

        describe("When rendering", function() {
            it("should show the correct components", function() {
                this.absenteeismReportView.render();
                var inicio_atestado = $("input[name=inicio_atestado]");
                var fim_atestado = $("input[name=fim_atestado]");
                var inicio_revisado = $("input[name=inicio_revisado]");
                var fim_revisado = $("input[name=fim_revisado]");
                var dias_negados = $("span.difference");

                expect(inicio_atestado).toHaveValue("03/01/2012");
                expect(fim_atestado).toHaveValue("04/01/2012");
                expect(inicio_revisado).toHaveValue("03/01/2012");
                expect(fim_revisado).toHaveValue("04/01/2012");
            });
        });

        describe("When adding", function() {

            it("should show the correct components", function() {
                var new_absenteeism =  new Absenteeism({
                  'inicio_atestado': "05/01/2012",
                  'fim_atestado': "06/01/2012",
                  'inicio_revisado': "05/01/2012",
                  'fim_revisado': "06/01/2012",
                });

                this.absenteeismReportView.collection.add(new_absenteeism);

                var inicio_atestado = $("input[name=inicio_atestado]");
                var fim_atestado = $("input[name=fim_atestado]");
                var inicio_revisado = $("input[name=inicio_revisado]");
                var fim_revisado = $("input[name=fim_revisado]");
                var dias_negados = $("span.difference");

                expect(inicio_atestado).toHaveValue("05/01/2012");
                expect(fim_atestado).toHaveValue("06/01/2012");
                expect(inicio_revisado).toHaveValue("05/01/2012");
                expect(fim_revisado).toHaveValue("06/01/2012");
            });
        });

        describe("When save", function() {
            it("should redirect to succes url for valid inputs", function() {
                var response = {
                    "succes_url": "/sucesso"
                }

                spyOn($, "ajax").andCallFake(function(params) {
                    params.success(response);
                });

                spyOn(this.absenteeismReportView, 'process_success');

                this.absenteeismReportView.save();

                expect(this.absenteeismReportView.process_success.calls.length).toEqual(1);
                expect(this.absenteeismReportView.process_success.calls[0].args[0]).toEqual(response);
            });
        });
    });

    describe("AbsenteeismView", function() {
        beforeEach(function() {
            loadFixtures("absenteeism.html");
            var absenteeism = new Absenteeism(this.initial_data);
            this.newAbsenteeismCollection = new AbsenteeismCollection([absenteeism])
        });

        describe("When removing", function() {
            it("should remove the model from collection", function() {
                var absenteeism =  this.newAbsenteeismCollection.first()
                var absenteeismView = new AbsenteeismView({model: absenteeism});
                expect(this.newAbsenteeismCollection.length).toEqual(1);

                absenteeismView.remove();

                expect(this.newAbsenteeismCollection.length).toEqual(0);
                var inicio_atestado = $("input[name=inicio_atestado]");
            });
        });
    });

    describe("AbsenteeismModel", function() {
        beforeEach(function() {
            this.eventSpy = sinon.spy();
        });
        describe("When validating", function() {
            it("should check that first atested date is lower then second date", function() {
                this.absenteeism.bind("error", this.eventSpy);

                this.initial_data["fim_atestado"] = "01/01/2012";
                this.absenteeism.set(this.initial_data);

                expect(this.eventSpy).toHaveBeenCalledOnce();
                expect(this.eventSpy).toHaveBeenCalledWith(
                    this.absenteeism,
                    "Data Final Atestadada não pode ser menor que a Data Inicial Atestada"
                );
            });

            it("should check that first conceived date is lower then second date", function() {
                this.absenteeism.bind("error", this.eventSpy);

                this.initial_data["fim_revisado"] = "01/01/2012";
                this.absenteeism.set(this.initial_data);

                expect(this.eventSpy).toHaveBeenCalledOnce();
                expect(this.eventSpy).toHaveBeenCalledWith(
                    this.absenteeism,
                    "Data Final Abonada não pode ser menor que a Data Inicial Abonada"
                );
            });

            it("should check that first conceived date is higher or equal then first atested date", function() {
                this.absenteeism.bind("error", this.eventSpy);

                this.initial_data["inicio_revisado"] = "01/01/2012";
                this.absenteeism.set(this.initial_data);

                expect(this.eventSpy).toHaveBeenCalledOnce();
                expect(this.eventSpy).toHaveBeenCalledWith(
                    this.absenteeism,
                    "Data Incial Abonada não pode ser menor que a Data Inicial Atestada"
                );
            });

            it("should check that last conceived date is lower or equal then first atested date", function() {
                this.absenteeism.bind("error", this.eventSpy);

                this.initial_data["fim_revisado"] = "05/01/2012";
                this.absenteeism.set(this.initial_data);

                expect(this.eventSpy).toHaveBeenCalledOnce();
                expect(this.eventSpy).toHaveBeenCalledWith(
                    this.absenteeism,
                    "Data Final Abonada não pode ser maior que a Data Final Atestada"
                );
            });

            it("should check for a valid date", function() {
                this.absenteeism.bind("error", this.eventSpy);

                this.initial_data["fim_revisado"] = "Data inválida";
                this.absenteeism.set(this.initial_data);

                expect(this.eventSpy).toHaveBeenCalledOnce();
                expect(this.eventSpy).toHaveBeenCalledWith(
                    this.absenteeism,
                    "Data inválida"
                );
            });
        });
    });
});


