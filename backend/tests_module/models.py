from django.db import models
from django.conf import settings


class Test(models.Model):
    CATEGORY_BHP = 'BHP'
    CATEGORY_RODO = 'RODO'
    CATEGORY_CUSTOM = 'custom'

    CATEGORY_CHOICES = [
        (CATEGORY_BHP, 'BHP'),
        (CATEGORY_RODO, 'RODO'),
        (CATEGORY_CUSTOM, 'Inne'),
    ]

    title = models.CharField(max_length=300, verbose_name='Tytuł testu')
    description = models.TextField(blank=True, verbose_name='Opis')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, verbose_name='Kategoria')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='created_tests', verbose_name='Utworzony przez'
    )
    passing_score = models.IntegerField(default=70, verbose_name='Próg zaliczenia (%)')
    max_attempts = models.IntegerField(default=1, verbose_name='Maksymalna liczba prób (0 = bez limitu)')
    is_active = models.BooleanField(default=True, verbose_name='Aktywny')
    is_template = models.BooleanField(default=False, verbose_name='Szablon testu')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Test'
        verbose_name_plural = 'Testy'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class Question(models.Model):
    TYPE_SINGLE = 'single'
    TYPE_MULTIPLE = 'multiple'

    TYPE_CHOICES = [
        (TYPE_SINGLE, 'Jedna odpowiedź'),
        (TYPE_MULTIPLE, 'Wiele odpowiedzi'),
    ]

    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name='questions')
    text = models.TextField(verbose_name='Treść pytania')
    question_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_SINGLE)
    order = models.IntegerField(default=0, verbose_name='Kolejność')

    class Meta:
        verbose_name = 'Pytanie'
        verbose_name_plural = 'Pytania'
        ordering = ['order']

    def __str__(self):
        return f'Q{self.order}: {self.text[:60]}'


class Answer(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='answers')
    text = models.CharField(max_length=500, verbose_name='Treść odpowiedzi')
    is_correct = models.BooleanField(default=False, verbose_name='Poprawna')

    class Meta:
        verbose_name = 'Odpowiedź'
        verbose_name_plural = 'Odpowiedzi'

    def __str__(self):
        return f'{self.text[:60]} {"✓" if self.is_correct else "✗"}'


class TestAssignment(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_COMPLETED = 'completed'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Do wykonania'),
        (STATUS_COMPLETED, 'Wykonany'),
    ]

    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name='assignments')
    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='test_assignments', verbose_name='Pracownik'
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='assigned_tests', verbose_name='Przypisany przez'
    )
    deadline = models.DateField(null=True, blank=True, verbose_name='Termin')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Przypisanie testu'
        verbose_name_plural = 'Przypisania testów'
        unique_together = ('test', 'employee')
        ordering = ['-assigned_at']

    def __str__(self):
        return f'{self.employee} — {self.test.title}'


class TestAttempt(models.Model):
    assignment = models.ForeignKey(
        TestAssignment, on_delete=models.CASCADE, related_name='attempts'
    )
    score = models.FloatField(verbose_name='Wynik (%)')
    passed = models.BooleanField(verbose_name='Zaliczony')
    answers = models.JSONField(verbose_name='Odpowiedzi')
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Podejście do testu'
        verbose_name_plural = 'Podejścia do testów'
        ordering = ['-completed_at']

    def __str__(self):
        return f'{self.assignment.employee} — {self.score:.1f}% ({"✓" if self.passed else "✗"})'
