from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError


class VacationType(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name='Nazwa rodzaju urlopu')
    color = models.CharField(max_length=20, default='blue', verbose_name='Kolor',
                             help_text='blue, green, red, yellow, purple, orange, pink, teal')
    default_days_per_year = models.IntegerField(default=0, verbose_name='Domyślna liczba dni/rok')
    is_active = models.BooleanField(default=True, verbose_name='Aktywny')
    requires_balance = models.BooleanField(default=True, verbose_name='Wymaga salda',
                                           help_text='Jeśli False, można brać bez limitu dni')

    class Meta:
        verbose_name = 'Rodzaj urlopu'
        verbose_name_plural = 'Rodzaje urlopów'
        ordering = ['name']

    def __str__(self):
        return self.name


class VacationTypeAllocation(models.Model):
    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='vacation_type_allocations', verbose_name='Pracownik'
    )
    vacation_type = models.ForeignKey(
        VacationType, on_delete=models.CASCADE,
        related_name='allocations', verbose_name='Rodzaj urlopu'
    )
    year = models.IntegerField(verbose_name='Rok')
    allocated_days = models.IntegerField(default=0, verbose_name='Przyznane dni')
    used_days = models.IntegerField(default=0, verbose_name='Wykorzystane dni')

    class Meta:
        verbose_name = 'Przydział rodzaju urlopu'
        verbose_name_plural = 'Przydziały rodzajów urlopów'
        unique_together = ('employee', 'vacation_type', 'year')

    def __str__(self):
        return f'{self.employee} — {self.vacation_type} ({self.year})'

    @property
    def available_days(self):
        return self.allocated_days - self.used_days


class VacationBalance(models.Model):
    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='vacation_balances', verbose_name='Pracownik'
    )
    year = models.IntegerField(verbose_name='Rok')
    allocated_days = models.IntegerField(default=0, verbose_name='Przyznane dni urlopu')
    carried_over = models.IntegerField(default=0, verbose_name='Przeniesione z poprzedniego roku')
    used_days = models.IntegerField(default=0, verbose_name='Wykorzystane dni urlopu')
    remote_days_allocated = models.IntegerField(default=0, verbose_name='Przyznane dni zdalnych')
    remote_days_used = models.IntegerField(default=0, verbose_name='Wykorzystane dni zdalnych')

    class Meta:
        verbose_name = 'Bilans urlopowy'
        verbose_name_plural = 'Bilanse urlopowe'
        unique_together = ('employee', 'year')
        ordering = ['-year']

    def __str__(self):
        return f'{self.employee} — {self.year}'

    @property
    def available_days(self):
        return self.allocated_days + self.carried_over - self.used_days

    @property
    def available_remote_days(self):
        return self.remote_days_allocated - self.remote_days_used

    @classmethod
    def get_or_create_for_year(cls, employee, year):
        obj, created = cls.objects.get_or_create(
            employee=employee, year=year,
            defaults={'allocated_days': 0, 'carried_over': 0}
        )
        return obj

    @classmethod
    def carry_over_to_new_year(cls, employee, from_year, to_year, new_allocation):
        prev = cls.objects.filter(employee=employee, year=from_year).first()
        carry = 0
        if prev:
            carry = max(0, prev.available_days)
        obj, _ = cls.objects.get_or_create(employee=employee, year=to_year)
        obj.allocated_days = new_allocation
        obj.carried_over = carry
        obj.save()
        return obj


class VacationRequest(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Oczekuje na akceptację'),
        (STATUS_APPROVED, 'Zaakceptowany'),
        (STATUS_REJECTED, 'Odrzucony'),
        (STATUS_CANCELLED, 'Anulowany'),
    ]

    TYPE_VACATION = 'vacation'
    TYPE_REMOTE = 'remote'

    TYPE_CHOICES = [
        (TYPE_VACATION, 'Urlop'),
        (TYPE_REMOTE, 'Praca zdalna'),
    ]

    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='vacation_requests', verbose_name='Pracownik'
    )
    vacation_type = models.ForeignKey(
        VacationType, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='requests', verbose_name='Rodzaj urlopu'
    )
    start_date = models.DateField(verbose_name='Data od')
    end_date = models.DateField(verbose_name='Data do')
    days_count = models.IntegerField(verbose_name='Liczba dni roboczych')
    reason = models.TextField(blank=True, verbose_name='Powód')
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING
    )
    request_type = models.CharField(
        max_length=20, choices=TYPE_CHOICES, default=TYPE_VACATION,
        verbose_name='Typ wniosku'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='created_vacation_requests', verbose_name='Wniosek złożony przez'
    )
    approver = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approved_vacations', verbose_name='Akceptujący'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='cancelled_vacations', verbose_name='Anulowany przez'
    )
    cancelled_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, verbose_name='Uwagi')
    is_archived = models.BooleanField(default=False, verbose_name='Zarchiwizowany')

    class Meta:
        verbose_name = 'Wniosek urlopowy'
        verbose_name_plural = 'Wnioski urlopowe'
        ordering = ['-created_at']

    def __str__(self):
        return (f'{self.employee} — {self.start_date.strftime("%d.%m.%Y")} '
                f'do {self.end_date.strftime("%d.%m.%Y")} ({self.get_status_display()})')

    def clean(self):
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError('Data początku nie może być późniejsza niż data końca.')


class WorkCalendar(models.Model):
    name = models.CharField(max_length=200, verbose_name='Nazwa kalendarza')
    year = models.IntegerField(verbose_name='Rok')
    is_active = models.BooleanField(default=True, verbose_name='Aktywny')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='created_calendars',
    )

    class Meta:
        verbose_name = 'Kalendarz pracowniczy'
        verbose_name_plural = 'Kalendarze pracownicze'
        ordering = ['-year', 'name']

    def __str__(self):
        return f'{self.name} ({self.year})'

    def get_holiday_dates(self):
        from datetime import date as date_type
        dates = set()
        for h in self.recurring_holidays.all():
            try:
                dates.add(date_type(self.year, h.month, h.day))
            except ValueError:
                pass
        for h in self.single_holidays.all():
            dates.add(h.date)
        return dates


class RecurringHoliday(models.Model):
    calendar = models.ForeignKey(
        WorkCalendar, on_delete=models.CASCADE, related_name='recurring_holidays'
    )
    name = models.CharField(max_length=200, verbose_name='Nazwa')
    month = models.IntegerField(verbose_name='Miesiąc')
    day = models.IntegerField(verbose_name='Dzień')

    class Meta:
        unique_together = ('calendar', 'month', 'day')
        ordering = ['month', 'day']

    def __str__(self):
        return f'{self.name} ({self.day:02d}.{self.month:02d})'


class SingleHoliday(models.Model):
    calendar = models.ForeignKey(
        WorkCalendar, on_delete=models.CASCADE, related_name='single_holidays'
    )
    name = models.CharField(max_length=200, verbose_name='Nazwa')
    date = models.DateField(verbose_name='Data')

    class Meta:
        unique_together = ('calendar', 'date')
        ordering = ['date']

    def __str__(self):
        return f'{self.name} ({self.date.strftime("%d.%m.%Y")})'


class CalendarAssignment(models.Model):
    calendar = models.ForeignKey(
        WorkCalendar, on_delete=models.CASCADE, related_name='assignments'
    )
    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='calendar_assignments'
    )

    class Meta:
        unique_together = ('employee', 'calendar')
        verbose_name = 'Przypisanie kalendarza'
        verbose_name_plural = 'Przypisania kalendarzy'

    def __str__(self):
        return f'{self.employee} → {self.calendar}'
