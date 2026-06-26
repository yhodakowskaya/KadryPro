from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import KnowledgeFolder, KnowledgeItem
from .serializers import (
    KnowledgeFolderSerializer, KnowledgeFolderDetailSerializer,
    KnowledgeItemSerializer, _filter_by_access,
)
from accounts.permissions import IsHROrAdmin


class KnowledgeFolderListCreateView(generics.ListCreateAPIView):
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsHROrAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        return KnowledgeFolderSerializer

    def get_queryset(self):
        user = self.request.user
        parent = self.request.query_params.get('parent')
        all_folders = self.request.query_params.get('all')
        qs = KnowledgeFolder.objects.all()
        if all_folders == 'true':
            pass  # return all, no parent filter
        elif parent == 'null' or parent == '':
            qs = qs.filter(parent=None)
        elif parent:
            qs = qs.filter(parent_id=parent)
        qs = _filter_by_access(qs, user)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class KnowledgeFolderDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = KnowledgeFolder.objects.all()

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [IsHROrAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return KnowledgeFolderDetailSerializer
        return KnowledgeFolderSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class KnowledgeItemListCreateView(generics.ListCreateAPIView):
    serializer_class = KnowledgeItemSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsHROrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        from django.db.models import Q
        user = self.request.user
        folder_id = self.request.query_params.get('folder')
        qs = KnowledgeItem.objects.select_related('folder', 'created_by')
        if folder_id:
            qs = qs.filter(folder_id=folder_id)
        if user.role not in ('admin', 'hr'):
            if user.role == 'manager':
                qs = qs.exclude(folder__access='hr_admin').exclude(access='hr_admin')
            else:
                qs = qs.filter(folder__access='all', access='all')
            # Also apply department/user restrictions on the folder
            dept_q = Q(folder__allowed_departments__isnull=True) | Q(folder__allowed_departments=user.department)
            user_q = Q(folder__allowed_users__isnull=True) | Q(folder__allowed_users=user)
            qs = qs.filter(dept_q & user_q).distinct()
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class KnowledgeItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = KnowledgeItem.objects.all()
    serializer_class = KnowledgeItemSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [IsHROrAdmin()]
        return [IsAuthenticated()]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx
