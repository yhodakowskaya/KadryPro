from django.db import models
from django.conf import settings


class PrintDocument(models.Model):
    title = models.CharField(max_length=300, verbose_name='Tytuł')
    description = models.TextField(blank=True, verbose_name='Opis')
    file = models.FileField(upload_to='documents/', verbose_name='Plik')
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='uploaded_documents', verbose_name='Dodany przez'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Dokument do druku'
        verbose_name_plural = 'Dokumenty do druku'
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def file_extension(self):
        name = self.file.name
        if '.' in name:
            return name.rsplit('.', 1)[1].lower()
        return ''

    @property
    def file_size(self):
        try:
            return self.file.size
        except Exception:
            return 0
