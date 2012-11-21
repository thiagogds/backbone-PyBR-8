# coding: utf-8
import json

from django.shortcuts import render_to_response
from django.http import HttpResponse, HttpResponseServerError
from django.template import RequestContext

from models import AbsenteeismEntry, Absenteeism
from forms import AbsenteeismEntryForm, AbsenteeismForm

def homepage(request):
    context = RequestContext(request)
    return render_to_response('index.html', context)

def save(request):
    absenteeism_data = json.loads(request.POST['data'])
    absenteeism = absenteeism_data['absenteeism']

    absenteeism_entries = absenteeism['entries']
    absenteeism.pop('entries')


    absenteeism_form = AbsenteeismForm(absenteeism)
    if absenteeism_form.is_valid():
        entries_form = []
        for entry in absenteeism_entries:
            entry_form = AbsenteeismEntryForm(entry)
            if entry_form.is_valid():
                entries_form.append(entry_form.cleaned_data)
            else:
                return HttpResponseServerError(json.dumps(entry_form.errors),
                                               mimetype="application/json")

    else:
        return HttpResponseServerError(json.dumps(absenteeism_form.errors),
                                       mimetype="application/json")


    new_absenteeism = absenteeism_form.save()
    for entry in entries_form:
        new_absenteeism.absenteeismentry_set.create(**entry)

    return HttpResponse(json.dumps(dict(message="Salvou com sucesso!")),
                        mimetype="application/json")

