describe("Absenteeism", function() {
    beforeEach(function() {
        this.initial_data = {
          'atested_begin': "03/01/2012",
          'atested_end': "04/01/2012",
          'revised_begin': "03/01/2012",
          'revised_end': "04/01/2012",
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
                var atested_begin = $("input[name=atested_begin]");
                var atested_end = $("input[name=atested_end]");
                var revised_begin = $("input[name=revised_begin]");
                var revised_end = $("input[name=revised_end]");
                var dias_negados = $("span.difference");

                expect(atested_begin).toHaveValue("03/01/2012");
                expect(atested_end).toHaveValue("04/01/2012");
                expect(revised_begin).toHaveValue("03/01/2012");
                expect(revised_end).toHaveValue("04/01/2012");
            });
        });

        describe("When adding", function() {

            it("should show the correct components", function() {
                var new_absenteeism =  new Absenteeism({
                  'atested_begin': "05/01/2012",
                  'atested_end': "06/01/2012",
                  'revised_begin': "05/01/2012",
                  'revised_end': "06/01/2012",
                });

                this.absenteeismReportView.collection.add(new_absenteeism);

                var atested_begin = $("input[name=atested_begin]");
                var atested_end = $("input[name=atested_end]");
                var revised_begin = $("input[name=revised_begin]");
                var revised_end = $("input[name=revised_end]");
                var dias_negados = $("span.difference");

                expect(atested_begin).toHaveValue("05/01/2012");
                expect(atested_end).toHaveValue("06/01/2012");
                expect(revised_begin).toHaveValue("05/01/2012");
                expect(revised_end).toHaveValue("06/01/2012");
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
                var atested_begin = $("input[name=atested_begin]");
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

                this.initial_data["atested_end"] = "01/01/2012";
                this.absenteeism.set(this.initial_data);

                expect(this.eventSpy).toHaveBeenCalledOnce();
                expect(this.eventSpy).toHaveBeenCalledWith(
                    this.absenteeism,
                    "Data Final Atestadada não pode ser menor que a Data Inicial Atestada"
                );
            });

            it("should check that first conceived date is lower then second date", function() {
                this.absenteeism.bind("error", this.eventSpy);

                this.initial_data["revised_end"] = "01/01/2012";
                this.absenteeism.set(this.initial_data);

                expect(this.eventSpy).toHaveBeenCalledOnce();
                expect(this.eventSpy).toHaveBeenCalledWith(
                    this.absenteeism,
                    "Data Final Abonada não pode ser menor que a Data Inicial Abonada"
                );
            });

            it("should check that first conceived date is higher or equal then first atested date", function() {
                this.absenteeism.bind("error", this.eventSpy);

                this.initial_data["revised_begin"] = "01/01/2012";
                this.absenteeism.set(this.initial_data);

                expect(this.eventSpy).toHaveBeenCalledOnce();
                expect(this.eventSpy).toHaveBeenCalledWith(
                    this.absenteeism,
                    "Data Incial Abonada não pode ser menor que a Data Inicial Atestada"
                );
            });

            it("should check that last conceived date is lower or equal then first atested date", function() {
                this.absenteeism.bind("error", this.eventSpy);

                this.initial_data["revised_end"] = "05/01/2012";
                this.absenteeism.set(this.initial_data);

                expect(this.eventSpy).toHaveBeenCalledOnce();
                expect(this.eventSpy).toHaveBeenCalledWith(
                    this.absenteeism,
                    "Data Final Abonada não pode ser maior que a Data Final Atestada"
                );
            });

            it("should check for a valid date", function() {
                this.absenteeism.bind("error", this.eventSpy);

                this.initial_data["revised_end"] = "Data inválida";
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


