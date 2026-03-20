/**
 * Export agreement + optional live page content to a single PDF (no print dialog).
 * Uses clone-based capture so the live page is not modified and capture works with modal open.
 */
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
/** Match PublicProposalView .pub-content-container so capture has no side margins and heroes span full width */
const PROPOSAL_CAPTURE_WIDTH_PX = 1000;

function addCanvasToPdf(pdf, imgData, imgWidthMm, imgHeightMm) {
  if (!imgData || imgHeightMm <= 0) return;
  let position = 0;
  const pageHeight = A4_HEIGHT_MM;
  pdf.addImage(imgData, 'JPEG', 0, position, imgWidthMm, imgHeightMm);
  let drawn = pageHeight;
  while (drawn < imgHeightMm) {
    pdf.addPage();
    position = position - pageHeight;
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidthMm, imgHeightMm);
    drawn += pageHeight;
  }
}

/** Top/bottom margin (mm) for agreement pages so text doesn't run to the edge. */
const PAGE_TOP_MM = 20;
const PAGE_BOTTOM_MM = 20;

/**
 * Add a long canvas to the PDF in page-sized slices with top and bottom margins on each page.
 */
function addCanvasToPdfWithMargins(pdf, canvas, topMm = PAGE_TOP_MM, bottomMm = PAGE_BOTTOM_MM) {
  if (!canvas || !canvas.width || !canvas.height) return;
  const contentHeightMm = A4_HEIGHT_MM - topMm - bottomMm;
  if (contentHeightMm <= 0) return;
  const scale = A4_WIDTH_MM / canvas.width;
  const sliceHeightPx = contentHeightMm / scale;
  const numSlices = Math.ceil(canvas.height / sliceHeightPx);

  for (let i = 0; i < numSlices; i++) {
    const srcY = i * sliceHeightPx;
    const srcH = Math.min(sliceHeightPx, canvas.height - srcY);
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = Math.ceil(srcH);
    const ctx = sliceCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
    const imgData = sliceCanvas.toDataURL('image/jpeg', 0.92);
    const sliceHeightMm = (srcH / canvas.width) * A4_WIDTH_MM;
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, topMm, A4_WIDTH_MM, sliceHeightMm);
  }
}

/** One A4 page height in pixels at PROPOSAL_CAPTURE_WIDTH_PX width (same scale) */
const PAGE_HEIGHT_PX = Math.round(PROPOSAL_CAPTURE_WIDTH_PX * (A4_HEIGHT_MM / A4_WIDTH_MM));

/**
 * Capture proposal content for PDF. Uses fixed width so output has no side margins.
 * If clipY/clipHeight are provided, captures only that vertical slice (for page-by-page capture to avoid mid-word cuts).
 */
function captureElementToCanvas(element, scale = 2, options = {}) {
  const w = PROPOSAL_CAPTURE_WIDTH_PX;
  const fullH = Math.max(1, element.scrollHeight || element.clientHeight || 600);
  const clipY = options.clipY ?? 0;
  const clipHeight = options.clipHeight ?? fullH;
  const useSlice = clipHeight < fullH && clipHeight > 0;

  const rect = element.getBoundingClientRect();
  const computed = typeof window !== 'undefined' && element.isConnected ? window.getComputedStyle(element) : null;
  console.log('[PDF DEBUG] Before page capture (html2canvas)', {
    tagName: element.tagName,
    className: element.className,
    innerHTMLLength: element.innerHTML?.length ?? 0,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
    usedHeight: useSlice ? clipHeight : fullH,
    clipY: useSlice ? clipY : undefined,
    clipHeight: useSlice ? clipHeight : undefined,
    getBoundingClientRect: { width: rect.width, height: rect.height, top: rect.top, left: rect.left },
    visibility: computed?.visibility,
    display: computed?.display,
    isConnected: element.isConnected,
  });

  const captureH = useSlice ? clipHeight : fullH;

  return html2canvas(element, {
    useCORS: true,
    allowTaint: true,
    scale,
    logging: false,
    backgroundColor: '#ffffff',
    width: w,
    height: captureH,
    windowWidth: w,
    windowHeight: captureH,
    scrollX: 0,
    scrollY: 0,
    onclone(_, clonedElement) {
      clonedElement.style.width = `${w}px`;
      clonedElement.style.height = `${captureH}px`;
      clonedElement.style.minHeight = `${captureH}px`;
      clonedElement.style.overflow = 'hidden';
      clonedElement.style.overflowY = 'hidden';
      clonedElement.style.backgroundColor = '#ffffff';
      if (useSlice && clipY !== 0) {
        clonedElement.style.transform = `translateY(-${clipY}px)`;
        clonedElement.style.transformOrigin = '0 0';
      }
    },
  });
}

