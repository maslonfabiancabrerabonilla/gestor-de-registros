// ── Utilidad: Parsing de Excel para importación masiva ─────────
import ExcelJS from 'exceljs';

/** Límite máximo de filas por importación */
export const MAX_BULK_ROWS = 200;

/**
 * Parsea un buffer de archivo Excel y devuelve los nombres encontrados.
 * @param {Buffer} buffer - Contenido del archivo .xlsx/.xls.
 * @returns {Promise<Array<{fila: number, valor: string}>>} — nombres con su fila de origen.
 * @throws {Error} si el archivo es inválido, vacío o excede MAX_BULK_ROWS.
 */
export async function parsearExcel(buffer) {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer);
  } catch {
    throw Object.assign(new Error('El archivo no es un Excel válido o está corrupto'), { status: 400 });
  }

  const sheet = wb.worksheets[0];
  const nombresRAW = [];
  sheet.eachRow((row, rowNum) => {
    const val = String(row.getCell(1).text ?? '').trim();
    if (val) nombresRAW.push({ fila: rowNum, valor: val });
  });

  if (!nombresRAW.length) {
    throw Object.assign(new Error('El archivo no contiene datos'), { status: 400 });
  }
  if (nombresRAW.length > MAX_BULK_ROWS) {
    throw Object.assign(new Error(`Máximo ${MAX_BULK_ROWS} filas permitidas`), { status: 400 });
  }

  return nombresRAW;
}

/**
 * Detecta nombres duplicados dentro de una lista.
 * @param {Array<{fila: number, valor: string}>} nombres
 * @returns {{ duplicados: Array<{fila, valor, razon}>, unicos: Map<string, number> }}
 */
export function detectarDuplicadosEnArchivo(nombres) {
  const seen = new Map();
  const duplicados = [];
  for (const { fila, valor } of nombres) {
    const key = valor.toLowerCase();
    if (seen.has(key)) {
      duplicados.push({ fila, valor, razon: `Duplicado con fila ${seen.get(key)}` });
    } else {
      seen.set(key, fila);
    }
  }
  return { duplicados, unicos: seen };
}
