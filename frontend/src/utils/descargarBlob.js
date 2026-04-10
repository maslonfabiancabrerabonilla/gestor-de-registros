// ── Utilidad: Descarga de blobs como archivos ────────────────

/**
 * Descarga un Blob como archivo en el navegador.
 * @param {Blob}   blob - El blob a descargar.
 * @param {string} nombreArchivo - Nombre del archivo resultante.
 */
export function descargarBlob(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = nombreArchivo;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
