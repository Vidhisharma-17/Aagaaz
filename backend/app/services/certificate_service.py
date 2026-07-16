from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from uuid import uuid4

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)

from app.core.supabase_client import supabase


# ============================================================
# CERTIFICATE CONFIGURATION
# ============================================================

CERTIFICATE_BUCKET = "certificates"


# ============================================================
# GENERATE CERTIFICATE PDF
# ============================================================

def generate_certificate_pdf(
    worker_name: str,
    event_name: str,
    location: str,
    completion_date: str,
    waste_collected_kg: float,
    reward_amount: float,
):

    buffer = BytesIO()

    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=0.8 * inch,
        leftMargin=0.8 * inch,
        topMargin=0.8 * inch,
        bottomMargin=0.8 * inch,
    )

    title_style = ParagraphStyle(
        name="CertificateTitle",
        fontName="Helvetica-Bold",
        fontSize=28,
        leading=34,
        alignment=1,
        spaceAfter=25,
    )

    subtitle_style = ParagraphStyle(
        name="CertificateSubtitle",
        fontName="Helvetica",
        fontSize=16,
        leading=22,
        alignment=1,
        spaceAfter=20,
    )

    name_style = ParagraphStyle(
        name="WorkerName",
        fontName="Helvetica-Bold",
        fontSize=24,
        leading=30,
        alignment=1,
        spaceAfter=20,
    )

    body_style = ParagraphStyle(
        name="CertificateBody",
        fontName="Helvetica",
        fontSize=13,
        leading=22,
        alignment=1,
        spaceAfter=15,
    )

    footer_style = ParagraphStyle(
        name="CertificateFooter",
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=18,
        alignment=1,
    )

    story = []

    story.append(
        Paragraph(
            "CERTIFICATE OF CONTRIBUTION",
            title_style,
        )
    )

    story.append(
        Paragraph(
            "EcoVisionAI Clean City Initiative",
            subtitle_style,
        )
    )

    story.append(
        Spacer(1, 20)
    )

    story.append(
        Paragraph(
            "This certificate is proudly presented to",
            body_style,
        )
    )

    story.append(
        Paragraph(
            worker_name,
            name_style,
        )
    )

    story.append(
        Paragraph(
            (
                "for successfully contributing to the cleanup "
                "activity organized for "
                f"<b>{event_name}</b> at "
                f"<b>{location}</b>."
            ),
            body_style,
        )
    )

    story.append(
        Paragraph(
            (
                "The participant helped collect "
                f"<b>{waste_collected_kg:.2f} kg</b> of waste "
                "and contributed toward cleaner cities and "
                "sustainable waste management."
            ),
            body_style,
        )
    )

    story.append(
        Spacer(1, 15)
    )

    story.append(
        Paragraph(
            f"Completion Date: <b>{completion_date}</b>",
            body_style,
        )
    )

    story.append(
        Paragraph(
            f"Reward Earned: <b>INR {reward_amount:.2f}</b>",
            body_style,
        )
    )

    story.append(
        Spacer(1, 30)
    )

    story.append(
        Paragraph(
            "EcoVisionAI",
            footer_style,
        )
    )

    story.append(
        Paragraph(
            "AI Powered Waste Management Platform",
            body_style,
        )
    )

    document.build(story)

    pdf_bytes = buffer.getvalue()

    buffer.close()

    return pdf_bytes


# ============================================================
# UPLOAD CERTIFICATE TO SUPABASE STORAGE
# ============================================================

def upload_certificate_pdf(
    user_id: str,
    application_id: str,
    pdf_bytes: bytes,
):

    file_path = (
        f"{user_id}/"
        f"{application_id}/"
        f"{uuid4().hex}.pdf"
    )

    supabase.storage.from_(
        CERTIFICATE_BUCKET
    ).upload(
        path=file_path,
        file=pdf_bytes,
        file_options={
            "content-type": "application/pdf",
            "upsert": "false",
        },
    )

    certificate_url = (
        supabase
        .storage
        .from_(CERTIFICATE_BUCKET)
        .get_public_url(file_path)
    )

    return file_path, certificate_url


# ============================================================
# CREATE CERTIFICATE
# ============================================================

def create_certificate(
    user,
    application,
    job,
    waste_collected_kg: float,
    reward_amount: float,
):

    completion_date = datetime.now(
        timezone.utc
    ).strftime("%d %B %Y")

    user_metadata = (
        user.user_metadata
        if user.user_metadata
        else {}
    )

    worker_name = (
        user_metadata.get("full_name")
        or user_metadata.get("name")
        or user.email
        or "EcoVisionAI Contributor"
    )

    pdf_bytes = generate_certificate_pdf(
        worker_name=worker_name,
        event_name=job["event_name"],
        location=job["location"],
        completion_date=completion_date,
        waste_collected_kg=waste_collected_kg,
        reward_amount=reward_amount,
    )

    file_path, certificate_url = (
        upload_certificate_pdf(
            user_id=user.id,
            application_id=application["id"],
            pdf_bytes=pdf_bytes,
        )
    )

    return {
        "certificate_path": file_path,
        "certificate_url": certificate_url,
        "completion_date": completion_date,
    }