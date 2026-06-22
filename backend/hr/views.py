from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from datetime import timedelta
from .models import (
    VacationBalance, VacationRequest, VacationType, VacationTypeAllocation,
    WorkCalendar, RecurringHoliday, SingleHoliday, CalendarAssignment,
)
from .serializers import (
    VacationBalanceSerializer, VacationBalanceUpdateSerializer,
    VacationRequestSerializer, CreateVacationRequestSerializer, CarryOverSerializer,
    VacationTypeSerializer, VacationTypeAllocationSerializer,
    WorkCalendarSerializer, RecurringHolidaySerializer,
    SingleHolidaySerializer, CalendarAssignmentSerializer,
)
from accounts.permissions import IsHROrAdmin, IsManagerOrAbove


def count_workdays_with_calendar(employee, start_date, end_date):
    """Count working days between start_date and end_date (inclusive), excluding calendar holidays."""
    holiday_dates = set()
    for y in range(start_date.year, end_date.year + 1):
        assignment = CalendarAssignment.objects.filter(
            employee=employee,
            calendar__year=y,
            calendar__is_active=True,
        ).select_related('calendar').prefetch_related(
            'calendar__recurring_holidays', 'calendar__single_holidays'
        ).first()
        if assignment:
            holiday_dates |= assignment.calendar.get_holiday_dates()

    count = 0
    current = start_date
    while current <= end_date:
        if current.weekday() < 5 and current not in holiday_dates:
            count += 1
        current += timedelta(days=1)
    return count

User = get_user_model()


class VacationTypeListCreateView(generics.ListCreateAPIView):
    serializer_class = VacationTypeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = VacationType.objects.all()
        if self.request.query_params.get('active_only') == 'true':
            qs = qs.filter(is_active=True)
        return qs

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsHROrAdmin()]
        return [IsAuthenticated()]


class VacationTypeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = VacationType.objects.all()
    serializer_class = VacationTypeSerializer
    permission_classes = [IsHROrAdmin]


class VacationTypeAllocationListCreateView(generics.ListCreateAPIView):
    serializer_class = VacationTypeAllocationSerializer
    permission_classes = [IsHROrAdmin]

    def get_queryset(self):
        qs = VacationTypeAllocation.objects.select_related('employee', 'vacation_type')
        employee_id = self.request.query_params.get('employee')
        year = self.request.query_params.get('year')
        vtype = self.request.query_params.get('vacation_type')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if year:
            qs = qs.filter(year=year)
        if vtype:
            qs = qs.filter(vacation_type_id=vtype)
        return qs


class VacationTypeAllocationDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = VacationTypeAllocation.objects.all()
    serializer_class = VacationTypeAllocationSerializer
    permission_classes = [IsHROrAdmin]


class BulkVacationTypeAllocationView(APIView):
    permission_classes = [IsHROrAdmin]

    def post(self, request):
        employee_ids = request.data.get('employee_ids', [])
        vacation_type_id = request.data.get('vacation_type')
        year = request.data.get('year')
        allocated_days = request.data.get('allocated_days', 0)

        if not employee_ids:
            return Response({'detail': 'Wybierz co najmniej jednego pracownika.'}, status=400)
        if not vacation_type_id:
            return Response({'detail': 'Podaj rodzaj urlopu.'}, status=400)
        if year is None:
            return Response({'detail': 'Podaj rok.'}, status=400)

        vacation_type = generics.get_object_or_404(VacationType, pk=vacation_type_id)
        results = []
        for emp_id in employee_ids:
            emp = generics.get_object_or_404(User, pk=emp_id)
            alloc, created = VacationTypeAllocation.objects.get_or_create(
                employee=emp, vacation_type=vacation_type, year=int(year),
                defaults={'allocated_days': int(allocated_days)}
            )
            if not created:
                alloc.allocated_days = int(allocated_days)
                alloc.save(update_fields=['allocated_days'])
            results.append(VacationTypeAllocationSerializer(alloc).data)

        return Response({'updated': len(results), 'allocations': results})


class MyVacationTypeAllocationsView(generics.ListAPIView):
    serializer_class = VacationTypeAllocationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        year = int(self.request.query_params.get('year', timezone.now().year))
        return VacationTypeAllocation.objects.filter(
            employee=self.request.user, year=year
        ).select_related('vacation_type')


class VacationBalanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, employee_id):
        if not request.user.is_hr_or_admin and request.user.id != int(employee_id):
            return Response({'detail': 'Brak uprawnień.'}, status=403)

        year = int(request.query_params.get('year', timezone.now().year))
        employee = generics.get_object_or_404(User, pk=employee_id)
        balance = VacationBalance.get_or_create_for_year(employee, year)
        return Response(VacationBalanceSerializer(balance).data)

    def put(self, request, employee_id):
        if not request.user.is_hr_or_admin:
            return Response({'detail': 'Brak uprawnień.'}, status=403)

        year = int(request.data.get('year', timezone.now().year))
        employee = generics.get_object_or_404(User, pk=employee_id)
        balance = VacationBalance.get_or_create_for_year(employee, year)
        serializer = VacationBalanceUpdateSerializer(balance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(VacationBalanceSerializer(balance).data)


class AllBalancesView(generics.ListAPIView):
    serializer_class = VacationBalanceSerializer
    permission_classes = [IsHROrAdmin]

    def get_queryset(self):
        year = int(self.request.query_params.get('year', timezone.now().year))
        return VacationBalance.objects.filter(year=year).select_related('employee')


class CarryOverView(APIView):
    permission_classes = [IsHROrAdmin]

    def post(self, request):
        serializer = CarryOverSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        employee_ids = d.get('employee_ids')
        if employee_ids:
            employees = User.objects.filter(id__in=employee_ids, is_active=True)
        else:
            employees = User.objects.filter(is_active=True)

        results = []
        for emp in employees:
            balance = VacationBalance.carry_over_to_new_year(
                emp, d['from_year'], d['to_year'], d['new_allocation']
            )
            results.append(VacationBalanceSerializer(balance).data)

        return Response({'updated': len(results), 'balances': results})


class VacationRequestListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_hr_or_admin:
            qs = VacationRequest.objects.all()
        else:
            qs = VacationRequest.objects.filter(employee=user)

        employee_id = self.request.query_params.get('employee')
        status_filter = self.request.query_params.get('status')
        year = self.request.query_params.get('year')

        if employee_id and user.is_hr_or_admin:
            qs = qs.filter(employee_id=employee_id)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if year:
            qs = qs.filter(start_date__year=year)

        include_archived = self.request.query_params.get('include_archived', 'false')
        if include_archived.lower() != 'true':
            qs = qs.filter(is_archived=False)

        return qs.select_related('employee', 'approver', 'cancelled_by', 'created_by', 'vacation_type')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CreateVacationRequestSerializer
        return VacationRequestSerializer

    def create(self, request, *args, **kwargs):
        serializer = CreateVacationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        employee_id = d.get('employee')
        if employee_id and not request.user.is_hr_or_admin:
            if employee_id.id != request.user.id:
                return Response({'detail': 'Brak uprawnień.'}, status=403)

        employee = d.get('employee', request.user)
        if hasattr(employee, 'id'):
            emp = employee
        else:
            emp = request.user

        # Conflict check: block only if dates overlap with an already approved request
        conflict = VacationRequest.objects.filter(
            employee=emp,
            status=VacationRequest.STATUS_APPROVED,
            start_date__lte=d['end_date'],
            end_date__gte=d['start_date'],
        ).first()
        if conflict:
            return Response(
                {'detail': f'Daty pokrywają się z zatwierdzonym wnioskiem ({conflict.start_date.strftime("%d.%m.%Y")} – {conflict.end_date.strftime("%d.%m.%Y")}).'},
                status=400
            )

        request_type = d.get('request_type', VacationRequest.TYPE_VACATION)
        vacation_type_obj = d.get('vacation_type')
        year = d['start_date'].year

        # Recalculate days_count server-side using the employee's work calendar
        days_count = count_workdays_with_calendar(emp, d['start_date'], d['end_date'])
        if days_count < 1:
            return Response({'detail': 'Wybrany okres nie zawiera dni roboczych.'}, status=400)

        if vacation_type_obj:
            if vacation_type_obj.requires_balance:
                alloc, _ = VacationTypeAllocation.objects.get_or_create(
                    employee=emp, vacation_type=vacation_type_obj, year=year,
                    defaults={'allocated_days': vacation_type_obj.default_days_per_year}
                )
                if alloc.available_days < days_count:
                    return Response(
                        {'detail': f'Brak wystarczającej liczby dni ({vacation_type_obj.name}). Dostępne: {alloc.available_days}.'},
                        status=400
                    )
        elif request_type == VacationRequest.TYPE_REMOTE:
            balance = VacationBalance.get_or_create_for_year(emp, year)
            if balance.available_remote_days < days_count:
                return Response(
                    {'detail': f'Brak wystarczającej liczby dni zdalnych. Dostępne: {balance.available_remote_days}.'},
                    status=400
                )
        else:
            balance = VacationBalance.get_or_create_for_year(emp, year)
            if balance.available_days < days_count:
                return Response(
                    {'detail': f'Brak wystarczającej liczby dni urlopowych. Dostępne: {balance.available_days}.'},
                    status=400
                )

        vacation = VacationRequest.objects.create(
            employee=emp,
            start_date=d['start_date'],
            end_date=d['end_date'],
            days_count=days_count,
            reason=d.get('reason', ''),
            request_type=request_type,
            vacation_type=vacation_type_obj,
            created_by=request.user,
        )

        return Response(VacationRequestSerializer(vacation).data, status=201)


class PendingApprovalsView(generics.ListAPIView):
    serializer_class = VacationRequestSerializer
    permission_classes = [IsManagerOrAbove]

    def get_queryset(self):
        user = self.request.user
        if user.is_hr_or_admin:
            return VacationRequest.objects.filter(
                status=VacationRequest.STATUS_PENDING
            ).select_related('employee', 'created_by', 'vacation_type')

        subordinate_ids = list(
            User.objects.filter(manager=user).values_list('id', flat=True)
        )
        return VacationRequest.objects.filter(
            employee_id__in=subordinate_ids,
            status=VacationRequest.STATUS_PENDING,
        ).select_related('employee', 'created_by', 'vacation_type')


class ApproveVacationView(APIView):
    permission_classes = [IsManagerOrAbove]

    def put(self, request, pk):
        vacation = generics.get_object_or_404(VacationRequest, pk=pk)

        if vacation.status != VacationRequest.STATUS_PENDING:
            return Response({'detail': 'Wniosek nie oczekuje na akceptację.'}, status=400)

        if not request.user.is_hr_or_admin:
            subordinate_ids = list(
                User.objects.filter(manager=request.user).values_list('id', flat=True)
            )
            if vacation.employee_id not in subordinate_ids:
                return Response({'detail': 'Brak uprawnień do akceptacji tego wniosku.'}, status=403)

        year = vacation.start_date.year

        if vacation.vacation_type:
            if vacation.vacation_type.requires_balance:
                alloc, _ = VacationTypeAllocation.objects.get_or_create(
                    employee=vacation.employee, vacation_type=vacation.vacation_type, year=year,
                    defaults={'allocated_days': vacation.vacation_type.default_days_per_year}
                )
                alloc.used_days += vacation.days_count
                alloc.save(update_fields=['used_days'])
        elif vacation.request_type == VacationRequest.TYPE_REMOTE:
            balance = VacationBalance.get_or_create_for_year(vacation.employee, year)
            balance.remote_days_used += vacation.days_count
            balance.save(update_fields=['remote_days_used'])
        else:
            balance = VacationBalance.get_or_create_for_year(vacation.employee, year)
            balance.used_days += vacation.days_count
            balance.save(update_fields=['used_days'])

        vacation.status = VacationRequest.STATUS_APPROVED
        vacation.approver = request.user
        vacation.approved_at = timezone.now()
        vacation.notes = request.data.get('notes', vacation.notes)
        vacation.save()

        # Notify HR for settlement
        hr_emails = list(
            User.objects.filter(
                role__in=['hr', 'admin'], is_active=True
            ).exclude(email='').values_list('email', flat=True)
        )
        if hr_emails:
            type_label = vacation.vacation_type.name if vacation.vacation_type else (
                'Praca zdalna' if vacation.request_type == VacationRequest.TYPE_REMOTE else 'Urlop'
            )
            send_mail(
                subject=f'[Emplo] {type_label} do rozliczenia — {vacation.employee.get_full_name()}',
                message=(
                    f'Wniosek ({type_label}) pracownika {vacation.employee.get_full_name()} '
                    f'został zatwierdzony i wymaga rozliczenia.\n\n'
                    f'Okres: {vacation.start_date.strftime("%d.%m.%Y")} – {vacation.end_date.strftime("%d.%m.%Y")}\n'
                    f'Liczba dni: {vacation.days_count}\n'
                    f'Zatwierdził/a: {request.user.get_full_name() or request.user.username}\n\n'
                    f'Zaloguj się do systemu Emplo, aby dokonać rozliczenia.'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=hr_emails,
                fail_silently=True,
            )

        return Response(VacationRequestSerializer(vacation).data)


class RejectVacationView(APIView):
    permission_classes = [IsManagerOrAbove]

    def put(self, request, pk):
        vacation = generics.get_object_or_404(VacationRequest, pk=pk)

        if vacation.status != VacationRequest.STATUS_PENDING:
            return Response({'detail': 'Wniosek nie oczekuje na akceptację.'}, status=400)

        if not request.user.is_hr_or_admin:
            subordinate_ids = list(
                User.objects.filter(manager=request.user).values_list('id', flat=True)
            )
            if vacation.employee_id not in subordinate_ids:
                return Response({'detail': 'Brak uprawnień.'}, status=403)

        vacation.status = VacationRequest.STATUS_REJECTED
        vacation.approver = request.user
        vacation.approved_at = timezone.now()
        vacation.notes = request.data.get('notes', vacation.notes)
        vacation.save()

        return Response(VacationRequestSerializer(vacation).data)


class CancelVacationView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        vacation = generics.get_object_or_404(VacationRequest, pk=pk)

        if vacation.status not in (VacationRequest.STATUS_PENDING, VacationRequest.STATUS_APPROVED):
            return Response({'detail': 'Nie można anulować tego wniosku.'}, status=400)

        is_own = vacation.employee == request.user

        if vacation.status == VacationRequest.STATUS_APPROVED and not request.user.is_hr_or_admin:
            return Response(
                {'detail': 'Zatwierdzony urlop może anulować tylko kadry lub administrator.'},
                status=403
            )

        if not is_own and not request.user.is_hr_or_admin:
            return Response({'detail': 'Brak uprawnień.'}, status=403)

        if vacation.status == VacationRequest.STATUS_APPROVED:
            year = vacation.start_date.year
            if vacation.vacation_type:
                if vacation.vacation_type.requires_balance:
                    alloc = VacationTypeAllocation.objects.filter(
                        employee=vacation.employee, vacation_type=vacation.vacation_type, year=year
                    ).first()
                    if alloc:
                        alloc.used_days = max(0, alloc.used_days - vacation.days_count)
                        alloc.save(update_fields=['used_days'])
            elif vacation.request_type == VacationRequest.TYPE_REMOTE:
                balance = VacationBalance.get_or_create_for_year(vacation.employee, year)
                balance.remote_days_used = max(0, balance.remote_days_used - vacation.days_count)
                balance.save(update_fields=['remote_days_used'])
            else:
                balance = VacationBalance.get_or_create_for_year(vacation.employee, year)
                balance.used_days = max(0, balance.used_days - vacation.days_count)
                balance.save(update_fields=['used_days'])

        vacation.status = VacationRequest.STATUS_CANCELLED
        vacation.cancelled_by = request.user
        vacation.cancelled_at = timezone.now()
        vacation.save()

        return Response(VacationRequestSerializer(vacation).data)


# ── Work Calendars ────────────────────────────────────────────────────────────

class WorkCalendarListCreateView(generics.ListCreateAPIView):
    serializer_class = WorkCalendarSerializer
    permission_classes = [IsHROrAdmin]

    def get_queryset(self):
        qs = WorkCalendar.objects.prefetch_related(
            'recurring_holidays', 'single_holidays', 'assignments__employee'
        )
        year = self.request.query_params.get('year')
        if year:
            qs = qs.filter(year=year)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class WorkCalendarDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = WorkCalendarSerializer
    permission_classes = [IsHROrAdmin]

    def get_queryset(self):
        return WorkCalendar.objects.prefetch_related(
            'recurring_holidays', 'single_holidays', 'assignments__employee'
        )


class CalendarRecurringHolidayView(APIView):
    permission_classes = [IsHROrAdmin]

    def post(self, request, calendar_pk):
        calendar = generics.get_object_or_404(WorkCalendar, pk=calendar_pk)
        serializer = RecurringHolidaySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(calendar=calendar)
        return Response(serializer.data, status=201)


class RecurringHolidayDeleteView(generics.DestroyAPIView):
    queryset = RecurringHoliday.objects.all()
    permission_classes = [IsHROrAdmin]


class CalendarSingleHolidayView(APIView):
    permission_classes = [IsHROrAdmin]

    def post(self, request, calendar_pk):
        calendar = generics.get_object_or_404(WorkCalendar, pk=calendar_pk)
        serializer = SingleHolidaySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(calendar=calendar)
        return Response(serializer.data, status=201)


class SingleHolidayDeleteView(generics.DestroyAPIView):
    queryset = SingleHoliday.objects.all()
    permission_classes = [IsHROrAdmin]


class CalendarAssignView(APIView):
    permission_classes = [IsHROrAdmin]

    def post(self, request, calendar_pk):
        calendar = generics.get_object_or_404(WorkCalendar, pk=calendar_pk)
        employee_ids = request.data.get('employee_ids', [])
        created_assignments = []
        for emp_id in employee_ids:
            emp = generics.get_object_or_404(User, pk=emp_id)
            obj, created = CalendarAssignment.objects.get_or_create(
                calendar=calendar, employee=emp
            )
            if created:
                created_assignments.append(CalendarAssignmentSerializer(obj).data)
        return Response({'assigned': len(created_assignments), 'assignments': created_assignments})


class CalendarAssignmentDeleteView(generics.DestroyAPIView):
    queryset = CalendarAssignment.objects.all()
    permission_classes = [IsHROrAdmin]


class EmployeeCalendarHolidaysView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        year = int(request.query_params.get('year', timezone.now().year))
        employee_id = request.query_params.get('employee', request.user.id)

        if str(employee_id) != str(request.user.id) and not request.user.is_hr_or_admin:
            return Response({'detail': 'Brak uprawnień.'}, status=403)

        assignment = CalendarAssignment.objects.filter(
            employee_id=employee_id,
            calendar__year=year,
            calendar__is_active=True,
        ).select_related('calendar').prefetch_related(
            'calendar__recurring_holidays', 'calendar__single_holidays'
        ).first()

        if not assignment:
            return Response({'holidays': [], 'calendar_name': None})

        from datetime import date as date_type
        calendar = assignment.calendar
        holidays = []
        for h in calendar.recurring_holidays.all():
            try:
                d = date_type(year, h.month, h.day)
                holidays.append({'date': str(d), 'name': h.name, 'type': 'recurring'})
            except ValueError:
                pass
        for h in calendar.single_holidays.all():
            holidays.append({'date': str(h.date), 'name': h.name, 'type': 'single'})

        return Response({'holidays': holidays, 'calendar_name': calendar.name})


class ArchivePreviousYearView(APIView):
    permission_classes = [IsHROrAdmin]

    def post(self, request):
        from datetime import date as date_type
        year = request.data.get('year', date_type.today().year - 1)
        month = request.data.get('month')
        qs = VacationRequest.objects.filter(start_date__year=year, is_archived=False)
        if month:
            qs = qs.filter(start_date__month=int(month))
        updated = qs.update(is_archived=True)
        return Response({'archived': updated, 'year': year, 'month': month})


class VacationBalanceAdjustView(APIView):
    permission_classes = [IsHROrAdmin]

    def post(self, request, employee_id):
        from datetime import date as date_type
        year = int(request.data.get('year', date_type.today().year))
        field = request.data.get('field', 'vacation')
        days = int(request.data.get('days', 0))
        action = request.data.get('action', 'add')

        emp = generics.get_object_or_404(User, pk=employee_id)
        balance = VacationBalance.get_or_create_for_year(emp, year)

        if field == 'remote':
            delta = days if action == 'add' else -days
            balance.remote_days_allocated = max(0, balance.remote_days_allocated + delta)
            balance.save(update_fields=['remote_days_allocated'])
        else:
            delta = days if action == 'add' else -days
            balance.allocated_days = max(0, balance.allocated_days + delta)
            balance.save(update_fields=['allocated_days'])

        return Response(VacationBalanceSerializer(balance).data)
