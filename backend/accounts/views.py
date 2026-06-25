from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from django.db.models import Q
from django.core.management import call_command
from io import StringIO
from datetime import date
from .models import User, Department, Position, CustomRole
from .serializers import (
    CustomTokenObtainPairSerializer, UserListSerializer, UserDetailSerializer,
    UserCreateSerializer, UserUpdateSerializer, SetPasswordSerializer,
    DepartmentSerializer, DepartmentTreeSerializer,
    PositionSerializer, CustomRoleSerializer,
)
from .permissions import IsHROrAdmin, IsAdminOnly


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserDetailSerializer(request.user).data)

    def put(self, request):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserDetailSerializer(request.user).data)


class UserListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = User.objects.select_related('department', 'manager', 'custom_role').all()
        role = self.request.query_params.get('role')
        dept = self.request.query_params.get('department')
        search = self.request.query_params.get('search')
        is_active = self.request.query_params.get('is_active')

        if role:
            qs = qs.filter(role=role)
        if dept:
            qs = qs.filter(department_id=dept)
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) | Q(last_name__icontains=search) |
                Q(email__icontains=search) | Q(position__icontains=search)
            )
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        return qs

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserListSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsHROrAdmin()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserDetailSerializer(user).data, status=status.HTTP_201_CREATED)


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.select_related('department', 'manager', 'substitute_manager', 'custom_role').all()

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UserUpdateSerializer
        return UserDetailSerializer

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [IsHROrAdmin()]
        return [IsAuthenticated()]

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = UserUpdateSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserDetailSerializer(instance).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance == request.user:
            return Response({'detail': 'Nie możesz usunąć własnego konta.'}, status=400)
        instance.is_active = False
        if not instance.termination_date:
            instance.termination_date = date.today()
        instance.save(update_fields=['is_active', 'termination_date'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserRestoreView(APIView):
    permission_classes = [IsAdminOnly]

    def post(self, request, pk):
        user = generics.get_object_or_404(User, pk=pk)
        user.is_active = True
        user.termination_date = None
        user.save(update_fields=['is_active', 'termination_date'])
        return Response(UserDetailSerializer(user).data)


class SetPasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        target = generics.get_object_or_404(User, pk=pk)
        if request.user.pk != target.pk and request.user.role != User.ROLE_ADMIN:
            return Response({'detail': 'Brak uprawnień do zmiany hasła innego użytkownika.'}, status=403)
        serializer = SetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target.set_password(serializer.validated_data['password'])
        target.save()
        return Response({'detail': 'Hasło zostało zmienione.'})


# ── Departments ──────────────────────────────────────────────────────────────

class DepartmentListCreateView(generics.ListCreateAPIView):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsHROrAdmin()]
        return [IsAuthenticated()]


class DepartmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsHROrAdmin]


class DepartmentTreeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        roots = Department.objects.filter(parent=None)
        return Response(DepartmentTreeSerializer(roots, many=True).data)


# ── Positions ─────────────────────────────────────────────────────────────────

class PositionListCreateView(generics.ListCreateAPIView):
    serializer_class = PositionSerializer

    def get_queryset(self):
        qs = Position.objects.all()
        if self.request.query_params.get('active_only') == 'true':
            qs = qs.filter(is_active=True)
        return qs

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsHROrAdmin()]
        return [IsAuthenticated()]


class PositionDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Position.objects.all()
    serializer_class = PositionSerializer
    permission_classes = [IsHROrAdmin]


# ── Custom Roles ──────────────────────────────────────────────────────────────

class CustomRoleListCreateView(generics.ListCreateAPIView):
    queryset = CustomRole.objects.all()
    serializer_class = CustomRoleSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminOnly()]
        return [IsHROrAdmin()]


class CustomRoleDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = CustomRole.objects.all()
    serializer_class = CustomRoleSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsHROrAdmin()]
        return [IsAdminOnly()]


# ── Notifications ─────────────────────────────────────────────────────────────

class TriggerNotificationsView(APIView):
    permission_classes = [IsHROrAdmin]

    def post(self, request):
        out = StringIO()
        call_command('check_notifications', stdout=out)
        return Response({'detail': out.getvalue() or 'Sprawdzono powiadomienia.'})


# ── Org Chart ─────────────────────────────────────────────────────────────────

class OrgChartView(APIView):
    permission_classes = [IsAuthenticated]

    ROLE_DISPLAY = {
        'admin': 'Administrator',
        'hr': 'Kadry/HR',
        'manager': 'Kierownik',
        'employee': 'Pracownik',
    }

    def get(self, request):
        from hr.models import VacationRequest
        from datetime import date

        today = date.today()
        active_vacations = {
            v['employee_id']: v
            for v in VacationRequest.objects.filter(
                status=VacationRequest.STATUS_APPROVED,
                start_date__lte=today,
                end_date__gte=today,
            ).values('employee_id', 'start_date', 'end_date', 'request_type',
                     'vacation_type__name', 'vacation_type__color')
        }

        users_qs = User.objects.filter(is_active=True).select_related(
            'department', 'manager', 'custom_role'
        ).values(
            'id', 'first_name', 'last_name', 'position', 'role',
            'department__name', 'manager_id', 'custom_role__name', 'custom_role__color'
        )

        result = []
        for u in users_qs:
            row = dict(u)
            row['role_display'] = self.ROLE_DISPLAY.get(u['role'], u['role'])
            vac = active_vacations.get(u['id'])
            if vac:
                row['on_vacation'] = True
                row['vacation_start'] = vac['start_date'].strftime('%d.%m.%Y')
                row['vacation_end'] = vac['end_date'].strftime('%d.%m.%Y')
                row['vacation_type_name'] = vac.get('vacation_type__name') or (
                    'Praca zdalna' if vac['request_type'] == 'remote' else 'Urlop'
                )
                row['vacation_type_color'] = vac.get('vacation_type__color') or (
                    'purple' if vac['request_type'] == 'remote' else 'amber'
                )
            else:
                row['on_vacation'] = False
                row['vacation_type_name'] = None
                row['vacation_type_color'] = None
            result.append(row)

        return Response(result)


# ── Excel Import ──────────────────────────────────────────────────────────────

class DepartmentImportView(APIView):
    permission_classes = [IsHROrAdmin]

    def post(self, request):
        import openpyxl
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'Nie przesłano pliku.'}, status=400)
        try:
            wb = openpyxl.load_workbook(file)
            ws = wb.active
        except Exception:
            return Response({'detail': 'Nieprawidłowy plik Excel.'}, status=400)

        created, skipped = 0, 0
        for row in ws.iter_rows(min_row=2, values_only=True):
            name = str(row[0]).strip() if row[0] else ''
            if not name or name == 'None':
                continue
            _, was_created = Department.objects.get_or_create(name=name)
            if was_created:
                created += 1
            else:
                skipped += 1

        return Response({'created': created, 'skipped': skipped})


class PositionImportView(APIView):
    permission_classes = [IsHROrAdmin]

    def post(self, request):
        import openpyxl
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'Nie przesłano pliku.'}, status=400)
        try:
            wb = openpyxl.load_workbook(file)
            ws = wb.active
        except Exception:
            return Response({'detail': 'Nieprawidłowy plik Excel.'}, status=400)

        created, skipped = 0, 0
        for row in ws.iter_rows(min_row=2, values_only=True):
            name = str(row[0]).strip() if row[0] else ''
            if not name or name == 'None':
                continue
            _, was_created = Position.objects.get_or_create(name=name)
            if was_created:
                created += 1
            else:
                skipped += 1

        return Response({'created': created, 'skipped': skipped})
