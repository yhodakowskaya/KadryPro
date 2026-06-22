from django.urls import path
from . import views

urlpatterns = [
    path('', views.TestListCreateView.as_view(), name='test-list'),
    path('<int:pk>/', views.TestDetailView.as_view(), name='test-detail'),
    path('<int:pk>/assign/', views.AssignTestView.as_view(), name='assign-test'),
    path('my-assignments/', views.MyAssignmentsView.as_view(), name='my-assignments'),
    path('assignments/<int:pk>/submit/', views.SubmitTestView.as_view(), name='submit-test'),
    path('results/', views.TestResultsView.as_view(), name='test-results'),
]
