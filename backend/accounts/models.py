import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class Company(models.Model):
    name = models.CharField(max_length=200, verbose_name='Firma')
    address = models.TextField(blank=True, verbose_name='Adres')

    class Meta:
        verbose_name = 'Firma'
        verbose_name_plural = 'Firmy'
        ordering = ['name']

    def __str__(self):
        return self.name


class Region(models.Model):
    name = models.CharField(max_length=200, verbose_name='Region')
    address = models.TextField(blank=True, verbose_name='Adres')

    class Meta:
        verbose_name = 'Region'
        verbose_name_plural = 'Regiony'
        ordering = ['name']

    def __str__(self):
        return self.name


class Department(models.Model):
    name = models.CharField(max_length=200, verbose_name='Nazwa działu')
    parent = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='children', verbose_name='Dział nadrzędny'
    )

    class Meta:
        verbose_name = 'Dział'
        verbose_name_plural = 'Działy'
        ordering = ['name']

    def __str__(self):
        return self.name


class Position(models.Model):
    name = models.CharField(max_length=200, unique=True, verbose_name='Nazwa stanowiska')
    description = models.TextField(blank=True, verbose_name='Opis')
    is_active = models.BooleanField(default=True, verbose_name='Aktywne')

    class Meta:
        verbose_name = 'Stanowisko'
        verbose_name_plural = 'Stanowiska'
        ordering = ['name']

    def __str__(self):
        return self.name


class CustomRole(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name='Nazwa roli')
    description = models.TextField(blank=True, verbose_name='Opis')
    color = models.CharField(max_length=20, default='gray', verbose_name='Kolor odznaki',
                             help_text='Dostępne: gray, blue, green, yellow, red, purple, orange')

    can_view_employees = models.BooleanField(default=False, verbose_name='Podgląd pracowników')
    can_edit_employees = models.BooleanField(default=False, verbose_name='Edycja pracowników')
    can_manage_questionnaires = models.BooleanField(default=False, verbose_name='Zarządzanie kwestionariuszami')
    can_manage_tests = models.BooleanField(default=False, verbose_name='Zarządzanie testami')
    can_approve_vacations = models.BooleanField(default=False, verbose_name='Zatwierdzanie wniosków')
    can_manage_balances = models.BooleanField(default=False, verbose_name='Edycja sald urlopowych')
    can_cancel_approved_vacations = models.BooleanField(default=False, verbose_name='Anulowanie zatwierdzonych urlopów')
    can_manage_structure = models.BooleanField(default=False, verbose_name='Zarządzanie strukturą')
    can_view_all_requests = models.BooleanField(default=False, verbose_name='Podgląd wszystkich wniosków')
    can_upload_documents = models.BooleanField(default=False, verbose_name='Przesyłanie dokumentów')
    can_view_documents = models.BooleanField(default=False, verbose_name='Podgląd dokumentów')
    can_post_news = models.BooleanField(default=False, verbose_name='Publikowanie aktualności')
    can_manage_contracts = models.BooleanField(default=False, verbose_name='Zarządzanie umowami')

    class Meta:
        verbose_name = 'Niestandardowa rola'
        verbose_name_plural = 'Niestandardowe role'
        ordering = ['name']

    def __str__(self):
        return self.name