/**
 * Resolve the page content element: use node if provided, else query selector.
 * Prefer the inner .pub-content-container so we capture full content height;
 * the outer .ppv-content is a scroll container and html2canvas often only captures the visible viewport.
 */
function getPageElement(options) {
  const el = options.pageContentElement;
  const outer = (el && el.nodeType === Node.ELEMENT_NODE)
    ? el
    : (typeof options.pageContentSelector === 'string' ? document.querySelector(options.pageContentSelector) : null);
  if (!outer) return null;
  const inner = outer.querySelector && outer.querySelector('.pub-content-container');
  const resolved = inner || outer;
  console.log('[PDF DEBUG] getPageElement', {
    hadRef: !!(el && el.nodeType === Node.ELEMENT_NODE),
    outerFound: !!outer,
    innerFound: !!inner,
    resolvedTag: resolved?.tagName,
    resolvedClass: resolved?.className,
  });
  return resolved;
}

export function exportAgreementToPdf(fullHtml, filename = 'Agreement-and-Proposal.pdf', options = {}) {
  const pdf = new jsPDF('p', 'mm', 'a4');

  function addAgreementFromHtml() {
    return new Promise((resolve, reject) => {
      // [PDF DEBUG] Agreement HTML and iframe setup
      console.log('[PDF DEBUG] addAgreementFromHtml', {
        fullHtmlLength: fullHtml?.length ?? 0,
        fullHtmlStartsWithDocType: fullHtml?.startsWith('<!DOCTYPE') ?? false,
      });

      const iframe = document.createElement('iframe');
      iframe.setAttribute('style', 'position:absolute;left:-9999px;top:0;width:900px;height:1px;visibility:hidden;');
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument;
      if (!doc) {
        console.warn('[PDF DEBUG] addAgreementFromHtml: no iframe contentDocument');
        document.body.removeChild(iframe);
        reject(new Error('Could not create iframe document'));
        return;
      }

      doc.open();
      doc.write(fullHtml);
      doc.close();

      const bodyEl = doc.body;
      if (!bodyEl) {
        console.warn('[PDF DEBUG] addAgreementFromHtml: no iframe body');
        document.body.removeChild(iframe);
        reject(new Error('Iframe body not ready'));
        return;
      }

      const startCapture = () => {
        const sw = bodyEl.scrollWidth;
        const sh = bodyEl.scrollHeight;
        const cw = bodyEl.clientWidth;
        const ch = bodyEl.clientHeight;
        console.log('[PDF DEBUG] Before agreement iframe capture', {
          bodyScrollWidth: sw,
          bodyScrollHeight: sh,
          bodyClientWidth: cw,
          bodyClientHeight: ch,
          bodyInnerHTMLLength: bodyEl.innerHTML?.length ?? 0,
          docReadyState: doc.readyState,
        });

        html2canvas(bodyEl, {
          useCORS: true,
          allowTaint: true,
          scale: 2,
          logging: false,
          width: bodyEl.scrollWidth,
          height: bodyEl.scrollHeight,
          windowWidth: bodyEl.scrollWidth,
          windowHeight: bodyEl.scrollHeight,
          onclone(_, clonedElement) {
            clonedElement.style.width = `${bodyEl.scrollWidth}px`;
            clonedElement.style.overflow = 'visible';
          },
        })
          .then((canvas) => {
            try {
              let nonBlankPixels = -1;
              try {
                const ctx = canvas.getContext('2d');
                const imageData = ctx.getImageData(0, 0, Math.min(50, canvas.width), Math.min(50, canvas.height));
                const data = imageData.data;
                nonBlankPixels = 0;
                for (let i = 0; i < data.length; i += 4) {
                  if (data[i + 3] > 0) nonBlankPixels++;
                }
              } catch (e2) {
                console.warn('[PDF DEBUG] Agreement canvas blank check failed', e2);
              }
              console.log('[PDF DEBUG] After agreement iframe capture', {
                canvasWidth: canvas.width,
                canvasHeight: canvas.height,
                sampleNonBlankPixels: nonBlankPixels,
                likelyBlank: nonBlankPixels >= 0 && nonBlankPixels < 100,
              });

              addCanvasToPdfWithMargins(pdf, canvas, PAGE_TOP_MM, PAGE_BOTTOM_MM);
            } finally {
              if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
            }
            resolve();
          })
          .catch((err) => {
            console.warn('[PDF DEBUG] Agreement iframe html2canvas failed', err);
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
            reject(err);
          });
      };

      const win = iframe.contentWindow;
      const delay = bodyEl.querySelectorAll('img').length > 0 ? 400 : 150;
      console.log('[PDF DEBUG] Agreement iframe delay ms', delay);

      if (doc.readyState === 'complete') {
        win.setTimeout(startCapture, delay);
      } else {
        win.addEventListener('load', () => win.setTimeout(startCapture, delay));
      }
    });
  }

  async function run() {
    console.log('[PDF DEBUG] exportAgreementToPdf run() started', {
      filename,
      agreementOnly: options.agreementOnly,
      hasPageContentElement: !!(options.pageContentElement && options.pageContentElement.nodeType === Node.ELEMENT_NODE),
      pageContentSelector: options.pageContentSelector,
    });

    const agreementOnly = options.agreementOnly === true;
    const pageEl = agreementOnly ? null : getPageElement(options);
    const scrollContainer = options.pageContentElement?.nodeType === Node.ELEMENT_NODE
      ? options.pageContentElement
      : (options.pageContentSelector ? document.querySelector(options.pageContentSelector) : null);

    if (pageEl) {
      try {
        if (scrollContainer) scrollContainer.scrollTop = 0;
        await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 150)));

        const totalHeight = Math.max(pageEl.scrollHeight, pageEl.clientHeight || 0);
        const useSlicedCapture = totalHeight > PAGE_HEIGHT_PX;

        if (useSlicedCapture) {
          // Capture in A4-sized slices so page boundaries are consistent and we avoid arbitrary mid-content cuts
          const numSlices = Math.ceil(totalHeight / PAGE_HEIGHT_PX);
          for (let i = 0; i < numSlices; i++) {
            const clipY = i * PAGE_HEIGHT_PX;
            const clipHeight = Math.min(PAGE_HEIGHT_PX, totalHeight - clipY);
            const canvas = await captureElementToCanvas(pageEl, 2, { clipY, clipHeight });
            const imgData = canvas.toDataURL('image/jpeg', 0.92);
            const imgWidth = A4_WIDTH_MM;
            const imgHeightMm = (canvas.height * imgWidth) / canvas.width;
            if (imgHeightMm > 0) addCanvasToPdf(pdf, imgData, imgWidth, imgHeightMm);
          }
        } else {
          const canvas = await captureElementToCanvas(pageEl, 2);
          const imgData = canvas.toDataURL('image/jpeg', 0.92);
          const imgWidth = A4_WIDTH_MM;
          const imgHeightMm = (canvas.height * imgWidth) / canvas.width;

          let nonBlankPixels = -1;
          try {
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, Math.min(50, canvas.width), Math.min(50, canvas.height));
            const data = imageData.data;
            nonBlankPixels = 0;
            for (let i = 0; i < data.length; i += 4) {
              if (data[i + 3] > 0) nonBlankPixels++;
            }
          } catch (e) {
            console.warn('[PDF DEBUG] Page canvas blank check failed (e.g. tainted)', e);
          }
          console.log('[PDF DEBUG] After page capture', {
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            imgHeightMm,
            addedToPdf: imgHeightMm > 0,
            sampleNonBlankPixels: nonBlankPixels,
            likelyBlank: nonBlankPixels >= 0 && nonBlankPixels < 100,
          });

          if (imgHeightMm > 0) addCanvasToPdf(pdf, imgData, imgWidth, imgHeightMm);
        }
      } catch (err) {
        console.warn('[PDF DEBUG] Page capture failed', err);
        const contentOnly = document.querySelector('.pub-content-container');
        if (contentOnly && contentOnly !== pageEl) {
          try {
            const canvas = await captureElementToCanvas(contentOnly, 2);
            const imgData = canvas.toDataURL('image/jpeg', 0.92);
            const imgWidth = A4_WIDTH_MM;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            addCanvasToPdf(pdf, imgData, imgWidth, imgHeight);
          } catch (e2) {
            console.warn('[PDF DEBUG] Content fallback failed', e2);
          }
        }
      }
    } else {
      console.log('[PDF DEBUG] No page element to capture (pageEl is null)');
    }

    await addAgreementFromHtml();
    pdf.save(filename);
    console.log('[PDF DEBUG] PDF save() called', filename);
  }

  return run().catch((err) => {
    console.warn('[PDF DEBUG] exportAgreementToPdf run() error', err);
    throw err;
  });
}
