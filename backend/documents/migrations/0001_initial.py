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
            name='PrintDocument',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=300, verbose_name='Tytuł')),
                ('description', models.TextField(blank=True, verbose_name='Opis')),
                ('file', models.FileField(upload_to='documents/', verbose_name='Plik')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('uploaded_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='uploaded_documents', to=settings.AUTH_USER_MODEL, verbose_name='Dodany przez')),
            ],
            options={
                'verbose_name': 'Dokument do druku',
                'verbose_name_plural': 'Dokumenty do druku',
                'ordering': ['-created_at'],
            },
        ),
    ]
