from django.urls import path
from . import views

urlpatterns = [
    path('folders/', views.KnowledgeFolderListCreateView.as_view(), name='knowledge-folders'),
    path('folders/<int:pk>/', views.KnowledgeFolderDetailView.as_view(), name='knowledge-folder-detail'),
    path('items/', views.KnowledgeItemListCreateView.as_view(), name='knowledge-items'),
    path('items/<int:pk>/', views.KnowledgeItemDetailView.as_view(), name='knowledge-item-detail'),
]
