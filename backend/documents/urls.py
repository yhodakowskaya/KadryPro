from django.urls import path
from . import views

urlpatterns = [
    path('', views.PrintDocumentListCreateView.as_view(), name='documents-list'),
    path('<int:pk>/', views.PrintDocumentDetailView.as_view(), name='document-detail'),
]