class User(AbstractUser):
    ROLE_ADMIN = 'admin'
    ROLE_HR = 'hr'
    ROLE_MANAGER = 'manager'
    ROLE_EMPLOYEE = 'employee'

    ROLE_CHOICES = [
        (ROLE_ADMIN, 'Administrator'),
        (ROLE_HR, 'Kadry/HR'),
        (ROLE_MANAGER, 'Kierownik'),
        (ROLE_EMPLOYEE, 'Pracownik'),
    ]

    CONTRACT_CHOICES = [
        ('uop_nieokreslony', 'UoP — czas nieokreślony'),
        ('uop_okreslony', 'UoP — czas określony'),
        ('zlecenie', 'Umowa zlecenie'),
        ('dzielo', 'Umowa o dzieło'),
        ('b2b', 'B2B'),
        ('staz', 'Staż / Praktyka'),
    ]

    EXAM_CHOICES = [
        ('wstepne', 'Wstępne'),
        ('okresowe', 'Okresowe'),
        ('kontrolne', 'Kontrolne'),
    ]

    role = models.CharField(
        max_length=20, choices=ROLE_CHOICES,
        default=ROLE_EMPLOYEE, verbose_name='Rola'
    )
    custom_role = models.ForeignKey(
        CustomRole, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='users', verbose_name='Niestandardowa rola'
    )
    department = models.ForeignKey(
        Department, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='employees', verbose_name='Dział'
    )
    manager = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='subordinates', verbose_name='Przełożony'
    )
    substitute_manager = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='substituting_for', verbose_name='Zastępca przełożonego'
    )
    phone = models.CharField(max_length=30, blank=True, verbose_name='Telefon')
    position = models.CharField(max_length=200, blank=True, verbose_name='Stanowisko')
    hire_date = models.DateField(null=True, blank=True, verbose_name='Data zatrudnienia')
    company = models.ForeignKey(
        Company, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='employees', verbose_name='Firma'
    )
    region = models.ForeignKey(
        Region, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='employees', verbose_name='Region'
    )

    # Contract
    contract_type = models.CharField(
        max_length=30, choices=CONTRACT_CHOICES, blank=True, verbose_name='Typ umowy'
    )
    contract_start = models.DateField(null=True, blank=True, verbose_name='Umowa od')
    contract_end = models.DateField(null=True, blank=True, verbose_name='Umowa do')

    # Medical exam
    medical_exam_type = models.CharField(
        max_length=20, choices=EXAM_CHOICES, blank=True, verbose_name='Typ badania'
    )
    medical_exam_next_date = models.DateField(null=True, blank=True, verbose_name='Następne badanie')

    # BHP (safety training)
    bhp_date = models.DateField(null=True, blank=True, verbose_name='Data szkolenia BHP')
    bhp_next_date = models.DateField(null=True, blank=True, verbose_name='Następne szkolenie BHP')

    termination_date = models.DateField(null=True, blank=True, verbose_name='Data zwolnienia')

    class Meta:
        verbose_name = 'Użytkownik'
        verbose_name_plural = 'Użytkownicy'
        ordering = ['last_name', 'first_name']

    def __str__(self):
        full = self.get_full_name()
        return full if full else self.username

    @property
    def is_hr_or_admin(self):
        return self.role in (self.ROLE_HR, self.ROLE_ADMIN)

    @property
    def is_manager_or_above(self):
        return self.role in (self.ROLE_HR, self.ROLE_ADMIN, self.ROLE_MANAGER)

    def has_custom_perm(self, perm_name):
        if self.is_hr_or_admin:
            return True
        if self.custom_role:
            return getattr(self.custom_role, perm_name, False)
        return False

    def get_approver(self):
        if self.manager and self.manager.is_active:
            return self.manager
        if self.substitute_manager and self.substitute_manager.is_active:
            return self.substitute_manager
        return User.objects.filter(role__in=[self.ROLE_HR, self.ROLE_ADMIN], is_active=True).first()


class Contract(models.Model):
    CONTRACT_CHOICES = [
        ('uop_nieokreslony', 'UoP — czas nieokreślony'),
        ('uop_okreslony', 'UoP — czas określony'),
        ('zlecenie', 'Umowa zlecenie'),
        ('dzielo', 'Umowa o dzieło'),
        ('b2b', 'B2B'),
        ('staz', 'Staż / Praktyka'),
    ]

    employee = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='contracts', verbose_name='Pracownik'
    )
    contract_type = models.CharField(max_length=30, choices=CONTRACT_CHOICES, verbose_name='Typ umowy')
    start_date = models.DateField(verbose_name='Data od')
    end_date = models.DateField(null=True, blank=True, verbose_name='Data do')
    position = models.CharField(max_length=200, blank=True, verbose_name='Stanowisko')
    notes = models.TextField(blank=True, verbose_name='Uwagi')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Umowa'
        verbose_name_plural = 'Umowy'
        ordering = ['-start_date']

    def __str__(self):
        return f'{self.employee} — {self.get_contract_type_display()} ({self.start_date})'


class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reset_tokens')
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def is_valid(self):
        return not self.used and (timezone.now() - self.created_at).total_seconds() < 3600
