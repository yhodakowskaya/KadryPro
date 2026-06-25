import os
from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import User, Department
from hr.models import VacationBalance


class Command(BaseCommand):
    help = 'Create initial data'

    def handle(self, *args, **kwargs):
        dept_hr, _ = Department.objects.get_or_create(name='Kadry i HR')
        dept_it, _ = Department.objects.get_or_create(name='IT')
        dept_prod, _ = Department.objects.get_or_create(name='Produkcja')
        dept_admin, _ = Department.objects.get_or_create(name='Administracja')

        year = timezone.now().year

        reset_pwd = os.environ.get('RESET_ADMIN_PASSWORD', '')

        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser(
                username='admin', email='admin@respektpersonal.pl',
                password='Admin1234!', first_name='Administrator',
                last_name='Systemu', role=User.ROLE_ADMIN,
            )
            self.stdout.write('[OK] admin / Admin1234!')
        elif reset_pwd:
            admin = User.objects.get(username='admin')
            admin.set_password(reset_pwd)
            admin.save()
            self.stdout.write(f'[OK] Hasło admina zresetowane przez RESET_ADMIN_PASSWORD')

        hr_user, created = User.objects.get_or_create(username='kadry', defaults={
            'email': 'kadry@respektpersonal.pl', 'first_name': 'Anna',
            'last_name': 'Kowalska', 'role': User.ROLE_HR,
            'department': dept_hr, 'position': 'Specjalista ds. kadr',
        })
        if created:
            hr_user.set_password('Kadry1234!')
            hr_user.save()
            self.stdout.write('[OK] kadry / Kadry1234!')

        manager, created = User.objects.get_or_create(username='kierownik', defaults={
            'email': 'kierownik@respektpersonal.pl', 'first_name': 'Jan',
            'last_name': 'Nowak', 'role': User.ROLE_MANAGER,
            'department': dept_it, 'position': 'Kierownik IT',
        })
        if created:
            manager.set_password('Manager1234!')
            manager.save()
            self.stdout.write('[OK] kierownik / Manager1234!')

        emp, created = User.objects.get_or_create(username='pracownik', defaults={
            'email': 'pracownik@respektpersonal.pl', 'first_name': 'Piotr',
            'last_name': 'Wiśniewski', 'role': User.ROLE_EMPLOYEE,
            'department': dept_it, 'position': 'Programista', 'manager': manager,
        })
        if created:
            emp.set_password('Pracownik1234!')
            emp.save()
            self.stdout.write('[OK] pracownik / Pracownik1234!')

        for user in [hr_user, manager, emp]:
            VacationBalance.objects.get_or_create(
                employee=user, year=year,
                defaults={'allocated_days': 26, 'carried_over': 5, 'remote_days_allocated': 60},
            )

        self.stdout.write(self.style.SUCCESS('Gotowe!'))
