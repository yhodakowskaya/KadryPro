from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from accounts.views import CustomTokenObtainPairView, MeView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/me/', MeView.as_view(), name='me'),
    path('api/', include('accounts.urls')),
    path('api/questionnaire/', include('questionnaire.urls')),
    path('api/tests/', include('tests_module.urls')),
    path('api/hr/', include('hr.urls')),
    path('api/documents/', include('documents.urls')),
    path('api/knowledge/', include('knowledge.urls')),
    path('api/news/', include('news.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
