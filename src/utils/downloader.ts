/**
 * MinaDental Reliable Project Archive Downloader
 * Handles in-browser blob downloads safely across mobile Chrome, iOS Safari, and iframes.
 */

export function getProjectArchiveUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/minadental-source-full.zip`;
  }
  return '/minadental-source-full.zip';
}

export async function downloadProjectArchive(
  onSuccess?: () => void,
  onError?: (err: Error) => void
): Promise<boolean> {
  try {
    const url = getProjectArchiveUrl();
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`خطا در دریافت فایل: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = 'minadental-source-full.zip';
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    }, 1500);

    onSuccess?.();
    return true;
  } catch (err: any) {
    console.error('Direct blob download error:', err);
    // Fallback: direct window location trigger
    try {
      const fallbackA = document.createElement('a');
      fallbackA.href = getProjectArchiveUrl();
      fallbackA.download = 'minadental-source-full.zip';
      fallbackA.target = '_blank';
      fallbackA.rel = 'noopener noreferrer';
      document.body.appendChild(fallbackA);
      fallbackA.click();
      setTimeout(() => document.body.removeChild(fallbackA), 1000);
      onSuccess?.();
      return true;
    } catch (e: any) {
      onError?.(err || e);
      return false;
    }
  }
}
