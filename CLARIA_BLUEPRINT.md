# ClarIA — Blueprint ejecutable (v1)

Este documento define una arquitectura **lista para implementar** con 4 agentes encadenados: Cartógrafo, Examinador Socrático, Gap Finder y Mentor de Nivelación.

## 1) Objetivo del sistema

Construir un ciclo adaptativo de estudio para oposiciones:
1. Ingesta de PDF legal y construcción de grafo de conocimiento.
2. Evaluación socrática por nodo.
3. Diagnóstico de lagunas reales (no solo fallo superficial).
4. Remediación corta y regreso al nodo objetivo.

---

## 2) Contrato de datos global

Todos los agentes reciben y devuelven JSON con metadatos comunes.

```json
{
  "student_id": "uuid",
  "exam_track": "Gestion_Civil",
  "session_id": "uuid",
  "graph_version": "2026-03-21",
  "current_node_id": "NODO_001",
  "attempt": 1,
  "timestamp_utc": "2026-03-21T12:00:00Z"
}
```

### 2.1 Modelo de dominio mínimo

```json
{
  "node": {
    "id": "NODO_001",
    "tema": "Ley 39/2015",
    "concepto": "Silencio administrativo",
    "articulo_referencia": ["24", "25"],
    "dificultad": 3,
    "frecuencia_examen": "alta",
    "errores_tipicos": ["Confundir silencio con caducidad"],
    "dependencias": ["NODO_0007", "NODO_0012"],
    "confidence": "alta"
  },
  "relation": {
    "from": "NODO_0007",
    "to": "NODO_001",
    "tipo": "requiere"
  }
}
```

---

## 3) Agente 1 — Cartógrafo (Ingesta y estructura)

## 3.1 Input

```json
{
  "meta": {"student_id": "uuid", "exam_track": "Gestion_Civil", "session_id": "uuid"},
  "source": {
    "document_id": "ley_39_2015_vigente",
    "mime": "application/pdf",
    "text": "...texto extraído del PDF..."
  }
}
```

## 3.2 Prompt (producción)

```text
Actúa como un Ingeniero de Conocimiento experto en oposiciones de {exam_track}.
Tarea: Analiza el texto legal adjunto y extrae una red de dependencias lógicas.

Reglas de extracción:
1) Identifica 'Nodos' (conceptos atómicos, artículos clave o procedimientos).
2) Define 'Aristas' de dependencia: A -> B si B requiere entender A.
3) Clasifica dificultad (1-5) y frecuencia de examen (alta/media/baja).
4) Añade articulo_referencia y errores_tipicos por nodo.
5) Si no hay evidencia textual suficiente, marca confidence="baja".

Devuelve EXCLUSIVAMENTE JSON válido con esta estructura:
{
  "nodos": [{
    "id": "",
    "tema": "",
    "concepto": "",
    "articulo_referencia": [],
    "dificultad": 1,
    "frecuencia_examen": "alta|media|baja",
    "errores_tipicos": [],
    "dependencias": [],
    "confidence": "alta|media|baja"
  }],
  "relaciones": [{"from": "", "to": "", "tipo": "requiere"}],
  "quality": {"cobertura_estimada": 0.0, "observaciones": ""}
}
Sin texto explicativo fuera del JSON.
```

## 3.3 Persistencia recomendada (Neo4j)

```cypher
MERGE (n:Concept {id: $id})
SET n.tema = $tema,
    n.concepto = $concepto,
    n.articulo_referencia = $articulo_referencia,
    n.dificultad = $dificultad,
    n.frecuencia_examen = $frecuencia_examen,
    n.errores_tipicos = $errores_tipicos,
    n.confidence = $confidence,
    n.graph_version = $graph_version;

MATCH (a:Concept {id: $from}), (b:Concept {id: $to})
MERGE (a)-[:REQUIERE]->(b);
```

---

## 4) Agente 2 — Examinador Socrático (Diagnóstico inicial)

