// Adapted from public/perfil-usuari.html; options keep the original stored values.
export const personSections = [
  [
    "Datos personales",
    [
      {
        "key": "tipus_document",
        "label": "Tipo de documento",
        "type": "select",
        "options": [
          "DNI",
          "NIE",
          "Passaport"
        ]
      },
      {
        "key": "genere",
        "label": "Género",
        "type": "select",
        "options": [
          "HOME",
          "DONA",
          "NO BINARI"
        ]
      },
      {
        "key": "adreca",
        "label": "Dirección",
        "type": "text"
      },
      {
        "key": "barri_residencia",
        "label": "Barrio",
        "type": "select",
        "options": [
          "Centre",
          "Nord",
          "Sud",
          "Est",
          "Oest",
          "Altres"
        ]
      },
      {
        "key": "nacionalitat",
        "label": "Nacionalidad",
        "type": "text"
      },
      {
        "key": "distribucio_origen",
        "label": "Región de origen",
        "type": "select",
        "options": [
          "Espanya",
          "Europa",
          "Asia",
          "Latinoamérica",
          "Amèrica del Nord",
          "Africa-Magreb",
          "Àfrica- Subsahara"
        ]
      },
      {
        "key": "minoria_etnica",
        "label": "Minoría étnica",
        "type": "select",
        "options": [
          "Sí",
          "No"
        ]
      },
      {
        "key": "situacio_admin",
        "label": "Situación administrativa",
        "type": "select",
        "options": [
          "NACIONALITAT ESPANYOLA",
          "PERMÍS TEMPORAL",
          "PERMÍS DEFINITIU",
          "EN PROCÉS DE REGULARITZACIÓ",
          "SENSE PAPERS (NO COMPLEIX REQUISITS DE MOMENT)"
        ]
      }
    ]
  ],
  [
    "Relación con servicios",
    [
      {
        "key": "derivat_per",
        "label": "Derivado por",
        "type": "multi",
        "options": [
          "CENTRE SALUT",
          "CENTRE EDUCATIU",
          "CMSS",
          "ENTITAT TERCER SECTOR",
          "IMAS- SERVEI PROTECCIÓ MENORS",
          "IMAS- SAIS",
          "CENTRES PROTECCIÓ",
          "PROGRAMES D’EMACIPACIÓ (AUTONOMIA PERSONAL)",
          "D.G. FAMÍLIES",
          "INFÀNCIA I JOVENTUT (MESURES JUDICIALS MENORS)",
          "ALTRES"
        ]
      },
      {
        "key": "derivat_per_altres",
        "label": "Otro servicio de derivación",
        "type": "text"
      },
      {
        "key": "expedient_obert_a",
        "label": "Expediente abierto en",
        "type": "multi",
        "options": [
          "SS SS",
          "SPM",
          "Salut",
          "Juridic",
          "Altres"
        ]
      },
      {
        "key": "protocols_educacio",
        "label": "Protocolos educativos",
        "type": "multi",
        "options": [
          "RUMI",
          "SUICIDI/AUTOLÍTIQUES",
          "ABSENTISME",
          "ASSETJAMENT",
          "VIOLÈNCIES MASCLISTES",
          "LGTBIQA+"
        ]
      },
      {
        "key": "professional_xarxa",
        "label": "Profesional de la red",
        "type": "select",
        "options": [
          "Sí",
          "No"
        ]
      }
    ]
  ],
  [
    "Situación familiar y vivienda",
    [
      {
        "key": "situacio_domicili",
        "label": "Situación de vivienda",
        "type": "select",
        "options": [
          "Lloguer",
          "Propietat",
          "Ocupació",
          "Sense llar",
          "Acolliment familia extensa",
          "Risc desnonament",
          "Recurs residencial xarxa inclusió",
          "Recurs residencial menors/emancipació",
          "Recurs residencial familiar Ajuntament"
        ]
      },
      {
        "key": "membres_unitat_familiar",
        "label": "Miembros de la unidad familiar",
        "type": "select",
        "options": [
          "1",
          "2",
          "3",
          "4",
          "5",
          "+ DE 5"
        ]
      },
      {
        "key": "context_familiar",
        "label": "Contexto familiar",
        "type": "select",
        "options": [
          "FAM NOMBROSA",
          "MONOPARENTAL",
          "RECONSTITUIDA",
          "PARELLA SENSE FILLS",
          "PERSONA SOLA"
        ]
      },
      {
        "key": "nombre_fills",
        "label": "Número de hijos",
        "type": "select",
        "options": [
          "1",
          "2",
          "3",
          "4",
          "5",
          "+ DE 5"
        ]
      },
      {
        "key": "vulnerabilitat_greu",
        "label": "Vulnerabilidad grave",
        "type": "multi",
        "options": [
          "Violència de Gènere",
          "Explotació sexual / tracta / prostitució",
          "Problemes de salut mental",
          "Malalties cròniques",
          "Reclusió o exreclusos",
          "Menors no acompanyats",
          "Soledat no desitjada"
        ]
      },
      {
        "key": "bretxa_digital",
        "label": "Brecha digital",
        "type": "select",
        "options": [
          "Si",
          "No"
        ]
      },
      {
        "key": "participa_comunitaries",
        "label": "Participa en actividades comunitarias",
        "type": "select",
        "options": [
          "Sí",
          "No"
        ]
      },
      {
        "key": "indicadors_risc",
        "label": "Indicadores de riesgo",
        "type": "multi",
        "options": [
          "CONDUCTUALS",
          "SEXUALITZACIÓ NO ADEQUADA",
          "CONFLICTES RELACIONALS",
          "IMATGE I HIGIENE",
          "SEGUIMENT SANITARI",
          "ALIMENTACIÓ",
          "SUPERVISIÓ / IMPLICACIÓ FAMILIAR (MENORS)",
          "CONSUM HABITUAL",
          "CONSUM PUNTUAL",
          "ABSENTISME",
          "NO OCI SALUDABLE",
          "MANCA OBJECTIUS",
          "MANCA XARXA SOCIAL"
        ]
      },
      {
        "key": "ingressos",
        "label": "Ingresos",
        "type": "select",
        "options": [
          "Sense Ingressos",
          "Treball",
          "RGC / IMV",
          "Ajudes puntuals",
          "Altres"
        ]
      }
    ]
  ],
  [
    "Educación y empleo",
    [
      {
        "key": "nivell_educatiu",
        "label": "Nivel educativo",
        "type": "select",
        "options": [
          "INFANTIL",
          "PRIMÀRIA",
          "SECUNDÀRIA",
          "FP BÀSICA",
          "FP MITJA",
          "FP SUPERIOR",
          "BATXILLER",
          "UNIVERSITAT"
        ]
      },
      {
        "key": "centre_educatiu",
        "label": "Centro educativo",
        "type": "text"
      },
      {
        "key": "situacio_escolar",
        "label": "Situación escolar",
        "type": "select",
        "options": [
          "Escolaritzat",
          "En conflicte amb el centre",
          "Absentista moderat",
          "Exclusió educativa",
          "Altres"
        ]
      },
      {
        "key": "situacio_laboral",
        "label": "Situación laboral",
        "type": "select",
        "options": [
          "Treball indefinit",
          "Treball a temps parcial",
          "Desocupat receptor de prestacions",
          "Desocupat no receptor de prestacions",
          "Altres"
        ]
      },
      {
        "key": "situacio_laboral_detall",
        "label": "Detalle laboral",
        "type": "text"
      }
    ]
  ],
  [
    "Salud y apoyos",
    [
      {
        "key": "discapacitat",
        "label": "Discapacidad",
        "type": "select",
        "options": [
          "SI",
          "NO"
        ]
      },
      {
        "key": "dependencia",
        "label": "Dependencia",
        "type": "select",
        "options": [
          "SI",
          "NO"
        ]
      },
      {
        "key": "malaltia_tipus",
        "label": "Tipo de enfermedad",
        "type": "select",
        "options": [
          "-SALUT FÍSICA",
          "-SALUT MENTAL"
        ]
      },
      {
        "key": "malaltia_nom",
        "label": "Enfermedad",
        "type": "text"
      },
      {
        "key": "adiccio",
        "label": "Adicción",
        "type": "select",
        "options": [
          "No",
          "Sí"
        ]
      },
      {
        "key": "adiccio_a_que",
        "label": "Detalle de adicción",
        "type": "text"
      },
      {
        "key": "te_alergies",
        "label": "Alergias",
        "type": "select",
        "options": [
          "No",
          "Sí"
        ]
      },
      {
        "key": "alergies_ambientals",
        "label": "Alergias ambientales",
        "type": "long"
      },
      {
        "key": "alergies_medicaments",
        "label": "Alergias a medicamentos",
        "type": "long"
      },
      {
        "key": "alergies_aliments",
        "label": "Alergias alimentarias",
        "type": "long"
      },
      {
        "key": "tda",
        "label": "TDA",
        "type": "select",
        "options": [
          "No",
          "Sí"
        ]
      },
      {
        "key": "tdha",
        "label": "TDAH",
        "type": "select",
        "options": [
          "No",
          "Sí"
        ]
      },
      {
        "key": "dependencia_medica",
        "label": "Dependencia médica",
        "type": "select",
        "options": [
          "No",
          "Sí"
        ]
      },
      {
        "key": "grau",
        "label": "Grado de dependencia",
        "type": "select",
        "options": [
          "Grado I",
          "Grado II",
          "Grado III"
        ]
      },
      {
        "key": "observacions",
        "label": "Observaciones médicas",
        "type": "long"
      }
    ]
  ]
];
export const personFields = personSections.flatMap(([,fields]) => fields);
