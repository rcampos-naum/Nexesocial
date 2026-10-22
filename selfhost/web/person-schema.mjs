// Adapted from public/perfil-usuari.html; options keep the original stored values.
export const personSections = [
  [
    "Datos personales",
    [
      {
        "key": "tipus_document",
        "label": "Tipus de document",
        "type": "select",
        "options": [
          "DNI",
          "NIE",
          "Passaport"
        ]
      },
      {
        "key": "genere",
        "label": "Gènere",
        "type": "select",
        "options": [
          "HOME",
          "DONA",
          "NO BINARI"
        ]
      },
      {
        "key": "adreca",
        "label": "Adreça",
        "type": "text"
      },
      {
        "key": "barri_residencia",
        "label": "Barri de residència",
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
        "label": "Nacionalitat",
        "type": "text"
      },
      {
        "key": "distribucio_origen",
        "label": "Distribució d’origen",
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
        "label": "Minoria ètnica",
        "type": "select",
        "options": [
          "Sí",
          "No"
        ]
      },
      {
        "key": "situacio_admin",
        "label": "Situació administrativa",
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
        "label": "Derivat per",
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
        "label": "Nom del servei",
        "type": "text"
      },
      {
        "key": "expedient_obert_a",
        "label": "Expedient obert a",
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
        "label": "Protocols d’educació",
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
        "label": "Professional de la xarxa",
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
        "label": "Situació del domicili",
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
        "label": "Membres de la unitat familiar",
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
        "label": "Context familiar",
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
        "label": "Nombre de fills",
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
        "label": "Vulnerabilitat greu",
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
        "label": "Bretxa digital",
        "type": "select",
        "options": [
          "Si",
          "No"
        ]
      },
      {
        "key": "participa_comunitaries",
        "label": "Participa en activitats comunitàries",
        "type": "select",
        "options": [
          "Sí",
          "No"
        ]
      },
      {
        "key": "indicadors_risc",
        "label": "Indicadors de risc",
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
        "label": "Ingressos",
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
        "label": "Nivell educatiu",
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
        "label": "Centre educatiu",
        "type": "text"
      },
      {
        "key": "situacio_escolar",
        "label": "Situació escolar",
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
        "label": "Situació laboral",
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
        "label": "Detall de la situació laboral",
        "type": "text"
      }
    ]
  ],
  [
    "Salud y apoyos",
    [
      {
        "key": "discapacitat",
        "label": "Discapacitat",
        "type": "select",
        "options": [
          "SI",
          "NO"
        ]
      },
      {
        "key": "dependencia",
        "label": "Dependència",
        "type": "select",
        "options": [
          "SI",
          "NO"
        ]
      },
      {
        "key": "malaltia_tipus",
        "label": "Tipus de malaltia",
        "type": "select",
        "options": [
          "-SALUT FÍSICA",
          "-SALUT MENTAL"
        ]
      },
      {
        "key": "malaltia_nom",
        "label": "Nom de la malaltia",
        "type": "text"
      },
      {
        "key": "adiccio",
        "label": "Addicció",
        "type": "select",
        "options": [
          "No",
          "Sí"
        ]
      },
      {
        "key": "adiccio_a_que",
        "label": "Addicció a què",
        "type": "text"
      },
      {
        "key": "te_alergies",
        "label": "Al·lèrgies",
        "type": "select",
        "options": [
          "No",
          "Sí"
        ]
      },
      {
        "key": "alergies_ambientals",
        "label": "Al·lèrgies ambientals",
        "type": "long"
      },
      {
        "key": "alergies_medicaments",
        "label": "Al·lèrgies a medicaments",
        "type": "long"
      },
      {
        "key": "alergies_aliments",
        "label": "Al·lèrgies alimentàries",
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
        "label": "Dependència mèdica",
        "type": "select",
        "options": [
          "No",
          "Sí"
        ]
      },
      {
        "key": "grau",
        "label": "Grau",
        "type": "select",
        "options": [
          "Grado I",
          "Grado II",
          "Grado III"
        ]
      },
      {
        "key": "observacions",
        "label": "Observacions mèdiques",
        "type": "long"
      }
    ]
  ]
];
export const personFields = personSections.flatMap(([,fields]) => fields);
