from django.urls import path
from . import views

urlpatterns = [
    path('templates/', views.TemplateListCreateView.as_view(), name='template-list'),
    path('templates/<int:pk>/', views.TemplateDetailView.as_view(), name='template-detail'),
    path('invitations/', views.InvitationListView.as_view(), name='invitation-list'),
    path('invitations/send/', views.SendInvitationView.as_view(), name='send-invitation'),
    path('fill/<uuid:token>/', views.PublicFormView.as_view(), name='public-form'),
    path('submit/<uuid:token>/', views.SubmitFormView.as_view(), name='submit-form'),
    path('submissions/', views.SubmissionListView.as_view(), name='submission-list'),
    path('submissions/<int:pk>/', views.SubmissionDetailView.as_view(), name='submission-detail'),
    path('submissions/<int:pk>/pdf/', views.GeneratePDFView.as_view(), name='generate-pdf'),
    path('invitations/<int:pk>/cancel/', views.CancelInvitationView.as_view(), name='cancel-invitation'),
    path('invitations/<int:pk>/delete/', views.InvitationDeleteView.as_view(), name='delete-invitation'),
    path('invitations/<int:pk>/restore/', views.InvitationRestoreView.as_view(), name='restore-invitation'),
]
