from django.db.models import Q
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import NewsPost, PostLike, PostDislike, PostComment, CommentLike, CommentDislike
from .serializers import NewsPostSerializer, PostCommentSerializer
from accounts.permissions import IsHROrAdmin


class NewsPostListCreateView(generics.ListCreateAPIView):
    serializer_class = NewsPostSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        user = self.request.user
        qs = NewsPost.objects.select_related('author').prefetch_related(
            'likes', 'comments', 'visible_to_depts', 'visible_to_users'
        )
        if user.is_hr_or_admin:
            return qs
        qs = qs.filter(is_published=True)
        qs = qs.filter(
            Q(visibility='all') |
            Q(visibility='dept', visible_to_depts=user.department) |
            Q(visibility='person', visible_to_users=user)
        ).distinct()
        return qs

    def get_permissions(self):
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        post = serializer.save(author=self.request.user)
        self._set_m2m(post)

    def _set_m2m(self, post):
        depts = self.request.data.getlist('visible_to_depts[]') or self.request.data.getlist('visible_to_depts')
        users = self.request.data.getlist('visible_to_users[]') or self.request.data.getlist('visible_to_users')
        visibility = self.request.data.get('visibility', post.visibility)
        if visibility == 'dept':
            post.visible_to_depts.set(depts)
        else:
            post.visible_to_depts.clear()
        if visibility == 'person':
            post.visible_to_users.set(users)
        else:
            post.visible_to_users.clear()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class NewsPostDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = NewsPost.objects.select_related('author').prefetch_related(
        'likes', 'comments', 'visible_to_depts', 'visible_to_users'
    ).all()
    serializer_class = NewsPostSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        return [IsAuthenticated()]

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if request.method in ('PUT', 'PATCH', 'DELETE'):
            if not (request.user.is_hr_or_admin or obj.author == request.user):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('Nie masz uprawnień do edycji tego posta.')

    def perform_update(self, serializer):
        post = serializer.save()
        depts = self.request.data.getlist('visible_to_depts[]') or self.request.data.getlist('visible_to_depts')
        users = self.request.data.getlist('visible_to_users[]') or self.request.data.getlist('visible_to_users')
        visibility = post.visibility
        if visibility == 'dept':
            post.visible_to_depts.set(depts)
        else:
            post.visible_to_depts.clear()
        if visibility == 'person':
            post.visible_to_users.set(users)
        else:
            post.visible_to_users.clear()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class PostLikeToggleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        post = generics.get_object_or_404(NewsPost, pk=pk)
        # Remove dislike if exists (like/dislike are exclusive)
        PostDislike.objects.filter(post=post, user=request.user).delete()
        like, created = PostLike.objects.get_or_create(post=post, user=request.user)
        if not created:
            like.delete()
        return Response({
            'liked': created,
            'disliked': False,
            'likes_count': post.likes.count(),
            'dislikes_count': post.dislikes.count(),
        })


class PostDislikeToggleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        post = generics.get_object_or_404(NewsPost, pk=pk)
        # Remove like if exists (like/dislike are exclusive)
        PostLike.objects.filter(post=post, user=request.user).delete()
        dislike, created = PostDislike.objects.get_or_create(post=post, user=request.user)
        if not created:
            dislike.delete()
        return Response({
            'liked': False,
            'disliked': created,
            'likes_count': post.likes.count(),
            'dislikes_count': post.dislikes.count(),
        })


class CommentLikeToggleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, post_pk, pk):
        comment = generics.get_object_or_404(PostComment, pk=pk, post_id=post_pk)
        CommentDislike.objects.filter(comment=comment, user=request.user).delete()
        like, created = CommentLike.objects.get_or_create(comment=comment, user=request.user)
        if not created:
            like.delete()
        return Response({
            'liked': created,
            'disliked': False,
            'likes_count': comment.likes.count(),
            'dislikes_count': comment.dislikes.count(),
        })


class CommentDislikeToggleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, post_pk, pk):
        comment = generics.get_object_or_404(PostComment, pk=pk, post_id=post_pk)
        CommentLike.objects.filter(comment=comment, user=request.user).delete()
        dislike, created = CommentDislike.objects.get_or_create(comment=comment, user=request.user)
        if not created:
            dislike.delete()
        return Response({
            'liked': False,
            'disliked': created,
            'likes_count': comment.likes.count(),
            'dislikes_count': comment.dislikes.count(),
        })


class PostCommentListCreateView(generics.ListCreateAPIView):
    serializer_class = PostCommentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PostComment.objects.filter(post_id=self.kwargs['pk']).select_related('author').prefetch_related('likes', 'dislikes')

    def perform_create(self, serializer):
        post = generics.get_object_or_404(NewsPost, pk=self.kwargs['pk'])
        serializer.save(author=self.request.user, post=post)


class PostCommentDeleteView(generics.DestroyAPIView):
    serializer_class = PostCommentSerializer

    def get_permissions(self):
        return [IsAuthenticated()]

    def get_queryset(self):
        return PostComment.objects.filter(post_id=self.kwargs['post_pk'])

    def get_object(self):
        obj = super().get_object()
        if obj.author != self.request.user and not self.request.user.is_hr_or_admin:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Nie masz uprawnień do usunięcia tego komentarza.')
        return obj
