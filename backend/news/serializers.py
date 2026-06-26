from rest_framework import serializers
from .models import NewsPost, PostComment, PostDislike, CommentLike, CommentDislike


class PostCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    liked_by_me = serializers.SerializerMethodField()
    dislikes_count = serializers.SerializerMethodField()
    disliked_by_me = serializers.SerializerMethodField()

    class Meta:
        model = PostComment
        fields = ['id', 'author', 'author_name', 'text', 'created_at',
                  'likes_count', 'liked_by_me', 'dislikes_count', 'disliked_by_me']
        read_only_fields = ['author', 'created_at']

    def get_author_name(self, obj):
        if obj.author:
            return obj.author.get_full_name() or obj.author.username
        return 'Nieznany'

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_liked_by_me(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False

    def get_dislikes_count(self, obj):
        return obj.dislikes.count()

    def get_disliked_by_me(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.dislikes.filter(user=request.user).exists()
        return False


class NewsPostSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_role = serializers.CharField(source='author.get_role_display', read_only=True)
    image_url = serializers.SerializerMethodField()
    attachment_url = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    liked_by_me = serializers.SerializerMethodField()
    dislikes_count = serializers.SerializerMethodField()
    disliked_by_me = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()

    class Meta:
        model = NewsPost
        fields = [
            'id', 'title', 'content', 'image', 'image_url',
            'attachment', 'attachment_url', 'attachment_name',
            'author', 'author_name', 'author_role',
            'is_published', 'visibility', 'visible_to_depts', 'visible_to_users',
            'likes_count', 'liked_by_me', 'dislikes_count', 'disliked_by_me',
            'comments_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['author', 'created_at', 'updated_at']

    def get_author_name(self, obj):
        if obj.author:
            return obj.author.get_full_name() or obj.author.username
        return None

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

    def get_attachment_url(self, obj):
        if obj.attachment:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.attachment.url)
            return obj.attachment.url
        return None

    def get_likes_count(self, obj):
        if hasattr(obj, '_likes_count'):
            return obj._likes_count
        return obj.likes.count()

    def get_liked_by_me(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False

    def get_dislikes_count(self, obj):
        return obj.dislikes.count()

    def get_disliked_by_me(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.dislikes.filter(user=request.user).exists()
        return False

    def get_comments_count(self, obj):
        if hasattr(obj, '_comments_count'):
            return obj._comments_count
        return obj.comments.count()
