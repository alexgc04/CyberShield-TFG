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
    Canvas personalizado para numeración de páginas dinámica ('Página X de Y')
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
        
        # Línea y encabezado
        self.setStrokeColor(HexColor('#00cc33'))
        self.setLineWidth(1)
        self.line(40, 742, 572, 742)
        
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(HexColor('#1a1a1a'))
        self.drawString(40, 749, "CYBERSHIELD COMPANY -- AUDITORIA DE SEGURIDAD")
        
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(HexColor('#00cc33'))
        self.drawRightString(572, 749, "CONFIDENCIAL")
        
        # Línea y pie de página
        self.line(40, 50, 572, 50)
        self.setFont("Helvetica", 7)
        self.setFillColor(HexColor('#666666'))
        self.drawString(40, 38, "Generado automaticamente por CyberShield ASV -- UCLM 2025/26")
        self.drawRightString(572, 38, f"Pagina {self._pageNumber} de {page_count}")
        
        self.restoreState()


def normalize_id(aid):
    if not aid:
        return ""
    clean = str(aid).upper().replace("-", "")
    while "0" in clean:
        clean = clean.replace("0", "")
    return clean


FALLBACK_ATTACKS = {
    "LAN1": {
        "name": "MAC Flooding",
        "mitre_id": "T1557",
        "wazuh_rule_id": "100500",
        "risk_level": "HIGH",
        "description": "Satura la tabla CAM del switch enviando MACs falsas para forzar modo hub y exponer el tráfico de red completo del segmento.",
        "command": "sudo macof -i eth0 -n 5000",
        "recommendations": [
            "1. Activar Port Security en los switches para limitar las direcciones MAC permitidas por puerto.",
            "2. Configurar la seguridad de puertos para desactivar (shutdown) el puerto ante una inundacion de MACs.",
            "3. Habilitar el filtrado de tramas unicast y multicast desconocidas a nivel de switch."
        ]
    },
    "LAN2": {
        "name": "Switch Port Stealing",
        "mitre_id": "T1557",
        "wazuh_rule_id": "100501",
        "risk_level": "HIGH",
        "description": "Roba el puerto del switch de un host específico enviando tramas ARP falsificadas con su MAC, redirigiendo su tráfico al atacante de forma quirúrgica.",
        "command": "sudo arpspoof -i eth0 192.168.1.50",
        "recommendations": [
            "1. Implementar Port Security estricto vinculando las direcciones MAC conocidas a puertos especificos.",
            "2. Habilitar mecanismos de monitorizacion de puertos para detectar cambios rapidos de MAC en un mismo puerto.",
            "3. Usar encriptacion de capa de aplicacion (SSL/TLS) para proteger la confidencialidad de los datos."
        ]
    },
    "LAN3": {
        "name": "SPAN / Port Mirror",
        "mitre_id": "T1040",
        "wazuh_rule_id": "100502",
        "risk_level": "HIGH",
        "description": "Captura tráfico de red en modo promiscuo guardando los paquetes en un archivo PCAP para análisis posterior.",
        "command": "sudo tcpdump -i eth0 -c 200 -w /tmp/cs_mirror.pcap",
        "recommendations": [
            "1. Restringir el acceso fisico y logico a los puertos de administracion de los switches.",
            "2. Desactivar interfaces del switch no utilizadas para evitar conexiones promiscuas de tcpdump.",
            "3. Cifrar todo el trafico de red interno (IPsec, TLS) para inutilizar capturas no autorizadas."
        ]
    },
    "LAN4": {
        "name": "Túneles / Canales Encubiertos",
        "mitre_id": "T1048",
        "wazuh_rule_id": "100503",
        "risk_level": "HIGH",
        "description": "Simula exfiltración de datos inyectando una firma en paquetes ICMP hacia el objetivo sin necesidad de servidor externo.",
        "command": "sudo nping --icmp --data-string 'exfiltration_test' 192.168.1.1",
        "recommendations": [
            "1. Configurar firewalls de inspeccion profunda de paquetes (DPI) para bloquear trafico ICMP anomalo.",
            "2. Limitar el tamano de los payloads de respuesta ICMP echo-request y echo-reply a nivel de red.",
            "3. Monitorizar la frecuencia y volumen del trafico DNS e ICMP hacia IPs externas."
        ]
    },
    "LAN5A": {
        "name": "ARP Spoofing -- Inyección de tráfico",
        "mitre_id": "T1557",
        "wazuh_rule_id": "100504",
        "risk_level": "HIGH",
        "description": "Inyecta respuestas ARP falsas envenenando la caché del host víctima sin interceptar tráfico (fase de preparación MitM).",
        "command": "sudo arpspoof -i eth0 192.168.1.50",
        "recommendations": [
            "1. Habilitar Dynamic ARP Inspection (DAI) en los switches Capa 2 para validar tramas ARP contra la tabla DHCP Snooping.",
            "2. Configurar tablas ARP estaticas para servidores y dispositivos de infraestructura criticos.",
            "3. Implementar alertas en el SIEM para detectar picos inusuales de trafico ARP de tipo broadcast."
        ]
    },
    "LAN5B": {
        "name": "ARP Spoofing -- Man in the Middle",
        "mitre_id": "T1557",
        "wazuh_rule_id": "100504",
        "risk_level": "CRITICAL",
        "description": "Intercepta tráfico entre víctima y gateway activando IP forwarding para MitM silencioso bidireccional.",
        "command": "sudo arpspoof -i eth0 -t 192.168.1.50 192.168.1.1",
        "recommendations": [
            "1. Activar Dynamic ARP Inspection (DAI) y DHCP Snooping en los switches de acceso de la red.",
            "2. Utilizar herramientas de monitorizacion de red (como arpwatch o el agente Wazuh) para alertar sobre cambios de MAC de la puerta de enlace.",
            "3. Forzar politicas de red para usar cifrado de capa de transporte (HTTPS, SSH, SFTP)."
        ]
    },
    "LAN6": {
        "name": "DHCP Starvation / Rogue DHCP",
        "mitre_id": "T1498",
        "wazuh_rule_id": "100505",
        "risk_level": "CRITICAL",
        "description": "Agota el pool DHCP del segmento solicitando todas las IPs disponibles y permite desplegar un servidor DHCP falso.",
        "command": "sudo yersinia dhcp -G -i eth0",
        "recommendations": [
            "1. Habilitar DHCP Snooping en los switches para definir puertos confiables (trust) y no confiables (untrust).",
            "2. Configurar limites en la tasa de paquetes DHCP (rate limit) por puerto para mitigar ataques de agotamiento.",
            "3. Bloquear trafico DHCP proveniente de puertos que no pertenezcan a los servidores autorizados."
        ]
    },
    "SCAPY1": {
        "name": "Scapy SYN Scan",
        "mitre_id": "T1046",
        "wazuh_rule_id": "100506",
        "risk_level": "MEDIUM",
        "description": "Escaneo sigiloso Half-Open (SYN) usando Scapy para detectar puertos abiertos sin completar el handshake TCP.",
        "command": "sudo python3 -c \"from scapy.all import *; sr1(IP(dst='192.168.1.1')/TCP(dport=80,flags='S'))\"",
        "recommendations": [
            "1. Configurar el firewall (iptables/firewalld) para bloquear escaneos de red rapidos o sigilosos.",
            "2. Habilitar modulos de rate-limiting (como hashlimit) en las reglas del firewall para paquetes SYN.",
            "3. Utilizar IDS/IPS (como Snort o Suricata) integrados con Wazuh para bloquear IPs escaneadoras."
        ]
    },
    "SCAPY2": {
        "name": "Scapy ACK Scan",
        "mitre_id": "T1046",
        "wazuh_rule_id": "100507",
        "risk_level": "MEDIUM",
        "description": "Escaneo ACK para detectar si un puerto está filtrado por firewall stateful. RST = no filtrado, sin respuesta = filtrado.",
        "command": "sudo python3 -c \"from scapy.all import *; sr1(IP(dst='192.168.1.1')/TCP(dport=80,flags='A'))\"",
        "recommendations": [
            "1. Implementar firewalls de estado (Stateful Firewalls) que descarten paquetes ACK que no pertenecen a conexiones activas.",
            "2. Configurar el SIEM para correlacionar multiples paquetes de sondeo ACK provenientes del mismo origen.",
            "3. Cerrar y deshabilitar puertos no criticos orientados a internet."
        ]
    },
    "SCAPY3": {
        "name": "Scapy ARP Scan",
        "mitre_id": "T1018",
        "wazuh_rule_id": "100508",
        "risk_level": "LOW",
        "description": "Escaneo de descubrimiento ARP en la subred local para identificar hosts activos en Capa 2.",
        "command": "sudo python3 -c \"from scapy.all import *; arping('192.168.1.0/24')\"",
        "recommendations": [
            "1. Aislar los segmentos de red mediante VLANs independientes para mitigar el descubrimiento de dispositivos.",
            "2. Limitar las respuestas ARP no solicitadas o inusuales dentro del segmento local.",
            "3. Implementar controles de acceso de red (NAC) para evitar conexiones de hosts no autorizados."
        ]
    },
    "SCAPY4": {
        "name": "Scapy Fuzzing (ICMP/TCP)",
        "mitre_id": "T1498",
        "wazuh_rule_id": "100509",
        "risk_level": "HIGH",
        "description": "Inyecta paquetes ICMP malformados generados aleatoriamente para probar la robustez del stack de red del objetivo.",
        "command": "sudo python3 -c \"from scapy.all import *; send(fuzz(IP(dst='192.168.1.1')/ICMP()),count=100)\"",
        "recommendations": [
            "1. Aplicar los parches de seguridad y actualizaciones del sistema operativo mas recientes para corregir fallos de desbordamiento de pila.",
            "2. Validar exhaustivamente las entradas y tamano de payloads en los servicios de red expuestos.",
            "3. Monitorizar caidas de servicios mediante monitores de estado (monit, systemd) para reinicios automaticos."
        ]
    },
    "BF1": {
        "name": "Fuerza Bruta SSH (Medusa)",
        "mitre_id": "T1110",
        "wazuh_rule_id": "100510",
        "risk_level": "HIGH",
        "description": "Ataque de fuerza bruta contra servicio SSH usando diccionario rockyou.txt con Medusa.",
        "command": "sudo medusa -h 192.168.1.50 -u root -P /usr/share/wordlists/rockyou.txt -M ssh",
        "recommendations": [
            "1. Deshabilitar el acceso root directo mediante SSH (PermitRootLogin no en /etc/ssh/sshd_config).",
            "2. Forzar la autenticacion mediante llaves criptograficas publicas/privadas y desactivar el acceso por contrasena.",
            "3. Implementar Fail2ban para bloquear temporal o permanentemente direcciones IP con multiples intentos fallidos de conexion."
        ]
    },
    "BF2": {
        "name": "Fuerza Bruta Web (Hydra)",
        "mitre_id": "T1110",
        "wazuh_rule_id": "100511",
        "risk_level": "HIGH",
        "description": "Ataque de fuerza bruta contra formulario web HTTP usando diccionario rockyou.txt con Hydra.",
        "command": "sudo hydra -l admin -P /usr/share/wordlists/rockyou.txt 192.168.1.50 http-post-form '/login:username=^USER^&password=^PASS^:Invalid'",
        "recommendations": [
            "1. Implementar sistemas de bloqueo de cuentas de usuario tras X intentos fallidos consecutivos (politicas de bloqueo).",
            "2. Incorporar mecanismos de validacion humana como CAPTCHA en los formularios de autenticacion.",
            "3. Habilitar doble factor de autenticacion (2FA) para el acceso a las cuentas administrativas."
        ]
    },
    "PRIV1": {
        "name": "Escalada de Privilegios Local",
        "mitre_id": "T1548",
        "wazuh_rule_id": "100512",
        "risk_level": "CRITICAL",
        "description": "Enumera vectores de escalada de privilegios local: binarios SUID, permisos sudo y tareas cron programadas.",
        "command": "sudo sh -c 'echo \"=== SUID ===\" && find / -perm -4000 2>/dev/null && echo \"=== SUDO ===\" && sudo -l 2>/dev/null && echo \"=== CRON ===\" && cat /etc/crontab 2>/dev/null'",
        "recommendations": [
            "1. Auditar periodicamente todos los archivos del sistema que tengan activos los bits SUID/SGID y eliminar permisos innecesarios.",
            "2. Restringir los permisos de ejecucion sobre compiladores locales (como gcc, clang) para usuarios no administradores.",
            "3. Endurecer la configuracion del archivo /etc/sudoers evitando directivas NOPASSWD genericas."
        ]
    },
    "PRIV2": {
        "name": "Escalada de Dominio (Kerberos ASREPRoast)",
        "mitre_id": "T1558",
        "wazuh_rule_id": "100513",
        "risk_level": "CRITICAL",
        "description": "Enumera usuarios de Active Directory con kerbrute y extrae hashes Kerberos AS-REP para cracking offline.",
        "command": "sudo sh -c 'kerbrute userenum --dc 10.10.10.100 -d corp.local /usr/share/wordlists/usernames.txt && impacket-GetNPUsers corp.local/ -dc-ip 10.10.10.100 -no-pass'",
        "recommendations": [
            "1. Desactivar la directiva 'Do not require Kerberos preauthentication' para todas las cuentas de usuario de Active Directory.",
            "2. Utilizar contrasenas de gran longitud y complejidad para cuentas de servicio susceptibles a ataques offline.",
            "3. Configurar alertas en el Directorio Activo para detectar peticiones AS-REQ anomalas de cuentas sin preautenticacion."
        ]
    }
}


