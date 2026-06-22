from django.db import models
from django.conf import settings


ROLE_CHOICES = [
    ('all', 'Wszyscy'),
    ('hr_admin', 'Tylko Kadry/Admin'),
    ('manager_above', 'Kierownicy i wyżej'),
]


class KnowledgeFolder(models.Model):
    name = models.CharField(max_length=200, verbose_name='Nazwa folderu')
    parent = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.CASCADE,
        related_name='children', verbose_name='Folder nadrzędny'
    )
    access = models.CharField(
        max_length=20, choices=ROLE_CHOICES, default='all', verbose_name='Dostęp'
    )
    allowed_departments = models.ManyToManyField(
        'accounts.Department', blank=True,
        related_name='knowledge_folders',
        verbose_name='Dostęp dla działów (puste = wszystkie)'
    )
    allowed_users = models.ManyToManyField(
        settings.AUTH_USER_MODEL, blank=True,
        related_name='accessible_knowledge_folders',
        verbose_name='Dostęp dla użytkowników (puste = wszyscy)'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='created_folders', verbose_name='Utworzony przez'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    order = models.IntegerField(default=0, verbose_name='Kolejność')

    class Meta:
        verbose_name = 'Folder wiedzy'
        verbose_name_plural = 'Foldery wiedzy'
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class KnowledgeItem(models.Model):
    TYPE_FILE = 'file'
    TYPE_LINK = 'link'

    TYPE_CHOICES = [
        (TYPE_FILE, 'Plik'),
        (TYPE_LINK, 'Link'),
    ]

    folder = models.ForeignKey(
        KnowledgeFolder, on_delete=models.CASCADE,
        related_name='items', verbose_name='Folder'
    )
    title = models.CharField(max_length=300, verbose_name='Tytuł')
    description = models.TextField(blank=True, verbose_name='Opis')
    item_type = models.CharField(max_length=10, choices=TYPE_CHOICES, verbose_name='Typ')
    file = models.FileField(upload_to='knowledge/', null=True, blank=True, verbose_name='Plik')
    url = models.URLField(blank=True, verbose_name='Link URL')
    access = models.CharField(
        max_length=20, choices=ROLE_CHOICES, default='all', verbose_name='Dostęp'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='created_knowledge_items', verbose_name='Dodany przez'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    order = models.IntegerField(default=0, verbose_name='Kolejność')

    class Meta:
        verbose_name = 'Element bazy wiedzy'
        verbose_name_plural = 'Elementy bazy wiedzy'
        ordering = ['order', 'title']

    def __str__(self):
        return self.title

    @property
    def file_extension(self):
        if self.file:
            name = self.file.name
            if '.' in name:
                return name.rsplit('.', 1)[1].lower()
        return ''
