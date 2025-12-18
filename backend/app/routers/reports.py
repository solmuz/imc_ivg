"""Reports generation router."""
import csv
import io
from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

from app.database import get_db
from app.models.user import User, UserRole
from app.models.project import Project
from app.models.volunteer import Volunteer, Sexo, BandaIMC
from app.models.audit import EntityType, ActionType
from app.utils.auth import get_current_active_user
from app.utils.imc import get_banda_color, get_banda_label
from app.utils.audit import create_audit_log

router = APIRouter(prefix="/api/reports", tags=["Reports"])


def get_banda_reportlab_color(banda: BandaIMC):
    """Get ReportLab color for IMC band."""
    color_map = {
        BandaIMC.LOW: colors.yellow,
        BandaIMC.NORMAL: colors.lightgreen,
        BandaIMC.HIGH: colors.salmon
    }
    return color_map.get(banda, colors.white)


@router.get("/project/{project_id}/csv")
async def export_csv(
    request: Request,
    project_id: int,
    sexo: Optional[Sexo] = None,
    banda_imc: Optional[BandaIMC] = None,
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Export project volunteers to CSV."""
    # Get project
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    # Build query
    query = db.query(Volunteer).options(
        joinedload(Volunteer.registrar)
    ).filter(
        Volunteer.project_id == project_id,
        Volunteer.is_deleted == False
    )
    
    # Apply filters
    if sexo:
        query = query.filter(Volunteer.sexo == sexo)
    if banda_imc:
        query = query.filter(Volunteer.banda_imc == banda_imc)
    if fecha_desde:
        query = query.filter(Volunteer.created_at >= fecha_desde)
    if fecha_hasta:
        query = query.filter(Volunteer.created_at <= fecha_hasta)
    
    volunteers = query.order_by(Volunteer.correlativo).all()
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        'Correlativo', 'Sexo', 'Peso (kg)', 'Estatura (m)', 
        'IMC', 'Categoría', 'Fecha Registro', 'Registrado por'
    ])
    
    # Data
    for v in volunteers:
        writer.writerow([
            f"Voluntario {v.correlativo}",
            v.sexo.value,
            f"{v.peso_kg:.2f}",
            f"{v.estatura_m:.2f}",
            f"{v.imc:.2f}",
            get_banda_label(v.banda_imc),
            v.created_at.strftime("%Y-%m-%d %H:%M"),
            v.registrar.nombre if v.registrar else "N/A"
        ])
    
    # Audit log for export
    ip_address = request.client.host if request.client else None
    create_audit_log(
        db=db, user=current_user, entidad=EntityType.REPORT,
        entidad_id=project_id, accion=ActionType.EXPORT,
        project_id=project_id,
        detalle_after={"format": "CSV", "records": len(volunteers)},
        ip_address=ip_address
    )
    
    # Return CSV file
    output.seek(0)
    filename = f"reporte_{project.nombre}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/project/{project_id}/pdf")
async def export_pdf(
    request: Request,
    project_id: int,
    sexo: Optional[Sexo] = None,
    banda_imc: Optional[BandaIMC] = None,
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Export project volunteers to PDF."""
    # Get project with responsable
    project = db.query(Project).options(
        joinedload(Project.responsable)
    ).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    # Build query
    query = db.query(Volunteer).options(
        joinedload(Volunteer.registrar)
    ).filter(
        Volunteer.project_id == project_id,
        Volunteer.is_deleted == False
    )
    
    # Apply filters
    if sexo:
        query = query.filter(Volunteer.sexo == sexo)
    if banda_imc:
        query = query.filter(Volunteer.banda_imc == banda_imc)
    if fecha_desde:
        query = query.filter(Volunteer.created_at >= fecha_desde)
    if fecha_hasta:
        query = query.filter(Volunteer.created_at <= fecha_hasta)
    
    volunteers = query.order_by(Volunteer.correlativo).all()
    
    # Calculate statistics
    if volunteers:
        imc_values = [float(v.imc) for v in volunteers]
        stats = {
            'total': len(volunteers),
            'promedio': sum(imc_values) / len(imc_values),
            'minimo': min(imc_values),
            'maximo': max(imc_values),
            'bajo': sum(1 for v in volunteers if v.banda_imc == BandaIMC.LOW),
            'normal': sum(1 for v in volunteers if v.banda_imc == BandaIMC.NORMAL),
            'alto': sum(1 for v in volunteers if v.banda_imc == BandaIMC.HIGH),
        }
    else:
        stats = {'total': 0, 'promedio': 0, 'minimo': 0, 'maximo': 0, 'bajo': 0, 'normal': 0, 'alto': 0}
    
    # Create PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(letter), topMargin=0.5*inch)
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle('Title', parent=styles['Title'], fontSize=16, spaceAfter=12)
    elements.append(Paragraph(f"Reporte de Proyecto: {project.nombre}", title_style))
    
    # Project info
    info_style = ParagraphStyle('Info', parent=styles['Normal'], fontSize=10, spaceAfter=6)
    elements.append(Paragraph(f"Responsable: {project.responsable.nombre if project.responsable else 'N/A'}", info_style))
    elements.append(Paragraph(f"Fecha de inicio: {project.fecha_inicio}", info_style))
    elements.append(Paragraph(f"Generado por: {current_user.nombre}", info_style))
    elements.append(Paragraph(f"Fecha de generación: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", info_style))
    elements.append(Spacer(1, 12))
    
    # Statistics
    elements.append(Paragraph("Estadísticas:", styles['Heading3']))
    stats_data = [
        ['Total Voluntarios', 'IMC Promedio', 'IMC Mínimo', 'IMC Máximo', 'Bajo (Amarillo)', 'Normal (Verde)', 'Alto (Rojo)'],
        [str(stats['total']), f"{stats['promedio']:.2f}", f"{stats['minimo']:.2f}", f"{stats['maximo']:.2f}",
         str(stats['bajo']), str(stats['normal']), str(stats['alto'])]
    ]
    stats_table = Table(stats_data, colWidths=[1.3*inch]*7)
    stats_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('BACKGROUND', (4, 1), (4, 1), colors.yellow),
        ('BACKGROUND', (5, 1), (5, 1), colors.lightgreen),
        ('BACKGROUND', (6, 1), (6, 1), colors.salmon),
    ]))
    elements.append(stats_table)
    elements.append(Spacer(1, 12))
    
    # Volunteers table
    elements.append(Paragraph("Detalle de Voluntarios:", styles['Heading3']))
    
    if volunteers:
        table_data = [['#', 'Sexo', 'Peso (kg)', 'Estatura (m)', 'IMC', 'Categoría', 'Fecha', 'Registrado por']]
        row_colors = []
        
        for v in volunteers:
            table_data.append([
                f"Vol. {v.correlativo}",
                v.sexo.value,
                f"{v.peso_kg:.2f}",
                f"{v.estatura_m:.2f}",
                f"{v.imc:.2f}",
                get_banda_label(v.banda_imc),
                v.created_at.strftime("%Y-%m-%d"),
                v.registrar.nombre[:15] if v.registrar else "N/A"
            ])
            row_colors.append(get_banda_reportlab_color(v.banda_imc))
        
        table = Table(table_data, colWidths=[0.7*inch, 0.7*inch, 0.8*inch, 0.9*inch, 0.7*inch, 0.9*inch, 1*inch, 1.2*inch])
        
        style_commands = [
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]
        
        # Add row colors based on IMC band
        for i, color in enumerate(row_colors, start=1):
            style_commands.append(('BACKGROUND', (0, i), (-1, i), color))
        
        table.setStyle(TableStyle(style_commands))
        elements.append(table)
    else:
        elements.append(Paragraph("No hay voluntarios registrados con los filtros aplicados.", info_style))
    
    # Legend
    elements.append(Spacer(1, 20))
    elements.append(Paragraph("Leyenda de colores:", styles['Heading4']))
    legend_data = [
        ['Amarillo: IMC < 18.00 (Bajo)', 'Verde: 18.00 ≤ IMC ≤ 27.00 (Normal)', 'Rojo: IMC > 27.00 (Alto)']
    ]
    legend_table = Table(legend_data, colWidths=[2.5*inch]*3)
    legend_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), colors.yellow),
        ('BACKGROUND', (1, 0), (1, 0), colors.lightgreen),
        ('BACKGROUND', (2, 0), (2, 0), colors.salmon),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
    ]))
    elements.append(legend_table)
    
    # Build PDF
    doc.build(elements)
    
    # Audit log for export
    ip_address = request.client.host if request.client else None
    create_audit_log(
        db=db, user=current_user, entidad=EntityType.REPORT,
        entidad_id=project_id, accion=ActionType.EXPORT,
        project_id=project_id,
        detalle_after={"format": "PDF", "records": len(volunteers)},
        ip_address=ip_address
    )
    
    # Return PDF file
    buffer.seek(0)
    filename = f"reporte_{project.nombre}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
