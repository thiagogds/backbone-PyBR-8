# coding: utf-8
from django import forms

from models import Absenteeism, AbsenteeismEntry
class AbsenteeismForm(forms.ModelForm):

    class Meta:
        model = Absenteeism

class AbsenteeismEntryForm(forms.ModelForm):

    class Meta:
        model = AbsenteeismEntry
        exclude = ('absenteeism',)

    def clean(self):
        super(AbsenteeismEntryForm, self).clean()

        if self.cleaned_data.get('atested_begin') > \
           self.cleaned_data.get('atested_end'):
            raise forms.ValidationError(
                u'Data Final Atestadada não pode ser menor que a Data Inicial Atestada')

        if self.cleaned_data.get('revised_begin') > \
           self.cleaned_data.get('revised_end'):
            raise forms.ValidationError(
                u'Data Final Abonada não pode ser menor que a Data Inicial Abonada')

        if self.cleaned_data.get('atested_begin') > \
           self.cleaned_data.get('revised_begin'):
            raise forms.ValidationError(
                u'Data Incial Abonada não pode ser menor que a Data Inicial Atestada')

        if self.cleaned_data.get('revised_end') > \
           self.cleaned_data.get('atested_end'):
            raise forms.ValidationError(
                u'Data Final Abonada não pode ser maior que a Data Final Atestada')

        return self.cleaned_data
