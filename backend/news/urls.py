from django.urls import path
from .views import (
    NewsPostListCreateView, NewsPostDetailView,
    PostLikeToggleView, PostDislikeToggleView,
    PostCommentListCreateView, PostCommentDeleteView,
    CommentLikeToggleView, CommentDislikeToggleView,
)

urlpatterns = [
    path('', NewsPostListCreateView.as_view(), name='news-list'),
    path('<int:pk>/', NewsPostDetailView.as_view(), name='news-detail'),
    path('<int:pk>/like/', PostLikeToggleView.as_view(), name='news-like'),
    path('<int:pk>/dislike/', PostDislikeToggleView.as_view(), name='news-dislike'),
    path('<int:pk>/comments/', PostCommentListCreateView.as_view(), name='news-comments'),
    path('<int:post_pk>/comments/<int:pk>/', PostCommentDeleteView.as_view(), name='news-comment-delete'),
    path('<int:post_pk>/comments/<int:pk>/like/', CommentLikeToggleView.as_view(), name='comment-like'),
    path('<int:post_pk>/comments/<int:pk>/dislike/', CommentDislikeToggleView.as_view(), name='comment-dislike'),
]
