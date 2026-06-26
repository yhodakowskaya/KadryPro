from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail
from django.http import HttpResponse
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from datetime import timedelta
from .models import QuestionnaireTemplate, QuestionnaireInvitation, QuestionnaireSubmission
from .serializers import (
    QuestionnaireTemplateSerializer, QuestionnaireInvitationSerializer,
    SendInvitationSerializer, PublicFormSerializer, SubmissionSerializer,
)
from .pdf_generator import generate_questionnaire_pdf
from accounts.permissions import IsHROrAdmin, CanManageQuestionnaires


class TemplateListCreateView(generics.ListCreateAPIView):
    serializer_class = QuestionnaireTemplateSerializer

    def get_queryset(self):
        qs = QuestionnaireTemplate.objects.all()
        if self.request.query_params.get('active_only') == 'true':
            qs = qs.filter(is_active=True)
        return qs

    def get_permissions(self):
        if self.request.method == 'POST':
            return [CanManageQuestionnaires()]
        return [IsAuthenticated()]


class TemplateDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = QuestionnaireTemplate.objects.all()
    serializer_class = QuestionnaireTemplateSerializer
    permission_classes = [CanManageQuestionnaires]


class InvitationListView(generics.ListAPIView):
    serializer_class = QuestionnaireInvitationSerializer
    permission_classes = [IsHROrAdmin]

    def get_queryset(self):
        qs = QuestionnaireInvitation.objects.select_related('template', 'sent_by')
        include_deleted = self.request.query_params.get('include_deleted', 'false')
        if include_deleted.lower() == 'true':
            qs = qs.filter(is_deleted=True)
        else:
            qs = qs.filter(is_deleted=False)
        return qs


