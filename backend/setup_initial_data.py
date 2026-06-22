"""
Uruchom: python setup_initial_data.py
Tworzy: konto admin, szablony kwestionariuszy, przykładowych pracowników
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'emplo_project.settings')
django.setup()

from accounts.models import User, Department
from questionnaire.models import QuestionnaireTemplate
from questionnaire.default_templates import PRACOWNIK_FIELDS, ZLECENIOBIORCA_FIELDS
from hr.models import VacationBalance
from django.utils import timezone


def create_admin():
    if not User.objects.filter(username='admin').exists():
        admin = User.objects.create_superuser(
            username='admin',
            email='admin@respektpersonal.pl',
            password='Admin1234!',
            first_name='Administrator',
            last_name='Systemu',
            role=User.ROLE_ADMIN,
        )
        print(f'[OK] Admin: admin / Admin1234!')
    else:
        print('Admin już istnieje')


def create_departments():
    dept_hr, _ = Department.objects.get_or_create(name='Kadry i HR')
    dept_it, _ = Department.objects.get_or_create(name='IT')
    dept_prod, _ = Department.objects.get_or_create(name='Produkcja')
    dept_admin, _ = Department.objects.get_or_create(name='Administracja')
    print('[OK] Działy utworzone')
    return dept_hr, dept_it, dept_prod, dept_admin


def create_users(dept_hr, dept_it, dept_prod, dept_admin):
    year = timezone.now().year

    hr_user, created = User.objects.get_or_create(
        username='kadry',
        defaults={
            'email': 'kadry@respektpersonal.pl',
            'first_name': 'Anna',
            'last_name': 'Kowalska',
            'role': User.ROLE_HR,
            'department': dept_hr,
            'position': 'Specjalista ds. kadr',
            'phone': '+48 123 456 789',
        }
    )
    if created:
        hr_user.set_password('Kadry1234!')
        hr_user.save()
        print('[OK] Kadry: kadry / Kadry1234!')

    manager, created = User.objects.get_or_create(
        username='kierownik',
        defaults={
            'email': 'kierownik@respektpersonal.pl',
            'first_name': 'Jan',
            'last_name': 'Nowak',
            'role': User.ROLE_MANAGER,
            'department': dept_it,
            'position': 'Kierownik IT',
            'phone': '+48 987 654 321',
        }
    )
    if created:
        manager.set_password('Manager1234!')
        manager.save()
        print('[OK] Manager: kierownik / Manager1234!')

    emp, created = User.objects.get_or_create(
        username='pracownik',
        defaults={
            'email': 'pracownik@respektpersonal.pl',
            'first_name': 'Piotr',
            'last_name': 'Wiśniewski',
            'role': User.ROLE_EMPLOYEE,
            'department': dept_it,
            'position': 'Programista',
            'manager': manager,
        }
    )
    if created:
        emp.set_password('Pracownik1234!')
        emp.save()
        print('[OK] Pracownik: pracownik / Pracownik1234!')

    for user in [hr_user, manager, emp]:
        VacationBalance.objects.get_or_create(
            employee=user, year=year,
            defaults={
                'allocated_days': 26,
                'carried_over': 5,
                'remote_days_allocated': 60,
            }
        )
    print('[OK] Bilanse urlopowe utworzone')


def create_templates():
    admin = User.objects.filter(role=User.ROLE_ADMIN).first()

    if not QuestionnaireTemplate.objects.filter(type='pracownik').exists():
        QuestionnaireTemplate.objects.create(
            name='Kwestionariusz osobowy dla pracownika (UoP)',
            type='pracownik',
            fields_schema=PRACOWNIK_FIELDS,
            created_by=admin,
        )
        print('[OK] Szablon: Kwestionariusz pracownika')

    if not QuestionnaireTemplate.objects.filter(type='zleceniobiorca_cudzoziemiec').exists():
        QuestionnaireTemplate.objects.create(
            name='Kwestionariusz osobowy dla zleceniobiorcy - cudzoziemca',
            type='zleceniobiorca_cudzoziemiec',
            fields_schema=ZLECENIOBIORCA_FIELDS,
            created_by=admin,
        )
        print('[OK] Szablon: Kwestionariusz zleceniobiorcy cudzoziemca')


if __name__ == '__main__':
    print('\n=== Inicjalizacja danych systemu HR ===\n')
    create_admin()
    depts = create_departments()
    create_users(*depts)
    create_templates()
    print('\n[OK] Gotowe! Zaloguj się na: http://localhost:5173')
    print('  Admin:    admin / Admin1234!')
    print('  Kadry:    kadry / Kadry1234!')
    print('  Manager:  kierownik / Manager1234!')
    print('  Pracownik: pracownik / Pracownik1234!\n')
