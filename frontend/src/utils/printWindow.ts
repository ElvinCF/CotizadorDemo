export const waitForPrintWindowAssets = async (
  popup: Window,
  options: { timeoutMs?: number } = {}
) => {
  const timeoutMs = options.timeoutMs ?? 4000;
  const doc = popup.document;
  const startedAt = Date.now();

  const waitForDocumentComplete = async () => {
    if (doc.readyState === "complete") return;
    await new Promise<void>((resolve) => {
      const onReady = () => {
        doc.removeEventListener("readystatechange", onReady);
        resolve();
      };
      doc.addEventListener("readystatechange", onReady);
    });
  };

  const waitForImages = async () => {
    const images = Array.from(doc.images ?? []);
    if (images.length === 0) return;

    await Promise.all(
      images.map((img) => {
        if (img.complete && img.naturalWidth > 0) {
          if (typeof img.decode === "function") {
            return img.decode().catch(() => undefined);
          }
          return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
          const done = () => {
            img.removeEventListener("load", done);
            img.removeEventListener("error", done);
            resolve();
          };
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        });
      })
    );
  };

  const waitForFonts = async () => {
    if (!("fonts" in doc) || typeof doc.fonts?.ready === "undefined") return;
    try {
      await doc.fonts.ready;
    } catch {
      // Continue print even if fonts fail.
    }
  };

  await Promise.race([
    (async () => {
      await waitForDocumentComplete();
      await waitForImages();
      await waitForFonts();
    })(),
    new Promise<void>((resolve) => {
      const remaining = Math.max(timeoutMs - (Date.now() - startedAt), 0);
      setTimeout(() => resolve(), remaining);
    }),
  ]);
};
