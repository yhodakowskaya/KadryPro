from django.db import models
from django.conf import settings


class NewsPost(models.Model):
    title = models.CharField(max_length=300, verbose_name='Tytuł')
    content = models.TextField(verbose_name='Treść')
    image = models.ImageField(upload_to='news/', null=True, blank=True, verbose_name='Zdjęcie')
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='news_posts', verbose_name='Autor'
    )
    is_published = models.BooleanField(default=True, verbose_name='Opublikowany')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Aktualność'
        verbose_name_plural = 'Aktualności'
        ordering = ['-created_at']

    def __str__(self):
        return self.title