## 4.1 Input

```json
{
  "meta": {"student_id": "uuid", "session_id": "uuid", "current_node_id": "NODO_001"},
  "node": {
    "id": "NODO_001",
    "concepto": "Silencio administrativo",
    "tema": "Ley 39/2015",
    "dependencias": ["NODO_0007", "NODO_0012"]
  }
}
```

## 4.2 Prompt (producción)

```text
Actúa como Miembro del Tribunal de Oposiciones.
Objetivo: validar comprensión profunda del concepto {concepto} (nodo {node_id}).

Instrucciones:
- No uses tipo test.
- Plantea un micro-caso práctico de máximo 2 frases.
- Evalúa el porqué del procedimiento, no memoria literal de artículos.
- Tono profesional, exigente y motivador.

Devuelve JSON:
{
  "pregunta": "",
  "criterios_evaluacion": [
    "fundamento normativo",
    "lógica del procedimiento",
    "distinción frente a concepto vecino"
  ],
  "nodo_objetivo": "{node_id}",
  "dificultad_pregunta": 1
}
```

## 4.3 Evaluación por rúbrica (0-2)

- fundamento_normativo
- logica_causal
- aplicacion_caso
- diferenciacion_conceptual

Total: 0-8.

---

## 5) Agente 3 — Analista de Lagunas (Gap Finder)

## 5.1 Input

```json
{
  "meta": {"student_id": "uuid", "session_id": "uuid", "current_node_id": "NODO_001"},
  "question": {"pregunta": "..."},
  "user_answer": "...respuesta del usuario...",
  "rubric_scores": {
    "fundamento_normativo": 1,
    "logica_causal": 0,
    "aplicacion_caso": 1,
    "diferenciacion_conceptual": 0
  },
  "prereq_graph": {
    "current": "NODO_001",
    "dependencias_directas": ["NODO_0007", "NODO_0012"],
    "dependencias_nivel_2": ["NODO_0003"]
  }
}
```

## 5.2 Prompt (producción)

```text
Eres el Motor de Diagnóstico de ClarIA.
Input 1: respuesta del usuario.
Input 2: puntuación por rúbrica.
Input 3: grafo de prerrequisitos.

Tarea:
1) Determina si domina el nodo objetivo o hay laguna.
2) Si hay error, identifica el nodo real de fallo (objetivo o prerequisito).
3) Etiqueta tipo de error: conceptual|procedimental|terminologico.

Regla:
- Estado=Dominado si total_rubrica >=6 y no hay error crítico conceptual.
- Si error conceptual en prerequisito, prioriza ese nodo como nodo_fallo.

Salida JSON:
{
  "estado": "Dominado|Laguna Detectada",
  "nodo_fallo": "NODO_x",
  "tipo_error": "conceptual|procedimental|terminologico",
  "confianza": "alta|media|baja",
  "explicacion_gap": "",
  "siguiente_accion": "avanzar|remediar|reevaluar"
}
```

---

## 6) Agente 4 — Mentor de Nivelación (Remediación)

## 6.1 Input

```json
{
  "meta": {"student_id": "uuid", "session_id": "uuid"},
  "context": {
    "tema_actual": "Silencio administrativo",
    "nodo_actual": "NODO_001",
    "nodo_fallo": "NODO_0007",
    "tipo_error": "conceptual",
    "explicacion_gap": "Confunde silencio negativo con caducidad"
  }
}
```

## 6.2 Prompt (producción)

```text
Actúa como Preparador de Oposiciones experto en simplificación.
Contexto: el usuario falla en {tema_actual} por laguna en {nodo_fallo}.

Escribe una “Píldora de Claridad” (máximo 150 palabras) con:
1) Analogía sencilla del concepto base.
2) Diferencia clave que causó la confusión.
3) Regla mnemotécnica.
4) Frase de cierre que reconecte con {tema_actual}.
5) mini_check: una pregunta de verificación (1 línea).

Devuelve JSON:
{
  "pill": "",
  "mini_check": "",
  "ready_to_return": true
}
```

