from rest_framework.permissions import BasePermission


class IsHROrAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role in ('hr', 'admin'):
            return True
        # custom role with edit_employees grants HR-like access to employee management
        if request.user.custom_role and request.user.custom_role.can_edit_employees:
            return True
        return False


class IsAdminOnly(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsManagerOrAbove(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role in ('hr', 'admin', 'manager'):
            return True
        if request.user.custom_role and request.user.custom_role.can_approve_vacations:
            return True
        return False


class CanManageQuestionnaires(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role in ('hr', 'admin'):
            return True
        if request.user.custom_role and request.user.custom_role.can_manage_questionnaires:
            return True
        return False
