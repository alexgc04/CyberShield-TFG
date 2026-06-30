#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
import json
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Canvas personalizado para numeración de páginas dinamica ('Página X de Y')
    y membretes corporativos consistentes en cada página.
    """
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_elements(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_elements(self, page_count):
        self.saveState()
        
        # Linea y encabezado
        self.setStrokeColor(HexColor('#00cc33'))
        self.setLineWidth(1)
        self.line(40, 742, 572, 742)
        
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(HexColor('#1a1a1a'))
        self.drawString(40, 749, "CYBERSHIELD COMPANY -- AUDITORIA DE SEGURIDAD")
        
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(HexColor('#00cc33'))
        self.drawRightString(572, 749, "CONFIDENCIAL")
        
        # Linea y pie de pagina
        self.line(40, 50, 572, 50)
        self.setFont("Helvetica", 7)
        self.setFillColor(HexColor('#666666'))
        self.drawString(40, 38, "Generado automaticamente por CyberShield ASV -- UCLM 2025/26")
        self.drawRightString(572, 38, f"Pagina {self._pageNumber} de {page_count}")
        
        self.restoreState()


def main():
    # Leer JSON desde stdin
    try:
        input_data = json.load(sys.stdin)
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Error al decodificar JSON de stdin: {str(e)}"}), file=sys.stderr)
        sys.exit(1)

    body_data = input_data.get("body") or input_data.get("data") or input_data or {}

    # Cargar plantillas desde el JSON local para fallbacks de metadatos perfectos
    templates = []
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        templates_path = os.path.join(script_dir, 'infrastructure', 'mongodb', 'attack_templates.json')
        if os.path.exists(templates_path):
            with open(templates_path, 'r', encoding='utf-8') as f:
                templates = json.load(f)
    except Exception:
        pass

    # Intentar buscar la plantilla del ataque
    attack_id = body_data.get("attack_id")
    attack_name = body_data.get("attack_name")
    tmpl = None
    for t in templates:
        if attack_id and t.get("id") == attack_id:
            tmpl = t
            break
        if attack_name and t.get("name") == attack_name:
            tmpl = t
            break

    # Resolver campos de datos con fallbacks seguros
    nombre = body_data.get("attack_name") or (tmpl.get("name") if tmpl else None) or body_data.get("id") or 'Ataque desconocido'
    
    # Si la empresa es genérica o vacía, asegurar que usamos CyberShield Company
    empresa = body_data.get("company_name") or 'CyberShield Company'
    if empresa == 'Empresa Auditada' or not empresa.strip():
        empresa = 'CyberShield Company'

    mitre = body_data.get("mitre_id") or (tmpl.get("mitre_id") if tmpl else None) or 'N/D'
    riesgo = (body_data.get("risk_level") or (tmpl.get("risk_level") if tmpl else None) or 'MEDIUM').upper()
    desc = body_data.get("description") or (tmpl.get("description") if tmpl else None) or 'Simulacion de intrusión defensiva.'
    comando = body_data.get("command_executed") or (tmpl.get("command") if tmpl else None) or '(no disponible)'
    salida = body_data.get("ssh_output") or '(sin salida de consola)'
    exit_code = body_data.get("ssh_exit_code")
    if exit_code is None:
        exit_code = '-'
    wazuh_rule = body_data.get("wazuh_rule_id") or (str(tmpl.get("wazuh_rule_id")) if tmpl else None) or 'N/D'
    report_id = body_data.get("report_id") or f"CS-RPT-{int(sys.argv[1]) if len(sys.argv) > 1 else 'GEN'}"
    fecha = body_data.get("date") or None
    
    # Configurar fecha en español
    import datetime
    fecha = datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")

    # Asegurar que existe la carpeta reports
    reports_dir = os.path.join(script_dir, "reports")
    if not os.path.exists(reports_dir):
        os.makedirs(reports_dir, exist_ok=True)

    report_path = os.path.join(reports_dir, f"{report_id}.pdf")

    # Inicializar documento ReportLab
    # letter es 612x792. Usamos márgenes de 40. Margen vertical ajustado para no solapar con encabezado/pie.
    doc = SimpleDocTemplate(
        report_path,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=70,
        bottomMargin=70
    )

    styles = getSampleStyleSheet()
    
    # Paleta de Colores
    VERDE_CYBER = HexColor('#00cc33')
    CHARCOAL = HexColor('#1a1a1a')
    MUTED_GRAY = HexColor('#555555')
    LIGHT_GRAY = HexColor('#f9f9f9')
    BORDER_GRAY = HexColor('#e5e7eb')

    # Estilos de Texto
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        textColor=CHARCOAL,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=VERDE_CYBER,
        spaceAfter=15
    )

    body_style = ParagraphStyle(
        'BodyCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        textColor=CHARCOAL,
        leading=13.5,
        spaceAfter=8
    )

    meta_bold = ParagraphStyle(
        'MetaB',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=CHARCOAL,
        leading=12
    )

    meta_style = ParagraphStyle(
        'MetaV',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=MUTED_GRAY,
        leading=12
    )

    code_style = ParagraphStyle(
        'CodeBox',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        textColor=HexColor('#006622'),
        leading=10
    )

    output_style = ParagraphStyle(
        'ConsoleBox',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        textColor=HexColor('#222222'),
        leading=9.5
    )

    story = []

    # 1. TITULO Y CABECERA DE INFORME
    story.append(Paragraph(f"INFORME DE INTRUSION: {nombre.upper()}", title_style))
    story.append(Paragraph(f"ID REPORTE: {report_id}  |  EMPRESA AUDITADA: {empresa.upper()}", subtitle_style))

    # 2. SEMAFORO DE RIESGO
    risk_colors = {
        "CRITICAL": {"bg": "#ff4444", "fg": "#ffffff", "text": "RIESGO CRITICO -- Vulnerabilidad explotada con exito"},
        "HIGH": {"bg": "#ff8800", "fg": "#ffffff", "text": "RIESGO ALTO -- Vulnerabilidad grave detectada"},
        "MEDIUM": {"bg": "#ffcc00", "fg": "#1a1a1a", "text": "RIESGO MEDIO -- Exposicion parcial confirmada"},
        "LOW": {"bg": "#00cc33", "fg": "#ffffff", "text": "RIESGO BAJO -- Mejora de seguridad recomendada"}
    }
    r_info = risk_colors.get(riesgo, risk_colors["MEDIUM"])

    badge_style = ParagraphStyle(
        'RiskBadgeText',
        fontName='Helvetica-Bold',
        fontSize=11,
        textColor=HexColor(r_info["fg"]),
        alignment=1
    )
    badge_p = Paragraph(r_info["text"], badge_style)
    badge_table = Table([[badge_p]], colWidths=[532])
    badge_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), HexColor(r_info["bg"])),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(badge_table)
    story.append(Spacer(1, 15))

    # Helper para crear los encabezados estilo CyberShield (con borde izquierdo verde)
    def make_heading(text):
        p = Paragraph(text.upper(), ParagraphStyle(
            'H1Style',
            fontName='Helvetica-Bold',
            fontSize=11,
            textColor=CHARCOAL,
            keepWithNext=True
        ))
        t = Table([[p]], colWidths=[532])
        t.setStyle(TableStyle([
            ('LINELEFT', (0,0), (0,-1), 3, VERDE_CYBER),
            ('LEFTPADDING', (0,0), (0,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 2),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ]))
        return t

    # 3. SECCION 1: RESUMEN EJECUTIVO
    story.append(make_heading("1. Resumen Ejecutivo"))
    story.append(Spacer(1, 6))

    resumen_text = f"Durante esta auditoria, se ejecuto el ataque '{nombre}' contra la infraestructura de {empresa}. {desc} El ataque fue catalogado con la tecnica {mitre} del framework MITRE ATT&CK y detecto por la regla Wazuh {wazuh_rule}."
    if str(exit_code) == '0' or exit_code == 0:
        resumen_text += " <font color='#ff4444'><b>[CONFIRMADO]</b></font> El ataque se ejecuto sin errores. Su sistema es vulnerable a este vector de ataque."
    else:
        resumen_text += " <font color='#ff8800'><b>[PARCIAL]</b></font> El ataque encontro resistencia. Revisar la salida de consola para detalles."
    
    story.append(Paragraph(resumen_text, body_style))
    story.append(Spacer(1, 12))

    # 4. SECCION 2: ALCANCE Y METODOLOGIA
    story.append(make_heading("2. Alcance y Metodologia"))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Esta evaluacion se realizo en un entorno controlado y autorizado, simulando tecnicas reales de adversarios. El alcance comprende los activos especificos y herramientas detalladas a continuacion:", body_style))
    
    scope_data = [
        [Paragraph("<b>Objetivos evaluados:</b>", meta_bold), Paragraph(f"Servidor de pruebas / Kali Linux ({empresa})", meta_style)],
        [Paragraph("<b>Herramientas utilizadas:</b>", meta_bold), Paragraph("Vectores ofensivos CyberShield, Scapy engine, comandos locales Linux y auditoria manual de logs", meta_style)],
        [Paragraph("<b>Framework de control:</b>", meta_bold), Paragraph("Wazuh Security SIEM & MITRE ATT&CK Matrix", meta_style)]
    ]
    scope_table = Table(scope_data, colWidths=[130, 402])
    scope_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_GRAY),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LINEBELOW', (0,0), (-1,-2), 0.5, BORDER_GRAY)
    ]))
    story.append(scope_table)
    story.append(Spacer(1, 15))

    # 5. SECCION 3: DETALLE DE HALLAZGOS
    story.append(make_heading("3. Detalle de Hallazgos"))
    story.append(Spacer(1, 6))

    findings_data = [
        [Paragraph("<b>Identificador:</b>", meta_bold), Paragraph(f"CS-{mitre}-{wazuh_rule}", meta_style)],
        [Paragraph("<b>Vulnerabilidad:</b>", meta_bold), Paragraph(f"Explotacion de {nombre}", meta_style)],
        [Paragraph("<b>Severidad:</b>", meta_bold), Paragraph(f"<font color='{r_info['bg']}'><b>{riesgo}</b></font>", meta_style)],
        [Paragraph("<b>Tecnica MITRE:</b>", meta_bold), Paragraph(f"{mitre} -- Referencia tecnica de vectores de intrusion", meta_style)],
        [Paragraph("<b>Regla Wazuh:</b>", meta_bold), Paragraph(f"ID {wazuh_rule} -- Reglas especificas CyberShield local", meta_style)]
    ]
    findings_table = Table(findings_data, colWidths=[130, 402])
    findings_table.setStyle(TableStyle([
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LINEBELOW', (0,0), (-1,-2), 0.5, BORDER_GRAY),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(findings_table)
    story.append(Spacer(1, 10))

    # PoC - Comando Lanzado
    story.append(Paragraph("<b>Prueba de Concepto (PoC) -- Comando Ejecutado:</b>", meta_bold))
    story.append(Spacer(1, 4))
    
    cmd_p = Paragraph(comando.replace(' ', '&nbsp;'), code_style)
    cmd_table = Table([[cmd_p]], colWidths=[532])
    cmd_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_GRAY),
        ('BORDER', (0,0), (-1,-1), 0.5, BORDER_GRAY),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(cmd_table)
    story.append(Spacer(1, 10))

    # PoC - Salida de Consola
    story.append(Paragraph("<b>Salida del Agente Atacante (Kali Linux):</b>", meta_bold))
    story.append(Spacer(1, 4))

    salida_truncada = '\n'.join(salida.split('\n')[:25])
    salida_formatted = salida_truncada.replace('\n', '<br/>').replace(' ', '&nbsp;')
    out_p = Paragraph(salida_formatted, output_style)
    out_table = Table([[out_p]], colWidths=[532])
    out_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), HexColor('#fafafa')),
        ('BORDER', (0,0), (-1,-1), 0.5, BORDER_GRAY),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(out_table)
    story.append(Spacer(1, 15))

    # 6. SECCION 4: PLAN DE REMEDIACION
    story.append(make_heading("4. Plan de Remediacion"))
    story.append(Spacer(1, 6))

    recsList = []
    if riesgo == 'CRITICAL':
        recsList = [
            "1. URGENTE: Aislar el segmento de red afectado en menos de 24 horas.",
            "2. Activar monitorizacion de seguridad 24/7 y escalar al CISO de forma inmediata.",
            "3. Analizar detalladamente todos los logs del SIEM en busca de persistencia en los ultimos 7 dias.",
            "4. Contratar una auditoria forense externa para evaluar el alcance real de la intrusion.",
            "5. Notificar a direccion y valorar declaracion a la AEPD si se detecta exfiltracion de datos personales."
        ]
    elif riesgo == 'HIGH':
        recsList = [
            "1. Aplicar el parche o la configuracion correctiva recomendada en menos de 72 horas.",
            "2. Revisar los logs del SIEM de los ultimos 30 dias en busca de actividad sospechosa similar.",
            "3. Segmentar de forma estricta la red local para evitar posibles movimientos laterales del atacante.",
            "4. Formar al equipo tecnico en la mitigacion y deteccion de este vector de ataque especifico."
        ]
    elif riesgo == 'MEDIUM':
        recsList = [
            "1. Programar la aplicacion de controles de seguridad en el proximo sprint de desarrollo (max 2 semanas).",
            "2. Documentar formalmente el hallazgo en el registro de riesgos de seguridad corporativo.",
            "3. Revisar y endurecer las politicas de acceso en el firewall interno de la organizacion."
        ]
    else:
        recsList = [
            "1. Registrar la recomendacion como mejora tecnica y verificar en la proxima auditoria programada.",
            "2. Informar al equipo de IT para analizar la conveniencia de anadir controles adicionales."
        ]

    for rec in recsList:
        story.append(Paragraph(rec, body_style))

    story.append(Spacer(1, 5))
    story.append(Paragraph("<b>Tiempo estimado de solucion:</b> 2 horas", body_style))

    # Construir PDF
    try:
        doc.build(story, canvasmaker=NumberedCanvas)
        print(json.dumps({"success": True, "report_id": report_id, "pdf_path": report_path}))
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Error al generar el PDF con ReportLab: {str(e)}"}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