---

## 7) Orquestador (state machine)

## 7.1 Estados

- `INGEST_PENDING`
- `GRAPH_READY`
- `QUESTION_READY`
- `ANSWER_RECEIVED`
- `GAP_ANALYZED`
- `REMEDIATION_READY`
- `NODE_MASTERED`

## 7.2 Transiciones

1. `INGEST_PENDING -> GRAPH_READY` cuando Cartógrafo devuelve JSON válido.
2. `GRAPH_READY -> QUESTION_READY` al seleccionar nodo.
3. `QUESTION_READY -> ANSWER_RECEIVED` al recibir respuesta del usuario.
4. `ANSWER_RECEIVED -> GAP_ANALYZED` tras Gap Finder.
5. `GAP_ANALYZED -> NODE_MASTERED` si estado=Dominado.
6. `GAP_ANALYZED -> REMEDIATION_READY` si estado=Laguna Detectada.
7. `REMEDIATION_READY -> QUESTION_READY` tras mini_check aprobado.

## 7.3 Reglas pedagógicas

- 2 fallos seguidos en mismo nodo -> bajar a dependencia directa.
- 3 nodos dominados seguidos -> subir dificultad de micro-caso.
- 1 fallo terminológico con buena lógica -> remediación corta + reintento inmediato.

---

## 8) API mínima (ejemplo REST)

### POST /v1/ingest
Recibe PDF/texto, llama Cartógrafo, persiste grafo.

### POST /v1/session/{session_id}/question
Selecciona nodo y devuelve pregunta socrática.

### POST /v1/session/{session_id}/answer
Guarda respuesta, ejecuta Gap Finder y decide flujo.

### POST /v1/session/{session_id}/remediate
Ejecuta Mentor, devuelve píldora y mini_check.

### POST /v1/session/{session_id}/mini-check
Evalúa mini_check y retorna a pregunta del nodo objetivo.

---

## 9) Pseudocódigo del pipeline

```python
def run_learning_turn(session_id, node_id, user_answer=None):
    if not graph_exists(session_id):
        graph = call_cartografo(session_id)
        save_graph(graph)

    if user_answer is None:
        q = call_examinador(session_id, node_id)
        return {"state": "QUESTION_READY", "question": q}

    rubric = score_answer(user_answer)
    gap = call_gap_finder(session_id, node_id, user_answer, rubric)

    if gap["estado"] == "Dominado":
        mark_mastered(session_id, node_id)
        return {"state": "NODE_MASTERED", "next_node": pick_next_node(session_id)}

    pill = call_mentor(session_id, node_id, gap)
    return {"state": "REMEDIATION_READY", "pill": pill}
```

---

## 10) Criterios de calidad y observabilidad

- JSON parse success rate > 99%.
- Latencia p95 por agente < 4s.
- Tasa de “nodo dominado tras remediación” por tema.
- Drift de diagnóstico (cambios de nodo_fallo incoherentes).

Logging por evento:
- `agent_name`, `input_hash`, `output_hash`, `latency_ms`, `parse_ok`, `decision`.

---

## 11) Plan de implementación (7 días)

Día 1-2:
- Definir schemas JSON (Pydantic/Zod).
- Endpoint ingest + persistencia grafo.

Día 3:
- Examinador + endpoint pregunta.

Día 4:
- Gap Finder + rúbrica automática.

Día 5:
- Mentor + mini_check.

Día 6:
- Orquestador + state machine + retries.

Día 7:
- Métricas, tests end-to-end y ajuste de prompts.

---

## 12) Checklist de salida a producción

- [ ] Validación estricta de JSON en todos los agentes.
- [ ] Reintento con “repair prompt” si JSON inválido.
- [ ] Versionado de grafo por documento legal.
- [ ] Trazabilidad completa por sesión y nodo.
- [ ] Tests E2E con casos de laguna conceptual real.

