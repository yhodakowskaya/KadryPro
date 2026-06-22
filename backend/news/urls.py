from django.urls import path
from . import views

urlpatterns = [
    path('', views.NewsPostListCreateView.as_view(), name='news-list'),
    path('<int:pk>/', views.NewsPostDetailView.as_view(), name='news-detail'),
]
