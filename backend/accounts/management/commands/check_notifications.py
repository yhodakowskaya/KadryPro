from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Wyślij powiadomienia email o kończących się umowach i badaniach lekarskich'

    def handle(self, *args, **options):
        today = timezone.now().date()
        in_30_days = today + timedelta(days=30)

        hr_emails = list(
            User.objects.filter(
                role__in=['hr', 'admin'], is_active=True
            ).exclude(email='').values_list('email', flat=True)
        )

        if not hr_emails:
            self.stdout.write(self.style.WARNING('Brak adresów email dla kadry/admina.'))
            return

        sent = 0

        # Expiring contracts (contract_end in next 30 days)
        expiring = User.objects.filter(
            contract_end__gte=today,
            contract_end__lte=in_30_days,
            is_active=True,
        ).exclude(contract_end=None)

        for emp in expiring:
            days_left = (emp.contract_end - today).days
            subject = f'[Emplo] Koniec umowy za {days_left} dni — {emp.get_full_name()}'
            message = (
                f'Uwaga,\n\n'
                f'Umowa pracownika {emp.get_full_name()} ({emp.position or emp.username}) '
                f'kończy się dnia {emp.contract_end.strftime("%d.%m.%Y")} '
                f'(za {days_left} {"dzień" if days_left == 1 else "dni"}).\n\n'
                f'Typ umowy: {emp.get_contract_type_display() or "—"}\n'
                f'Umowa od: {emp.contract_start.strftime("%d.%m.%Y") if emp.contract_start else "—"}\n\n'
                f'Zaloguj się do systemu Emplo, aby zaktualizować dane.\n'
            )
            try:
                send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, hr_emails, fail_silently=True)
                sent += 1
                self.stdout.write(f'  Koniec umowy: {emp.get_full_name()} ({emp.contract_end})')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  Błąd wysyłki: {e}'))

        # Upcoming medical exams
        exams_due = User.objects.filter(
            medical_exam_next_date__gte=today,
            medical_exam_next_date__lte=in_30_days,
            is_active=True,
        ).exclude(medical_exam_next_date=None)

        for emp in exams_due:
            days_left = (emp.medical_exam_next_date - today).days
            subject = f'[Emplo] Badanie lekarskie za {days_left} dni — {emp.get_full_name()}'
            message = (
                f'Uwaga,\n\n'
                f'Pracownik {emp.get_full_name()} ({emp.position or emp.username}) '
                f'powinien wykonać badanie lekarskie do {emp.medical_exam_next_date.strftime("%d.%m.%Y")} '
                f'(za {days_left} {"dzień" if days_left == 1 else "dni"}).\n\n'
                f'Typ badania: {emp.get_medical_exam_type_display() or "—"}\n\n'
                f'Zaloguj się do systemu Emplo, aby zaktualizować dane.\n'
            )
            try:
                send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, hr_emails, fail_silently=True)
                sent += 1
                self.stdout.write(f'  Badanie: {emp.get_full_name()} ({emp.medical_exam_next_date})')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  Błąd wysyłki: {e}'))

        # Upcoming BHP training
        bhp_due = User.objects.filter(
            bhp_next_date__gte=today,
            bhp_next_date__lte=in_30_days,
            is_active=True,
        ).exclude(bhp_next_date=None)

        for emp in bhp_due:
            days_left = (emp.bhp_next_date - today).days
            subject = f'[Emplo] Szkolenie BHP za {days_left} dni — {emp.get_full_name()}'
            message = (
                f'Uwaga,\n\n'
                f'Pracownik {emp.get_full_name()} ({emp.position or emp.username}) '
                f'powinien odbyć szkolenie BHP do {emp.bhp_next_date.strftime("%d.%m.%Y")} '
                f'(za {days_left} {"dzień" if days_left == 1 else "dni"}).\n\n'
                f'Zaloguj się do systemu Emplo, aby zaktualizować dane.\n'
            )
            try:
                send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, hr_emails, fail_silently=True)
                sent += 1
                self.stdout.write(f'  BHP: {emp.get_full_name()} ({emp.bhp_next_date})')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  Błąd wysyłki: {e}'))

        self.stdout.write(self.style.SUCCESS(
            f'Wysłano {sent} powiadomień do: {", ".join(hr_emails)}'
            if sent else 'Brak nadchodzących terminów wymagających powiadomień.'
        ))