def main():
    # Leer JSON desde stdin
    try:
        input_data = json.load(sys.stdin)
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Error al decodificar JSON de stdin: {str(e)}"}), file=sys.stderr)
        sys.exit(1)

    body_data = input_data.get("body") or input_data.get("data") or input_data or {}

    # Desempaquetar doble codificación de n8n si existe
    if isinstance(body_data, dict) and len(body_data) == 1 and not body_data.get("attack_id"):
        first_key = list(body_data.keys())[0]
        if first_key.strip().startswith("{"):
            try:
                body_data = json.loads(first_key)
            except Exception:
                pass

    # Cargar plantillas desde el JSON local para fallbacks de metadatos
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

    # Resolver fallbacks desde el diccionario de ataques simulados estático
    norm_id = normalize_id(attack_id)
    fallback_info = FALLBACK_ATTACKS.get(norm_id) or {}

    # Resolver campos de datos con prioridad: body_data > fallback_info > db_tmpl > generico
    nombre = body_data.get("attack_name") or fallback_info.get("name") or (tmpl.get("name") if tmpl else None) or body_data.get("id") or 'Ataque de Auditoria'
    
    empresa = body_data.get("company_name") or 'CyberShield Company'
    if empresa == 'Empresa Auditada' or not empresa.strip():
        empresa = 'CyberShield Company'

    mitre = body_data.get("mitre_id") or fallback_info.get("mitre_id") or (tmpl.get("mitre_id") if tmpl else None) or 'T1557'
    
    # Resolver exit_code primero para evitar error de referencia
    exit_code = body_data.get("ssh_exit_code")
    if exit_code is None:
        exit_code = '-'

    # Calcular riesgo dinámico basado en exit_code
    riesgo_base = (body_data.get("risk_level") or fallback_info.get("risk_level") or (tmpl.get("risk_level") if tmpl else None) or 'MEDIUM').upper()
    is_success = False
    try:
        val = str(exit_code).strip()
        if val == '0':
            is_success = True
    except Exception:
        pass

    if is_success:
        # Si tiene éxito, se reporta la severidad real del ataque
        riesgo = riesgo_base
    else:
        # Si falla o es bloqueado, se rebaja directamente a LOW (Mitigado)
        riesgo = 'LOW'

    desc = body_data.get("description") or fallback_info.get("description") or (tmpl.get("description") if tmpl else None) or 'Simulacion de intrusion defensiva.'
    
    comando = body_data.get("command_executed")
    if not comando or comando in ['(no disponible)', 'N/A', '']:
        comando = fallback_info.get("command") or (tmpl.get("command") if tmpl else None) or 'sudo -l'

    salida = body_data.get("ssh_output") or '(sin salida de consola)'
    wazuh_rule = body_data.get("wazuh_rule_id") or fallback_info.get("wazuh_rule_id") or (str(tmpl.get("wazuh_rule_id")) if tmpl else None) or '100499'
    report_id = body_data.get("report_id") or f"CS-RPT-{int(sys.argv[1]) if len(sys.argv) > 1 else 'GEN'}"
    
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
    doc.title = f"Reporte de Seguridad - {nombre}"
    doc.author = "CyberShield Security"
    doc.subject = f"Auditoria de {nombre} para {empresa}"

    styles = getSampleStyleSheet()
    
    # Paleta de Colores
    VERDE_CYBER = HexColor('#00cc33')
    CHARCOAL = HexColor('#1a1a1a')
    MUTED_GRAY = HexColor('#555555')
    LIGHT_GRAY = HexColor('#f9f9f9')
    BORDER_GRAY = HexColor('#e5e7eb')

    # Estilos de Texto (Leading corregido para evitar solapamientos)
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        textColor=CHARCOAL,
        leading=24,
        spaceAfter=8
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=VERDE_CYBER,
        leading=12,
        spaceAfter=18
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
    if not is_success and riesgo == "LOW":
        r_info = {"bg": "#00cc33", "fg": "#ffffff", "text": "RIESGO BAJO / MITIGADO -- Intento de ataque bloqueado por el objetivo"}

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

    recsList = fallback_info.get("recommendations") or []
    if not recsList:
        # Fallbacks genéricos si no coincide con los 15 ataques conocidos
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
