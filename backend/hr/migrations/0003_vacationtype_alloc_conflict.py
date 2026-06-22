from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('hr', '0002_vacationrequest_request_type'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='VacationType',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True, verbose_name='Nazwa rodzaju urlopu')),
                ('color', models.CharField(default='blue', help_text='blue, green, red, yellow, purple, orange, pink, teal', max_length=20, verbose_name='Kolor')),
                ('default_days_per_year', models.IntegerField(default=0, verbose_name='Domyślna liczba dni/rok')),
                ('is_active', models.BooleanField(default=True, verbose_name='Aktywny')),
                ('requires_balance', models.BooleanField(default=True, help_text='Jeśli False, można brać bez limitu dni', verbose_name='Wymaga salda')),
            ],
            options={
                'verbose_name': 'Rodzaj urlopu',
                'verbose_name_plural': 'Rodzaje urlopów',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='VacationTypeAllocation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('year', models.IntegerField(verbose_name='Rok')),
                ('allocated_days', models.IntegerField(default=0, verbose_name='Przyznane dni')),
                ('used_days', models.IntegerField(default=0, verbose_name='Wykorzystane dni')),
                ('employee', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='vacation_type_allocations', to=settings.AUTH_USER_MODEL, verbose_name='Pracownik')),
                ('vacation_type', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='allocations', to='hr.vacationtype', verbose_name='Rodzaj urlopu')),
            ],
            options={
                'verbose_name': 'Przydział rodzaju urlopu',
                'verbose_name_plural': 'Przydziały rodzajów urlopów',
                'unique_together': {('employee', 'vacation_type', 'year')},
            },
        ),
        migrations.AddField(
            model_name='vacationrequest',
            name='vacation_type',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='requests', to='hr.vacationtype', verbose_name='Rodzaj urlopu'),
        ),
    ]
