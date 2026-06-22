from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hr', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='vacationrequest',
            name='request_type',
            field=models.CharField(
                choices=[('vacation', 'Urlop'), ('remote', 'Praca zdalna')],
                default='vacation',
                max_length=20,
                verbose_name='Typ wniosku',
            ),
        ),
    ]
