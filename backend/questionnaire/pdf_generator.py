from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY


def generate_questionnaire_pdf(submission):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle', parent=styles['Heading1'],
        fontSize=14, alignment=TA_CENTER, spaceAfter=20,
        fontName='Helvetica-Bold'
    )
    label_style = ParagraphStyle(
        'Label', parent=styles['Normal'],
        fontSize=9, fontName='Helvetica-Bold',
        textColor=colors.HexColor('#374151'), spaceBefore=8
    )
    value_style = ParagraphStyle(
        'Value', parent=styles['Normal'],
        fontSize=10, fontName='Helvetica',
        borderPadding=(4, 0, 4, 0), spaceBefore=2,
        borderWidth=0, borderColor=colors.HexColor('#D1D5DB'),
    )
    normal = ParagraphStyle(
        'CustomNormal', parent=styles['Normal'],
        fontSize=10, fontName='Helvetica', spaceAfter=4
    )

    data = submission.data
    template_type = submission.invitation.template.type
    invitation = submission.invitation

    elements = []

    if template_type == 'pracownik':
        title_text = 'KWESTIONARIUSZ OSOBOWY DLA PRACOWNIKA'
    elif template_type == 'zleceniobiorca_cudzoziemiec':
        title_text = 'KWESTIONARIUSZ OSOBOWY DLA ZLECENIOBIORCY'
    else:
        title_text = submission.invitation.template.name.upper()

    elements.append(Paragraph(title_text, title_style))
    elements.append(HRFlowable(width='100%', thickness=1, color=colors.black))
    elements.append(Spacer(1, 0.4*cm))

    field_labels = {
        'imie_nazwisko': '1. Imię (imiona) i nazwisko',
        'pesel': '2. Numer ewidencyjny PESEL',
        'pesel_paszport': '2. Numer ewidencyjny PESEL lub Paszport',
        'plec': '3. Płeć',
        'miejsce_data_urodzenia': '3. Miejsce i data urodzenia',
        'miejsce_data_urodzenia_4': '4. Miejsce i data urodzenia',
        'obywatelstwo': '4. Obywatelstwo',
        'obywatelstwo_5': '5. Obywatelstwo',
        'telefon': '5. Numer telefonu',
        'telefon_7': '7. Numer telefonu wraz z numerem kierunkowym',
        'paszport_od': 'Paszport ważny od',
        'paszport_do': 'do',
        'zezwolenie_od': 'Zezwolenie na pracę ważne od',
        'zezwolenie_do': 'do',
        'wiza_od': 'Wiza ważna od',
        'wiza_do': 'do',
        'wojewodztwo': 'Województwo',
        'powiat': 'Powiat',
        'gmina': 'Gmina',
        'poczta': 'Poczta',
        'ulica': 'Ulica nr domu/nr lokalu',
        'kod_pocztowy': 'Kod pocztowy',
        'miejscowosc': 'Miejscowość',
        'urzad_skarbowy': 'Nazwa Urzędu Skarbowego',
        'status_studenta': 'Status studenta',
        'emerytura_renta': 'Prawo do emerytury/renty',
        'niepelnosprawnosc': 'Stopień niepełnosprawności',
        'wyksztalcenie': 'Dotychczasowe wykształcenie',
        'zatrudnienie': 'Przebieg dotychczasowego zatrudnienia',
        'osoba_kontaktowa': '11. Osoba do zawiadomienia w razie wypadku',
        'numer_konta': 'Numer konta bankowego',
        'nazwa_banku': 'Nazwa i adres banku',
        'wyplata_sposob': 'Sposób wypłaty wynagrodzenia',
        'zatrudnienie_inne': 'Zatrudnienie w innym zakładzie pracy',
        'dzialalnosc_gospodarcza': 'Działalność gospodarcza',
        'dobrowolne_ubezpieczenie': 'Dobrowolne ubezpieczenie chorobowe',
    }

    for key, value in data.items():
        if value is None or value == '':
            continue
        label = field_labels.get(key, key.replace('_', ' ').capitalize())
        elements.append(Paragraph(label + ':', label_style))

        if isinstance(value, list):
            display_val = ', '.join(str(v) for v in value)
        elif isinstance(value, bool):
            display_val = 'TAK' if value else 'NIE'
        else:
            display_val = str(value)

        elements.append(Paragraph(display_val or '—', value_style))
        elements.append(HRFlowable(
            width='100%', thickness=0.5,
            color=colors.HexColor('#E5E7EB'), spaceAfter=2
        ))

    elements.append(Spacer(1, 1*cm))

    sig_data = [
        ['', ''],
        ['........................................', '........................................'],
        ['Miejscowość i data', 'Podpis pracownika'],
    ]
    sig_table = Table(sig_data, colWidths=[8*cm, 8*cm])
    sig_table.setStyle(TableStyle([
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(sig_table)

    doc.build(elements)
    buffer.seek(0)
    return buffer
