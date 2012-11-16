# coding: utf-8
from django.test import TestCase

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
