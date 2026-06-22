from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tests_module', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='test',
            name='max_attempts',
            field=models.IntegerField(default=1, verbose_name='Maksymalna liczba prób (0 = bez limitu)'),
        ),
    ]
