from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, Department, Position, CustomRole, Company, Region, Contract


class CompanySerializer(serializers.ModelSerializer):
    employees_count = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = ['id', 'name', 'address', 'employees_count']

    def get_employees_count(self, obj):
        return obj.employees.filter(is_active=True).count()


class RegionSerializer(serializers.ModelSerializer):
    employees_count = serializers.SerializerMethodField()

    class Meta:
        model = Region
        fields = ['id', 'name', 'address', 'employees_count']

    def get_employees_count(self, obj):
        return obj.employees.filter(is_active=True).count()


class ContractSerializer(serializers.ModelSerializer):
    contract_type_display = serializers.CharField(source='get_contract_type_display', read_only=True)

    class Meta:
        model = Contract
        fields = ['id', 'employee', 'contract_type', 'contract_type_display',
                  'start_date', 'end_date', 'position', 'notes', 'created_at']
        read_only_fields = ['employee', 'created_at']


class DepartmentSerializer(serializers.ModelSerializer):
    children_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ['id', 'name', 'parent', 'children_count']

    def get_children_count(self, obj):
        return obj.children.count()


class DepartmentTreeSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ['id', 'name', 'parent', 'children']

    def get_children(self, obj):
        return DepartmentTreeSerializer(obj.children.all(), many=True).data


class PositionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Position
        fields = ['id', 'name', 'description', 'is_active']


class CustomRoleSerializer(serializers.ModelSerializer):
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = CustomRole
        fields = [
            'id', 'name', 'description', 'color', 'user_count',
            'can_view_employees', 'can_edit_employees',
            'can_manage_questionnaires', 'can_manage_tests',
            'can_approve_vacations', 'can_manage_balances',
            'can_cancel_approved_vacations', 'can_manage_structure',
            'can_view_all_requests',
            'can_upload_documents', 'can_view_documents',
            'can_post_news', 'can_manage_contracts',
        ]

    def get_user_count(self, obj):
        return obj.users.count()


class UserListSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    manager_name = serializers.SerializerMethodField()
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    custom_role_name = serializers.CharField(source='custom_role.name', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    region_name = serializers.CharField(source='region.name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email',
            'role', 'role_display', 'custom_role', 'custom_role_name',
            'department', 'department_name',
            'company', 'company_name', 'region', 'region_name',
            'manager', 'manager_name', 'position', 'phone',
            'hire_date', 'is_active', 'termination_date',
            'contract_end', 'medical_exam_next_date', 'bhp_next_date',
        ]

    def get_manager_name(self, obj):
        if obj.manager:
            return obj.manager.get_full_name() or obj.manager.username
        return None


class UserDetailSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    manager_name = serializers.SerializerMethodField()
    substitute_manager_name = serializers.SerializerMethodField()
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    custom_role_name = serializers.CharField(source='custom_role.name', read_only=True)
    contract_type_display = serializers.CharField(source='get_contract_type_display', read_only=True)
    medical_exam_type_display = serializers.CharField(source='get_medical_exam_type_display', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    region_name = serializers.CharField(source='region.name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email',
            'role', 'role_display', 'custom_role', 'custom_role_name',
            'department', 'department_name',
            'company', 'company_name', 'region', 'region_name',
            'manager', 'manager_name', 'substitute_manager', 'substitute_manager_name',
            'position', 'phone', 'hire_date', 'is_active', 'termination_date', 'date_joined',
            'contract_type', 'contract_type_display', 'contract_start', 'contract_end',
            'medical_exam_type', 'medical_exam_type_display', 'medical_exam_next_date',
            'bhp_date', 'bhp_next_date',
        ]

    def get_manager_name(self, obj):
        if obj.manager:
            return obj.manager.get_full_name() or obj.manager.username
        return None

    def get_substitute_manager_name(self, obj):
        if obj.substitute_manager:
            return obj.substitute_manager.get_full_name() or obj.substitute_manager.username
        return None


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=6)

    class Meta:
        model = User
        fields = [
            'username', 'first_name', 'last_name', 'email', 'password',
            'role', 'custom_role', 'department', 'manager', 'substitute_manager',
            'company', 'region',
            'position', 'phone', 'hire_date', 'is_active', 'termination_date',
            'contract_type', 'contract_start', 'contract_end',
            'medical_exam_type', 'medical_exam_next_date',
            'bhp_date', 'bhp_next_date',
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'email',
            'role', 'custom_role', 'department', 'manager', 'substitute_manager',
            'company', 'region',
            'position', 'phone', 'hire_date', 'is_active', 'termination_date',
            'contract_type', 'contract_start', 'contract_end',
            'medical_exam_type', 'medical_exam_next_date',
            'bhp_date', 'bhp_next_date',
        ]


class SetPasswordSerializer(serializers.Serializer):
    password = serializers.CharField(min_length=6)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserDetailSerializer(self.user).data
        return data
