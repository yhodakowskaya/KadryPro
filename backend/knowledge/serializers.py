from django.db.models import Q
from django.contrib.auth import get_user_model
from rest_framework import serializers
from accounts.models import Department
from .models import KnowledgeFolder, KnowledgeItem

User = get_user_model()


class KnowledgeItemSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    file_extension = serializers.CharField(read_only=True)
    file_url = serializers.SerializerMethodField()
    access_display = serializers.CharField(source='get_access_display', read_only=True)

    class Meta:
        model = KnowledgeItem
        fields = [
            'id', 'folder', 'title', 'description', 'item_type',
            'file', 'file_url', 'file_extension', 'url',
            'access', 'access_display', 'created_by', 'created_by_name', 'created_at', 'order',
        ]
        read_only_fields = ['created_by', 'created_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None


class KnowledgeFolderSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    access_display = serializers.CharField(source='get_access_display', read_only=True)
    items_count = serializers.SerializerMethodField()
    children_count = serializers.SerializerMethodField()
    allowed_departments = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Department.objects.all(), required=False,
    )
    allowed_users = serializers.PrimaryKeyRelatedField(
        many=True, queryset=User.objects.filter(is_active=True), required=False,
    )
    allowed_departments_display = serializers.SerializerMethodField()
    allowed_users_display = serializers.SerializerMethodField()

    class Meta:
        model = KnowledgeFolder
        fields = [
            'id', 'name', 'parent', 'access', 'access_display',
            'allowed_departments', 'allowed_departments_display',
            'allowed_users', 'allowed_users_display',
            'created_by', 'created_by_name', 'created_at', 'order',
            'items_count', 'children_count',
        ]
        read_only_fields = ['created_by', 'created_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None

    def get_items_count(self, obj):
        return obj.items.count()

    def get_children_count(self, obj):
        return obj.children.count()

    def get_allowed_departments_display(self, obj):
        return [{'id': d.id, 'name': d.name} for d in obj.allowed_departments.all()]

    def get_allowed_users_display(self, obj):
        return [
            {'id': u.id, 'name': u.get_full_name() or u.username}
            for u in obj.allowed_users.all()
        ]


class KnowledgeFolderDetailSerializer(KnowledgeFolderSerializer):
    children = serializers.SerializerMethodField()
    items = KnowledgeItemSerializer(many=True, read_only=True)

    class Meta(KnowledgeFolderSerializer.Meta):
        fields = KnowledgeFolderSerializer.Meta.fields + ['children', 'items']

    def get_children(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        children = obj.children.all()
        if user:
            children = _filter_by_access(children, user)
        return KnowledgeFolderSerializer(children, many=True, context=self.context).data


def _filter_by_access(qs, user):
    if user.role in ('admin', 'hr'):
        return qs

    # Role-level filter
    if user.role == 'manager':
        qs = qs.exclude(access='hr_admin')
    else:
        qs = qs.filter(access='all')

    # Department filter: empty M2M (no restrictions) OR user's dept is in the list
    dept_q = Q(allowed_departments__isnull=True) | Q(allowed_departments=user.department)

    # User filter: empty M2M (no restrictions) OR user is explicitly in the list
    user_q = Q(allowed_users__isnull=True) | Q(allowed_users=user)

    return qs.filter(dept_q & user_q).distinct()
