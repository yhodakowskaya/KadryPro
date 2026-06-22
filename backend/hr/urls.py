from django.urls import path
from . import views

urlpatterns = [
    path('vacation-types/', views.VacationTypeListCreateView.as_view(), name='vacation-types'),
    path('vacation-types/<int:pk>/', views.VacationTypeDetailView.as_view(), name='vacation-type-detail'),
    path('vacation-type-allocations/', views.VacationTypeAllocationListCreateView.as_view(), name='vacation-type-allocations'),
    path('vacation-type-allocations/bulk/', views.BulkVacationTypeAllocationView.as_view(), name='vacation-type-allocations-bulk'),
    path('vacation-type-allocations/<int:pk>/', views.VacationTypeAllocationDetailView.as_view(), name='vacation-type-allocation-detail'),
    path('my-vacation-type-allocations/', views.MyVacationTypeAllocationsView.as_view(), name='my-vacation-type-allocations'),
    path('vacation-balance/<int:employee_id>/', views.VacationBalanceView.as_view(), name='vacation-balance'),
    path('vacation-balances/', views.AllBalancesView.as_view(), name='all-balances'),
    path('carry-over/', views.CarryOverView.as_view(), name='carry-over'),
    path('vacation-requests/', views.VacationRequestListCreateView.as_view(), name='vacation-requests'),
    path('vacation-requests/<int:pk>/approve/', views.ApproveVacationView.as_view(), name='approve-vacation'),
    path('vacation-requests/<int:pk>/reject/', views.RejectVacationView.as_view(), name='reject-vacation'),
    path('vacation-requests/<int:pk>/cancel/', views.CancelVacationView.as_view(), name='cancel-vacation'),
    path('pending-approvals/', views.PendingApprovalsView.as_view(), name='pending-approvals'),
    # Work Calendars
    path('calendars/', views.WorkCalendarListCreateView.as_view(), name='calendars'),
    path('calendars/<int:pk>/', views.WorkCalendarDetailView.as_view(), name='calendar-detail'),
    path('calendars/<int:calendar_pk>/recurring-holidays/', views.CalendarRecurringHolidayView.as_view(), name='calendar-recurring-holidays'),
    path('calendars/<int:calendar_pk>/single-holidays/', views.CalendarSingleHolidayView.as_view(), name='calendar-single-holidays'),
    path('calendars/<int:calendar_pk>/assign/', views.CalendarAssignView.as_view(), name='calendar-assign'),
    path('recurring-holidays/<int:pk>/', views.RecurringHolidayDeleteView.as_view(), name='recurring-holiday-delete'),
    path('single-holidays/<int:pk>/', views.SingleHolidayDeleteView.as_view(), name='single-holiday-delete'),
    path('calendar-assignments/<int:pk>/', views.CalendarAssignmentDeleteView.as_view(), name='calendar-assignment-delete'),
    path('employee-calendar-holidays/', views.EmployeeCalendarHolidaysView.as_view(), name='employee-calendar-holidays'),
    path('vacation-requests/archive-year/', views.ArchivePreviousYearView.as_view(), name='archive-year'),
    path('vacation-balance/<int:employee_id>/adjust/', views.VacationBalanceAdjustView.as_view(), name='vacation-balance-adjust'),
]
