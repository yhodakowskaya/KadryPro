from rest_framework import serializers
from .models import Test, Question, Answer, TestAssignment, TestAttempt


class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ['id', 'text', 'is_correct']


class AnswerPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ['id', 'text']


class QuestionSerializer(serializers.ModelSerializer):
    answers = AnswerSerializer(many=True)

    class Meta:
        model = Question
        fields = ['id', 'text', 'question_type', 'order', 'answers']

    def create(self, validated_data):
        answers_data = validated_data.pop('answers', [])
        question = Question.objects.create(**validated_data)
        for ans in answers_data:
            Answer.objects.create(question=question, **ans)
        return question

    def update(self, instance, validated_data):
        answers_data = validated_data.pop('answers', None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if answers_data is not None:
            instance.answers.all().delete()
            for ans in answers_data:
                Answer.objects.create(question=instance, **ans)
        return instance


class QuestionPublicSerializer(serializers.ModelSerializer):
    answers = AnswerPublicSerializer(many=True)

    class Meta:
        model = Question
        fields = ['id', 'text', 'question_type', 'order', 'answers']


class TestListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = Test
        fields = [
            'id', 'title', 'description', 'category', 'category_display',
            'created_by', 'created_by_name', 'passing_score', 'max_attempts', 'is_active',
            'is_template', 'created_at', 'question_count',
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None

    def get_question_count(self, obj):
        return obj.questions.count()


class TestDetailSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Test
        fields = [
            'id', 'title', 'description', 'category', 'created_by',
            'created_by_name', 'passing_score', 'max_attempts', 'is_active',
            'is_template', 'created_at', 'questions',
        ]
        read_only_fields = ['created_by', 'created_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None

    def create(self, validated_data):
        questions_data = validated_data.pop('questions', [])
        validated_data['created_by'] = self.context['request'].user
        test = Test.objects.create(**validated_data)
        for q_data in questions_data:
            answers_data = q_data.pop('answers', [])
            question = Question.objects.create(test=test, **q_data)
            for ans in answers_data:
                Answer.objects.create(question=question, **ans)
        return test

    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions', None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if questions_data is not None:
            instance.questions.all().delete()
            for q_data in questions_data:
                answers_data = q_data.pop('answers', [])
                question = Question.objects.create(test=instance, **q_data)
                for ans in answers_data:
                    Answer.objects.create(question=question, **ans)
        return instance


class TestAssignmentSerializer(serializers.ModelSerializer):
    test_title = serializers.CharField(source='test.title', read_only=True)
    test_category = serializers.CharField(source='test.category', read_only=True)
    test_passing_score = serializers.IntegerField(source='test.passing_score', read_only=True)
    test_max_attempts = serializers.IntegerField(source='test.max_attempts', read_only=True)
    employee_name = serializers.SerializerMethodField()
    assigned_by_name = serializers.SerializerMethodField()
    latest_score = serializers.SerializerMethodField()
    attempts_count = serializers.SerializerMethodField()

    class Meta:
        model = TestAssignment
        fields = [
            'id', 'test', 'test_title', 'test_category', 'test_passing_score', 'test_max_attempts',
            'employee', 'employee_name', 'assigned_by', 'assigned_by_name',
            'deadline', 'status', 'assigned_at', 'latest_score', 'attempts_count',
        ]
        read_only_fields = ['assigned_by', 'status', 'assigned_at']

    def get_employee_name(self, obj):
        return obj.employee.get_full_name() or obj.employee.username

    def get_assigned_by_name(self, obj):
        if obj.assigned_by:
            return obj.assigned_by.get_full_name() or obj.assigned_by.username
        return None

    def get_latest_score(self, obj):
        attempt = obj.attempts.order_by('-completed_at').first()
        if attempt:
            return {'score': attempt.score, 'passed': attempt.passed}
        return None

    def get_attempts_count(self, obj):
        return obj.attempts.count()


class TestAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestAttempt
        fields = ['id', 'assignment', 'score', 'passed', 'answers', 'completed_at']
        read_only_fields = ['score', 'passed', 'completed_at']


class SubmitAnswersSerializer(serializers.Serializer):
    answers = serializers.DictField(
        child=serializers.ListField(child=serializers.IntegerField()),
        help_text='{"question_id": [answer_id, ...], ...}'
    )
