from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import NewsPost
from .serializers import NewsPostSerializer
from accounts.permissions import IsHROrAdmin


class NewsPostListCreateView(generics.ListCreateAPIView):
    serializer_class = NewsPostSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = NewsPost.objects.select_related('author')
        if not self.request.user.is_hr_or_admin:
            qs = qs.filter(is_published=True)
        return qs

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsHROrAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class NewsPostDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = NewsPost.objects.select_related('author').all()
    serializer_class = NewsPostSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [IsHROrAdmin()]
        return [IsAuthenticated()]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx
