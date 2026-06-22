from django.urls import path
from . import views

urlpatterns = [
    path('users/', views.UserListCreateView.as_view(), name='user-list'),
    path('users/<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),
    path('users/<int:pk>/set-password/', views.SetPasswordView.as_view(), name='user-set-password'),
    path('users/<int:pk>/restore/', views.UserRestoreView.as_view(), name='user-restore'),
    path('departments/', views.DepartmentListCreateView.as_view(), name='department-list'),
    path('departments/<int:pk>/', views.DepartmentDetailView.as_view(), name='department-detail'),
    path('departments/tree/', views.DepartmentTreeView.as_view(), name='department-tree'),
    path('departments/import/', views.DepartmentImportView.as_view(), name='department-import'),
    path('org-chart/', views.OrgChartView.as_view(), name='org-chart'),
    path('positions/', views.PositionListCreateView.as_view(), name='position-list'),
    path('positions/<int:pk>/', views.PositionDetailView.as_view(), name='position-detail'),
    path('positions/import/', views.PositionImportView.as_view(), name='position-import'),
    path('custom-roles/', views.CustomRoleListCreateView.as_view(), name='custom-role-list'),
    path('custom-roles/<int:pk>/', views.CustomRoleDetailView.as_view(), name='custom-role-detail'),
    path('trigger-notifications/', views.TriggerNotificationsView.as_view(), name='trigger-notifications'),
]
