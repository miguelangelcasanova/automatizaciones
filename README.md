# Simulador didáctico de monitor

Aplicación web estática para explicar el funcionamiento de un monitor LCD/LED en el módulo de Mantenimiento de Equipos de Vídeo del Ciclo de Grado Superior de Mantenimiento Electrónico.

## Funcionalidades

- Vista de monitor funcional con patrones de vídeo, brillo, contraste y temperatura de color.
- Diagrama de bloques con fuente, placa main, T-CON, panel, retroiluminación, microcontrolador, entradas y teclado.
- Animación del flujo de alimentación, procesado, temporización, iluminación e imagen visible.
- Modo paso a paso para explicar cada etapa en clase.
- Escenarios de avería con síntomas, bloques implicados y medidas esperables.
- Guías de reparación por avería con pasos de comprobación, sustitución segura e instrumentación recomendada.
- Medidas simuladas de tensión, frecuencia horizontal, frecuencia vertical y porcentaje de backlight.

## Uso local

Abre `index.html` directamente en el navegador o sirve la carpeta con cualquier servidor estático, por ejemplo:

```bash
python3 -m http.server 8000
```

Después visita `http://localhost:8000`.
