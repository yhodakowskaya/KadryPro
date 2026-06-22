import uuid
from django.db import models
from django.conf import settings


class QuestionnaireTemplate(models.Model):
    TYPE_PRACOWNIK = 'pracownik'
    TYPE_ZLECENIOBIORCA = 'zleceniobiorca_cudzoziemiec'
    TYPE_CUSTOM = 'custom'

    TYPE_CHOICES = [
        (TYPE_PRACOWNIK, 'Kwestionariusz dla pracownika (UoP)'),
        (TYPE_ZLECENIOBIORCA, 'Kwestionariusz dla zleceniobiorcy - cudzoziemca'),
        (TYPE_CUSTOM, 'Własny szablon'),
    ]

    name = models.CharField(max_length=300, verbose_name='Nazwa szablonu')
    type = models.CharField(max_length=50, choices=TYPE_CHOICES, verbose_name='Typ')
    fields_schema = models.JSONField(default=list, verbose_name='Schemat pól')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='created_templates', verbose_name='Utworzony przez'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True, verbose_name='Aktywny')

    class Meta:
        verbose_name = 'Szablon kwestionariusza'
        verbose_name_plural = 'Szablony kwestionariuszy'
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class QuestionnaireInvitation(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_COMPLETED = 'completed'
    STATUS_EXPIRED = 'expired'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Oczekuje'),
        (STATUS_COMPLETED, 'Wypełniony'),
        (STATUS_EXPIRED, 'Wygasły'),
        (STATUS_CANCELLED, 'Anulowany'),
    ]

    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    recipient_email = models.EmailField(verbose_name='Email odbiorcy')
    recipient_name = models.CharField(max_length=200, verbose_name='Imię i nazwisko odbiorcy')
    template = models.ForeignKey(
        QuestionnaireTemplate, on_delete=models.PROTECT,
        related_name='invitations', verbose_name='Szablon'
    )
    sent_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='sent_invitations', verbose_name='Wysłany przez'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(verbose_name='Wygasa')
    notes = models.TextField(blank=True, verbose_name='Uwagi')
    is_deleted = models.BooleanField(default=False, verbose_name='Usunięty')

    class Meta:
        verbose_name = 'Zaproszenie do kwestionariusza'
        verbose_name_plural = 'Zaproszenia do kwestionariuszy'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.recipient_name} ({self.recipient_email}) — {self.get_status_display()}'


class QuestionnaireSubmission(models.Model):
    invitation = models.OneToOneField(
        QuestionnaireInvitation, on_delete=models.CASCADE,
        related_name='submission', verbose_name='Zaproszenie'
    )
    data = models.JSONField(verbose_name='Dane formularza')
    submitted_at = models.DateTimeField(auto_now_add=True, verbose_name='Data wypełnienia')
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='Adres IP')

    class Meta:
        verbose_name = 'Wypełniony kwestionariusz'
        verbose_name_plural = 'Wypełnione kwestionariusze'
        ordering = ['-submitted_at']

    def __str__(self):
        return f'Kwestionariusz: {self.invitation.recipient_name} ({self.submitted_at.strftime("%d.%m.%Y")})'