class InvitationDeleteView(APIView):
    permission_classes = [IsHROrAdmin]

    def delete(self, request, pk):
        inv = generics.get_object_or_404(QuestionnaireInvitation, pk=pk)
        inv.is_deleted = True
        inv.save(update_fields=['is_deleted'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class InvitationRestoreView(APIView):
    permission_classes = [IsHROrAdmin]

    def post(self, request, pk):
        inv = generics.get_object_or_404(QuestionnaireInvitation, pk=pk, is_deleted=True)
        inv.is_deleted = False
        inv.save(update_fields=['is_deleted'])
        return Response(QuestionnaireInvitationSerializer(inv).data)


class SendInvitationView(APIView):
    permission_classes = [IsHROrAdmin]

    def post(self, request):
        serializer = SendInvitationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        try:
            template = QuestionnaireTemplate.objects.get(pk=d['template_id'], is_active=True)
        except QuestionnaireTemplate.DoesNotExist:
            return Response({'detail': 'Szablon nie istnieje.'}, status=404)

        expires_at = timezone.now() + timedelta(days=d['expires_days'])
        invitation = QuestionnaireInvitation.objects.create(
            recipient_email=d['recipient_email'],
            recipient_name=d['recipient_name'],
            template=template,
            sent_by=request.user,
            expires_at=expires_at,
            notes=d.get('notes', ''),
        )

        form_url = f"{settings.APP_URL}/formularz/{invitation.token}"
        email_sent = False
        email_error = None
        try:
            send_mail(
                subject=f'Kwestionariusz osobowy — {template.name}',
                message=(
                    f'Szanowny/a {invitation.recipient_name},\n\n'
                    f'Prosimy o wypełnienie kwestionariusza osobowego.\n\n'
                    f'Link do formularza:\n{form_url}\n\n'
                    f'Link jest ważny do: {expires_at.strftime("%d.%m.%Y %H:%M")}\n\n'
                    f'Z poważaniem,\nDział HR'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[invitation.recipient_email],
                fail_silently=False,
            )
            email_sent = True
        except Exception as e:
            email_error = str(e)

        data = QuestionnaireInvitationSerializer(invitation).data
        data['form_url'] = form_url
        data['email_sent'] = email_sent
        if email_error:
            data['email_error'] = email_error

        return Response(data, status=status.HTTP_201_CREATED)


class PublicFormView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            invitation = QuestionnaireInvitation.objects.select_related('template').get(token=token)
        except QuestionnaireInvitation.DoesNotExist:
            return Response({'detail': 'Formularz nie istnieje.'}, status=404)

        if invitation.status == QuestionnaireInvitation.STATUS_COMPLETED:
            return Response({'detail': 'Ten formularz został już wypełniony.'}, status=410)

        if timezone.now() > invitation.expires_at:
            invitation.status = QuestionnaireInvitation.STATUS_EXPIRED
            invitation.save(update_fields=['status'])
            return Response({'detail': 'Link do formularza wygasł.'}, status=410)

        return Response(PublicFormSerializer(invitation).data)


class SubmitFormView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, token):
        try:
            invitation = QuestionnaireInvitation.objects.select_related(
                'template', 'sent_by'
            ).get(token=token)
        except QuestionnaireInvitation.DoesNotExist:
            return Response({'detail': 'Formularz nie istnieje.'}, status=404)

        if invitation.status == QuestionnaireInvitation.STATUS_COMPLETED:
            return Response({'detail': 'Ten formularz został już wypełniony.'}, status=410)

        if timezone.now() > invitation.expires_at:
            return Response({'detail': 'Link do formularza wygasł.'}, status=410)

        ip = (
            request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
            or request.META.get('REMOTE_ADDR')
        )

        submission = QuestionnaireSubmission.objects.create(
            invitation=invitation,
            data=request.data.get('data', {}),
            ip_address=ip or None,
        )

        invitation.status = QuestionnaireInvitation.STATUS_COMPLETED
        invitation.save(update_fields=['status'])

        if invitation.sent_by and invitation.sent_by.email:
            fields_schema = invitation.template.fields_schema or []
            answers = submission.data or {}
            system_url = getattr(settings, 'APP_URL', '')
            submission_url = f"{system_url}/kwestionariusze/wypelnione/{submission.pk}" if system_url else ''

            # plain text body
            lines = [
                f'{invitation.recipient_name} wypełnił/a kwestionariusz: {invitation.template.name}',
                f'Data: {submission.submitted_at.strftime("%d.%m.%Y %H:%M")}',
                '',
                '─' * 60,
                '',
            ]
            for field in fields_schema:
                if field.get('type') == 'section':
                    lines.append(f'\n[{field.get("label", "")}]')
                    continue
                label = field.get('label', field.get('key', ''))
                key = field.get('key', '')
                value = answers.get(key)
                if isinstance(value, list):
                    value = ', '.join(value)
                lines.append(f'{label}: {value or "—"}')
            if submission_url:
                lines += ['', '─' * 60, '', f'Link do PDF: {submission_url}']
            plain_body = '\n'.join(lines)

            # html body
            rows_html = ''
            for field in fields_schema:
                if field.get('type') == 'section':
                    rows_html += (
                        f'<tr><td colspan="2" style="background:#f3f4f6;padding:10px 14px;'
                        f'font-weight:600;font-size:13px;color:#374151;border-top:2px solid #e5e7eb">'
                        f'{field.get("label","")}</td></tr>'
                    )
                    continue
                label = field.get('label', field.get('key', ''))
                key = field.get('key', '')
                value = answers.get(key)
                if isinstance(value, list):
                    value = ', '.join(value)
                rows_html += (
                    f'<tr><td style="padding:8px 14px;color:#6b7280;font-size:13px;'
                    f'border-bottom:1px solid #f3f4f6;white-space:nowrap;vertical-align:top">'
                    f'{label}</td>'
                    f'<td style="padding:8px 14px;color:#111827;font-size:13px;'
                    f'border-bottom:1px solid #f3f4f6;font-weight:500">'
                    f'{value or "—"}</td></tr>'
                )
            pdf_link = (
                f'<p style="margin-top:20px"><a href="{submission_url}" '
                f'style="background:#166534;color:#fff;padding:10px 20px;border-radius:6px;'
                f'text-decoration:none;font-size:14px">Otwórz w systemie i pobierz PDF</a></p>'
                if submission_url else ''
            )
            html_body = f"""
<html><body style="font-family:Arial,sans-serif;color:#111827;max-width:700px;margin:0 auto">
<h2 style="color:#166534;border-bottom:2px solid #166534;padding-bottom:8px">
  Nowy kwestionariusz: {invitation.template.name}
</h2>
<p style="color:#6b7280;margin-bottom:16px">
  <strong>{invitation.recipient_name}</strong> &bull;
  {submission.submitted_at.strftime("%d.%m.%Y %H:%M")}
</p>
<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px">
{rows_html}
</table>
{pdf_link}
</body></html>"""

            try:
                from django.core.mail import EmailMultiAlternatives
                msg = EmailMultiAlternatives(
                    subject=f'Kwestionariusz wypełniony — {invitation.recipient_name}',
                    body=plain_body,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[invitation.sent_by.email],
                )
                msg.attach_alternative(html_body, 'text/html')
                msg.send(fail_silently=True)
            except Exception:
                pass

        return Response({'detail': 'Dziękujemy za wypełnienie kwestionariusza!'})


class CancelInvitationView(APIView):
    permission_classes = [IsHROrAdmin]

    def post(self, request, pk):
        try:
            invitation = QuestionnaireInvitation.objects.get(pk=pk)
        except QuestionnaireInvitation.DoesNotExist:
            return Response({'detail': 'Nie znaleziono zaproszenia.'}, status=404)

        if invitation.status != QuestionnaireInvitation.STATUS_PENDING:
            return Response(
                {'detail': 'Można anulować tylko oczekujące zaproszenia.'},
                status=400
            )

        invitation.status = QuestionnaireInvitation.STATUS_CANCELLED
        invitation.save(update_fields=['status'])
        return Response(QuestionnaireInvitationSerializer(invitation).data)


class SubmissionListView(generics.ListAPIView):
    serializer_class = SubmissionSerializer
    permission_classes = [IsHROrAdmin]

    def get_queryset(self):
        return QuestionnaireSubmission.objects.select_related(
            'invitation__template', 'invitation__sent_by'
        ).all()


class SubmissionDetailView(generics.RetrieveAPIView):
    queryset = QuestionnaireSubmission.objects.select_related(
        'invitation__template', 'invitation__sent_by'
    ).all()
    serializer_class = SubmissionSerializer
    permission_classes = [IsHROrAdmin]


class GeneratePDFView(APIView):
    permission_classes = [IsHROrAdmin]

    def get(self, request, pk):
        try:
            submission = QuestionnaireSubmission.objects.select_related(
                'invitation__template'
            ).get(pk=pk)
        except QuestionnaireSubmission.DoesNotExist:
            return Response({'detail': 'Nie znaleziono.'}, status=404)

        buffer = generate_questionnaire_pdf(submission)
        filename = (
            f"kwestionariusz_{submission.invitation.recipient_name.replace(' ', '_')}"
            f"_{submission.submitted_at.strftime('%Y%m%d')}.pdf"
        )
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
