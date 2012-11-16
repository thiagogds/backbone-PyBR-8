from django.db import models

class Absenteeism(models.Model):
    medical_obs = models.TextField(blank=True, null=True)
    adm_obs = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

class AbsenteeismEntry(models.Model):
    atested_begin = models.DateField(null=False, blank=False)
    atested_end = models.DateField(null=False, blank=False)
    revised_begin = models.DateField(null=False, blank=False)
    revised_end = models.DateField(null=False, blank=False)
    absenteeism = models.ForeignKey(Absenteeism, null=False, blank=False)
