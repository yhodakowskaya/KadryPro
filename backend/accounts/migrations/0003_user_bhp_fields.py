from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_customrole_position_user_contract_end_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='bhp_date',
            field=models.DateField(blank=True, null=True, verbose_name='Data szkolenia BHP'),
        ),
        migrations.AddField(
            model_name='user',
            name='bhp_next_date',
            field=models.DateField(blank=True, null=True, verbose_name='Następne szkolenie BHP'),
        ),
    ]
