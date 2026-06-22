from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .models import Test, Question, Answer, TestAssignment, TestAttempt
from .serializers import (
    TestListSerializer, TestDetailSerializer, TestAssignmentSerializer,
    TestAttemptSerializer, SubmitAnswersSerializer,
)
from accounts.permissions import IsHROrAdmin


class TestListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Test.objects.all()
        is_template_param = self.request.query_params.get('is_template', 'false')
        qs = qs.filter(is_template=(is_template_param.lower() == 'true'))
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        if self.request.user.role not in ('hr', 'admin'):
            qs = qs.filter(is_active=True)
        return qs

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TestDetailSerializer
        return TestListSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsHROrAdmin()]
        return [IsAuthenticated()]


class TestDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Test.objects.prefetch_related('questions__answers').all()
    serializer_class = TestDetailSerializer

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [IsHROrAdmin()]
        return [IsAuthenticated()]


class AssignTestView(APIView):
    permission_classes = [IsHROrAdmin]

    def post(self, request, pk):
        try:
            test = Test.objects.get(pk=pk, is_active=True, is_template=False)
        except Test.DoesNotExist:
            return Response({'detail': 'Test nie istnieje.'}, status=404)

        employee_ids = request.data.get('employee_ids', [])
        deadline = request.data.get('deadline')

        created = []
        for emp_id in employee_ids:
            assignment, _ = TestAssignment.objects.get_or_create(
                test=test, employee_id=emp_id,
                defaults={'assigned_by': request.user, 'deadline': deadline}
            )
            created.append(assignment)

        return Response(TestAssignmentSerializer(created, many=True).data, status=201)


class MyAssignmentsView(generics.ListAPIView):
    serializer_class = TestAssignmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TestAssignment.objects.filter(
            employee=self.request.user
        ).select_related('test').prefetch_related('attempts')


class SubmitTestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            assignment = TestAssignment.objects.select_related('test').get(
                pk=pk, employee=request.user
            )
        except TestAssignment.DoesNotExist:
            return Response({'detail': 'Przypisanie nie istnieje.'}, status=404)

        max_attempts = assignment.test.max_attempts
        if max_attempts > 0:
            existing = assignment.attempts.count()
            if existing >= max_attempts:
                return Response(
                    {'detail': f'Przekroczono limit prób ({max_attempts}). Nie możesz ponownie rozwiązać tego testu.'},
                    status=400
                )

        serializer = SubmitAnswersSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        answers_input = serializer.validated_data['answers']

        questions = list(assignment.test.questions.prefetch_related('answers').all())
        total = len(questions)
        correct = 0

        for question in questions:
            selected_ids = [int(x) for x in answers_input.get(str(question.id), [])]
            correct_ids = list(
                question.answers.filter(is_correct=True).values_list('id', flat=True)
            )

            if question.question_type == 'single':
                if len(selected_ids) == 1 and selected_ids[0] in correct_ids:
                    correct += 1
            else:
                if set(selected_ids) == set(correct_ids):
                    correct += 1

        score = (correct / total * 100) if total > 0 else 0
        passed = score >= assignment.test.passing_score

        attempt = TestAttempt.objects.create(
            assignment=assignment,
            score=round(score, 1),
            passed=passed,
            answers=answers_input,
        )

        assignment.status = TestAssignment.STATUS_COMPLETED
        assignment.save(update_fields=['status'])

        return Response({
            'score': attempt.score,
            'passed': attempt.passed,
            'correct': correct,
            'total': total,
            'passing_score': assignment.test.passing_score,
        })


class TestResultsView(generics.ListAPIView):
    serializer_class = TestAssignmentSerializer
    permission_classes = [IsHROrAdmin]

    def get_queryset(self):
        qs = TestAssignment.objects.select_related(
            'test', 'employee', 'assigned_by'
        ).prefetch_related('attempts')
        test_id = self.request.query_params.get('test')
        employee_id = self.request.query_params.get('employee')
        if test_id:
            qs = qs.filter(test_id=test_id)
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        return qs
