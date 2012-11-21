# coding: utf-8
from django.test import TestCase
from django.core.urlresolvers import reverse

from models import AbsenteeismEntry, Absenteeism
from forms import AbsenteeismEntryForm

class HomepageTest(TestCase):
    def test_get_homepage(self):
        response = self.client.get('/')
        self.assertEquals(200, response.status_code)
        self.assertTemplateUsed(response, 'index.html')

class AbsenteeismEntryFormTest(TestCase):
    def test_atested_begin_lower_than_atested_end(self):
        form = AbsenteeismEntryForm({
            'atested_begin' : "02/01/2012",
            'atested_end' : "01/01/2012",
            'revised_begin' : "01/01/2012",
            'revised_end' : "01/01/2012",
        })

        self.assertFalse(form.is_valid())
        self.assertIn(u'Data Final Atestadada não pode ser menor que a Data Inicial Atestada', form.errors.get('__all__'))

    def test_revised_begin_lower_than_revised_end(self):
        form = AbsenteeismEntryForm({
            'atested_begin' : "01/01/2012",
            'atested_end' : "04/01/2012",
            'revised_begin' : "03/01/2012",
            'revised_end' : "02/01/2012",
        })

        self.assertFalse(form.is_valid())
        self.assertIn(u'Data Final Abonada não pode ser menor que a Data Inicial Abonada', form.errors.get('__all__'))

    def test_atested_begin_lower_than_revised_begin(self):
        form = AbsenteeismEntryForm({
            'atested_begin' : "03/01/2012",
            'atested_end' : "04/01/2012",
            'revised_begin' : "02/01/2012",
            'revised_end' : "04/01/2012",
        })

        self.assertFalse(form.is_valid())
        self.assertIn(u'Data Incial Abonada não pode ser menor que a Data Inicial Atestada', form.errors.get('__all__'))

    def test_atested_end_greater_than_revised_end(self):
        form = AbsenteeismEntryForm({
            'atested_begin' : "03/01/2012",
            'atested_end' : "04/01/2012",
            'revised_begin' : "03/01/2012",
            'revised_end' : "05/01/2012",
        })

        self.assertFalse(form.is_valid())
        self.assertIn(u'Data Final Abonada não pode ser maior que a Data Final Atestada', form.errors.get('__all__'))

class TestSaveView(TestCase):
    def setUp(self):
        self.post_data = {
            u'data':
                [
                    u'{ \
                        "absenteeism": \
                            {\
                                "adm_obs":"Obs Adm",\
                                "medical_obs":"Obs Médica",\
                                "entries":\
                                    [\
                                        {\
                                            "atested_begin":"16/11/2012",\
                                            "revised_begin":"16/11/2012",\
                                            "atested_end":"16/11/2012",\
                                            "revised_end":"16/11/2012"\
                                        }\
                                    ]\
                            }\
                        }'
                ]
        }

    def test_correct_save_absenteeism_and_entries(self):
        response = self.client.post(reverse('save'), self.post_data)

        absenteeism = Absenteeism.objects.get(id=1)
        absenteeism_entry = AbsenteeismEntry.objects.get(id=1)

        self.assertTrue(absenteeism)
        self.assertTrue(absenteeism_entry)
