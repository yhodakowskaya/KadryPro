from django.db import models
from django.conf import settings


class NewsPost(models.Model):
    VISIBILITY_ALL = 'all'
    VISIBILITY_DEPT = 'dept'
    VISIBILITY_PERSON = 'person'
    VISIBILITY_CHOICES = [
        (VISIBILITY_ALL, 'Wszyscy'),
        (VISIBILITY_DEPT, 'Wybrane działy'),
        (VISIBILITY_PERSON, 'Wybrane osoby'),
    ]

    title = models.CharField(max_length=300, verbose_name='Tytuł')
    content = models.TextField(verbose_name='Treść')
    image = models.ImageField(upload_to='news/', null=True, blank=True, verbose_name='Zdjęcie')
    attachment = models.FileField(upload_to='news/attachments/', null=True, blank=True)
    attachment_name = models.CharField(max_length=255, blank=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='news_posts', verbose_name='Autor'
    )
    is_published = models.BooleanField(default=True, verbose_name='Opublikowany')
    visibility = models.CharField(max_length=20, default='all', choices=VISIBILITY_CHOICES)
    visible_to_depts = models.ManyToManyField(
        'accounts.Department', blank=True, related_name='visible_posts'
    )
    visible_to_users = models.ManyToManyField(
        settings.AUTH_USER_MODEL, blank=True, related_name='visible_posts'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Aktualność'
        verbose_name_plural = 'Aktualności'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class PostLike(models.Model):
    post = models.ForeignKey(NewsPost, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='post_likes'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('post', 'user')]


class PostComment(models.Model):
    post = models.ForeignKey(NewsPost, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='post_comments'
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
