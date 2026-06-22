from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='KnowledgeFolder',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200, verbose_name='Nazwa folderu')),
                ('access', models.CharField(choices=[('all', 'Wszyscy'), ('hr_admin', 'Tylko Kadry/Admin'), ('manager_above', 'Kierownicy i wyżej')], default='all', max_length=20, verbose_name='Dostęp')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('order', models.IntegerField(default=0, verbose_name='Kolejność')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_folders', to=settings.AUTH_USER_MODEL, verbose_name='Utworzony przez')),
                ('parent', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='children', to='knowledge.knowledgefolder', verbose_name='Folder nadrzędny')),
            ],
            options={
                'verbose_name': 'Folder wiedzy',
                'verbose_name_plural': 'Foldery wiedzy',
                'ordering': ['order', 'name'],
            },
        ),
        migrations.CreateModel(
            name='KnowledgeItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=300, verbose_name='Tytuł')),
                ('description', models.TextField(blank=True, verbose_name='Opis')),
                ('item_type', models.CharField(choices=[('file', 'Plik'), ('link', 'Link')], max_length=10, verbose_name='Typ')),
                ('file', models.FileField(blank=True, null=True, upload_to='knowledge/', verbose_name='Plik')),
                ('url', models.URLField(blank=True, verbose_name='Link URL')),
                ('access', models.CharField(choices=[('all', 'Wszyscy'), ('hr_admin', 'Tylko Kadry/Admin'), ('manager_above', 'Kierownicy i wyżej')], default='all', max_length=20, verbose_name='Dostęp')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('order', models.IntegerField(default=0, verbose_name='Kolejność')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_knowledge_items', to=settings.AUTH_USER_MODEL, verbose_name='Dodany przez')),
                ('folder', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='knowledge.knowledgefolder', verbose_name='Folder')),
            ],
            options={
                'verbose_name': 'Element bazy wiedzy',
                'verbose_name_plural': 'Elementy bazy wiedzy',
                'ordering': ['order', 'title'],
            },
        ),
    ]
