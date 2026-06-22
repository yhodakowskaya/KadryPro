from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import FileResponse
from .models import PrintDocument
from .serializers import PrintDocumentSerializer
from accounts.permissions import IsHROrAdmin


class PrintDocumentListCreateView(generics.ListCreateAPIView):
    serializer_class = PrintDocumentSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsHROrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return PrintDocument.objects.select_related('uploaded_by').all()

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class PrintDocumentDetailView(generics.RetrieveDestroyAPIView):
    queryset = PrintDocument.objects.all()
    serializer_class = PrintDocumentSerializer

    def get_permissions(self):
        if self.request.method == 'DELETE':
            return [IsHROrAdmin()]
        return [IsAuthenticated()]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx
