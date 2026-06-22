from rest_framework import serializers
from .models import QuestionnaireTemplate, QuestionnaireInvitation, QuestionnaireSubmission


class QuestionnaireTemplateSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = QuestionnaireTemplate
        fields = [
            'id', 'name', 'type', 'type_display', 'fields_schema',
            'created_by', 'created_by_name', 'created_at', 'is_active',
        ]
        read_only_fields = ['created_by', 'created_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class QuestionnaireInvitationSerializer(serializers.ModelSerializer):
    sent_by_name = serializers.SerializerMethodField()
    template_name = serializers.CharField(source='template.name', read_only=True)
    template_type = serializers.CharField(source='template.type', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    has_submission = serializers.SerializerMethodField()

    class Meta:
        model = QuestionnaireInvitation
        fields = [
            'id', 'token', 'recipient_email', 'recipient_name',
            'template', 'template_name', 'template_type',
            'sent_by', 'sent_by_name', 'status', 'status_display',
            'created_at', 'expires_at', 'notes', 'has_submission',
        ]
        read_only_fields = ['token', 'sent_by', 'status', 'created_at']

    def get_sent_by_name(self, obj):
        if obj.sent_by:
            return obj.sent_by.get_full_name() or obj.sent_by.username
        return None

    def get_has_submission(self, obj):
        return hasattr(obj, 'submission')


class SendInvitationSerializer(serializers.Serializer):
    recipient_email = serializers.EmailField()
    recipient_name = serializers.CharField(max_length=200)
    template_id = serializers.IntegerField()
    notes = serializers.CharField(required=False, allow_blank=True)
    expires_days = serializers.IntegerField(default=14, min_value=1, max_value=90)


class PublicFormSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(source='template.name', read_only=True)
    template_type = serializers.CharField(source='template.type', read_only=True)
    fields_schema = serializers.JSONField(source='template.fields_schema', read_only=True)

    class Meta:
        model = QuestionnaireInvitation
        fields = [
            'recipient_name', 'recipient_email', 'template_name',
            'template_type', 'fields_schema', 'expires_at',
        ]


class SubmissionSerializer(serializers.ModelSerializer):
    invitation_data = QuestionnaireInvitationSerializer(source='invitation', read_only=True)

    class Meta:
        model = QuestionnaireSubmission
        fields = ['id', 'invitation', 'invitation_data', 'data', 'submitted_at', 'ip_address']
        read_only_fields = ['submitted_at', 'ip_address']
