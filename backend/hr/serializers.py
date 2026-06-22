from rest_framework import serializers
from .models import (
    VacationBalance, VacationRequest, VacationType, VacationTypeAllocation,
    WorkCalendar, RecurringHoliday, SingleHoliday, CalendarAssignment,
)
from django.contrib.auth import get_user_model

User = get_user_model()


class VacationTypeSerializer(serializers.ModelSerializer):
    allocations_count = serializers.SerializerMethodField()

    class Meta:
        model = VacationType
        fields = ['id', 'name', 'color', 'default_days_per_year', 'is_active', 'requires_balance', 'allocations_count']

    def get_allocations_count(self, obj):
        return obj.allocations.count()


class VacationTypeAllocationSerializer(serializers.ModelSerializer):
    vacation_type_name = serializers.CharField(source='vacation_type.name', read_only=True)
    vacation_type_color = serializers.CharField(source='vacation_type.color', read_only=True)
    employee_name = serializers.SerializerMethodField()
    available_days = serializers.IntegerField(read_only=True)

    class Meta:
        model = VacationTypeAllocation
        fields = [
            'id', 'employee', 'employee_name', 'vacation_type', 'vacation_type_name',
            'vacation_type_color', 'year', 'allocated_days', 'used_days', 'available_days',
        ]
        read_only_fields = ['used_days']

    def get_employee_name(self, obj):
        return obj.employee.get_full_name() or obj.employee.username


class VacationBalanceSerializer(serializers.ModelSerializer):
    available_days = serializers.IntegerField(read_only=True)
    available_remote_days = serializers.IntegerField(read_only=True)
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = VacationBalance
        fields = [
            'id', 'employee', 'employee_name', 'year',
            'allocated_days', 'carried_over', 'used_days', 'available_days',
            'remote_days_allocated', 'remote_days_used', 'available_remote_days',
        ]
        read_only_fields = ['employee', 'used_days', 'carried_over']

    def get_employee_name(self, obj):
        return obj.employee.get_full_name() or obj.employee.username


class VacationBalanceUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = VacationBalance
        fields = ['allocated_days', 'carried_over', 'remote_days_allocated']


class VacationRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    approver_name = serializers.SerializerMethodField()
    cancelled_by_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    vacation_type_name = serializers.CharField(source='vacation_type.name', read_only=True)
    vacation_type_color = serializers.CharField(source='vacation_type.color', read_only=True)

    class Meta:
        model = VacationRequest
        fields = [
            'id', 'employee', 'employee_name', 'start_date', 'end_date',
            'days_count', 'reason', 'status', 'status_display',
            'request_type', 'vacation_type', 'vacation_type_name', 'vacation_type_color',
            'created_at', 'created_by', 'created_by_name',
            'approver', 'approver_name', 'approved_at',
            'cancelled_by', 'cancelled_by_name', 'cancelled_at', 'notes',
        ]
        read_only_fields = [
            'status', 'created_at', 'approver', 'approved_at',
            'cancelled_by', 'cancelled_at',
        ]

    def get_employee_name(self, obj):
        return obj.employee.get_full_name() or obj.employee.username

    def get_approver_name(self, obj):
        if obj.approver:
            return obj.approver.get_full_name() or obj.approver.username
        return None

    def get_cancelled_by_name(self, obj):
        if obj.cancelled_by:
            return obj.cancelled_by.get_full_name() or obj.cancelled_by.username
        return None

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None


class CreateVacationRequestSerializer(serializers.ModelSerializer):
    employee = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False, allow_null=True
    )
    vacation_type = serializers.PrimaryKeyRelatedField(
        queryset=VacationType.objects.all(),
        required=False, allow_null=True
    )

    class Meta:
        model = VacationRequest
        fields = ['employee', 'start_date', 'end_date', 'days_count', 'reason', 'request_type', 'vacation_type']

    def validate(self, data):
        if data['start_date'] > data['end_date']:
            raise serializers.ValidationError(
                'Data początku nie może być późniejsza niż data końca.'
            )
        if data['days_count'] < 1:
            raise serializers.ValidationError('Liczba dni musi być co najmniej 1.')
        return data


class RecurringHolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = RecurringHoliday
        fields = ['id', 'name', 'month', 'day']


class SingleHolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = SingleHoliday
        fields = ['id', 'name', 'date']


class CalendarAssignmentSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = CalendarAssignment
        fields = ['id', 'employee', 'employee_name']

    def get_employee_name(self, obj):
        return obj.employee.get_full_name() or obj.employee.username


class WorkCalendarSerializer(serializers.ModelSerializer):
    recurring_holidays = RecurringHolidaySerializer(many=True, read_only=True)
    single_holidays = SingleHolidaySerializer(many=True, read_only=True)
    assignments = CalendarAssignmentSerializer(many=True, read_only=True)
    employee_count = serializers.SerializerMethodField()

    class Meta:
        model = WorkCalendar
        fields = ['id', 'name', 'year', 'is_active', 'employee_count',
                  'recurring_holidays', 'single_holidays', 'assignments']

    def get_employee_count(self, obj):
        return obj.assignments.count()


class CarryOverSerializer(serializers.Serializer):
    employee_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False,
        help_text='Lista ID pracowników (puste = wszyscy aktywni)'
    )
    from_year = serializers.IntegerField()
    to_year = serializers.IntegerField()
    new_allocation = serializers.IntegerField(min_value=0)
