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
        describe("When rendering", function() {
            beforeEach(function() {
                loadFixtures("absenteeism.html");
            });

            afterEach(function() {
            });

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
    });
});


