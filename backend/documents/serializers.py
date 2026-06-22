from rest_framework import serializers
from .models import PrintDocument


class PrintDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    file_extension = serializers.CharField(read_only=True)
    file_size = serializers.IntegerField(read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = PrintDocument
        fields = [
            'id', 'title', 'description', 'file', 'file_url', 'file_extension', 'file_size',
            'uploaded_by', 'uploaded_by_name', 'created_at',
        ]
        read_only_fields = ['uploaded_by', 'created_at']

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return obj.uploaded_by.get_full_name() or obj.uploaded_by.username
        return None

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None
