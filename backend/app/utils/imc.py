"""IMC (Body Mass Index) calculation utilities."""
from decimal import Decimal, ROUND_HALF_UP
from app.models.volunteer import BandaIMC
from app.config import settings


def calculate_imc(peso_kg: Decimal, estatura_m: Decimal) -> Decimal:
    """
    Calculate IMC (BMI) with proper decimal precision.
    
    Formula: IMC = peso_kg / (estatura_m²)
    
    Args:
        peso_kg: Weight in kilograms (Decimal)
        estatura_m: Height in meters (Decimal)
    
    Returns:
        IMC rounded to 2 decimal places using half-up rounding.
    """
    if estatura_m <= 0:
        raise ValueError("La estatura debe ser mayor a 0")
    if peso_kg <= 0:
        raise ValueError("El peso debe ser mayor a 0")
    
    # Convert to Decimal if needed
    peso = Decimal(str(peso_kg))
    estatura = Decimal(str(estatura_m))
    
    # Calculate IMC with high precision
    imc_raw = peso / (estatura * estatura)
    
    # Round to 2 decimal places using half-up
    imc = imc_raw.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    return imc


def get_banda_imc(imc: Decimal) -> BandaIMC:
    """
    Determine the IMC band/category based on thresholds.
    
    Thresholds:
        - LOW (Amarillo): IMC < 18.00 kg/m²
        - NORMAL (Verde): 18.00 ≤ IMC ≤ 27.00 kg/m²
        - HIGH (Rojo): IMC > 27.00 kg/m²
    
    Args:
        imc: Calculated IMC value (Decimal)
    
    Returns:
        BandaIMC enum value (LOW, NORMAL, or HIGH)
    """
    imc_value = Decimal(str(imc))
    low_threshold = Decimal(str(settings.IMC_LOW_THRESHOLD))
    high_threshold = Decimal(str(settings.IMC_HIGH_THRESHOLD))
    
    if imc_value < low_threshold:
        return BandaIMC.LOW
    elif imc_value > high_threshold:
        return BandaIMC.HIGH
    else:
        return BandaIMC.NORMAL


def get_banda_color(banda: BandaIMC) -> str:
    """
    Get the color associated with an IMC band.
    
    Args:
        banda: BandaIMC enum value
    
    Returns:
        Color name as string
    """
    colors = {
        BandaIMC.LOW: "yellow",      # Amarillo
        BandaIMC.NORMAL: "green",    # Verde
        BandaIMC.HIGH: "red"         # Rojo
    }
    return colors.get(banda, "gray")


def get_banda_label(banda: BandaIMC) -> str:
    """
    Get the Spanish label for an IMC band.
    
    Args:
        banda: BandaIMC enum value
    
    Returns:
        Spanish label string
    """
    labels = {
        BandaIMC.LOW: "Bajo",
        BandaIMC.NORMAL: "Normal",
        BandaIMC.HIGH: "Alto"
    }
    return labels.get(banda, "Desconocido")
