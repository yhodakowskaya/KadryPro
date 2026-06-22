from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('knowledge', '0001_initial'),
        ('accounts', '0003_user_bhp_fields'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='knowledgefolder',
            name='allowed_departments',
            field=models.ManyToManyField(
                blank=True,
                related_name='knowledge_folders',
                to='accounts.department',
                verbose_name='Dostęp dla działów (puste = wszystkie)',
            ),
        ),
        migrations.AddField(
            model_name='knowledgefolder',
            name='allowed_users',
            field=models.ManyToManyField(
                blank=True,
                related_name='accessible_knowledge_folders',
                to=settings.AUTH_USER_MODEL,
                verbose_name='Dostęp dla użytkowników (puste = wszyscy)',
            ),
        ),
    ]
