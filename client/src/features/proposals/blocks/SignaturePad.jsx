/**
 * SignaturePad — modal with canvas for drawing signature.
 * Stable listeners (ref-based) so effect only depends on open; retry until canvas is ready.
 */
import { useRef, useEffect, useCallback, useState } from 'react';
import { Modal, Button } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import './SignaturePad.css';

const DEFAULT_CSS_HEIGHT = 200;
const DEFAULT_CSS_WIDTH = 448;

export default function SignaturePad({ open, onSave, onDiscard }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [emptyError, setEmptyError] = useState(false);
  const [modalReady, setModalReady] = useState(false);

  const strokeColor = '#1f1f1f';
  const strokeWidth = 2;
  const backgroundColor = '#ffffff';

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const cssW = (rect.width || canvas.offsetWidth || 0) || DEFAULT_CSS_WIDTH;
    const cssH = (rect.height || canvas.offsetHeight || 0) || DEFAULT_CSS_HEIGHT;

    canvas.width = Math.max(1, Math.floor(cssW * dpr));
    canvas.height = Math.max(1, Math.floor(cssH * dpr));

    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, cssW, cssH);
    ctxRef.current = ctx;
    return true;
  }, []);

  const getPos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const startDrawing = useCallback((e) => {
    e.preventDefault();
    const ctx = ctxRef.current;
    if (!ctx) return;
    isDrawing.current = true;
    const pos = getPos(e);
    lastPos.current = pos;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.arc(pos.x, pos.y, strokeWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = strokeColor;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }, [getPos]);

  const draw = useCallback((e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  }, [getPos]);

  const stopDrawing = useCallback(() => {
    isDrawing.current = false;
  }, []);

  // Keep latest handlers in a ref so we can attach once and never re-run effect for re-renders
  const handlersRef = useRef({ initCanvas, startDrawing, draw, stopDrawing });
  useEffect(() => {
    handlersRef.current = { initCanvas, startDrawing, draw, stopDrawing };
  });

  // Attach listeners only when modal is open AND reported ready (afterOpenChange).
  // Use stable wrapper functions so effect dependency is only [open, modalReady].
  useEffect(() => {
    if (!open || !modalReady) return;
    setEmptyError(false);

    let cancelled = false;
    let cleanup = () => {};
    let rafId2;

    const tryAttach = () => {
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;

      const { initCanvas: init } = handlersRef.current;
      if (!init()) return;

      const onStart = (e) => {
        e.preventDefault();
        handlersRef.current.startDrawing(e);
      };
      const onMove = (e) => {
        e.preventDefault();
        handlersRef.current.draw(e);
      };
      const onStop = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        handlersRef.current.stopDrawing(e);
      };

      canvas.addEventListener('mousedown', onStart);
      canvas.addEventListener('mousemove', onMove);
      canvas.addEventListener('mouseup', onStop);
      canvas.addEventListener('mouseleave', onStop);
      canvas.addEventListener('touchstart', onStart, { passive: false });
      canvas.addEventListener('touchmove', onMove, { passive: false });
      canvas.addEventListener('touchend', onStop, { passive: false });
      canvas.addEventListener('touchcancel', onStop, { passive: false });

      cleanup = () => {
        canvas.removeEventListener('mousedown', onStart);
        canvas.removeEventListener('mousemove', onMove);
        canvas.removeEventListener('mouseup', onStop);
        canvas.removeEventListener('mouseleave', onStop);
        canvas.removeEventListener('touchstart', onStart);
        canvas.removeEventListener('touchmove', onMove);
        canvas.removeEventListener('touchend', onStop);
        canvas.removeEventListener('touchcancel', onStop);
      };
    };

    const rafId1 = requestAnimationFrame(() => {
      if (cancelled) return;
      rafId2 = requestAnimationFrame(() => {
        if (cancelled) return;
        tryAttach();
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId1);
      if (rafId2 != null) cancelAnimationFrame(rafId2);
      cleanup();
    };
  }, [open, modalReady]);

  useEffect(() => {
    if (!open) return;
    const handleResize = () => handlersRef.current.initCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [open]);

  const handleAfterOpenChange = useCallback((isOpen) => {
    setModalReady(isOpen);
    if (!isOpen) ctxRef.current = null;
  }, []);

  function isCanvasBlank(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) return false;
    }
    return true;
  }

  function handleSave() {
    setEmptyError(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (isCanvasBlank(canvas)) {
      setEmptyError(true);
      return;
    }
    onSave(canvas.toDataURL('image/png'));
  }

  return (
    <Modal
      open={open}
      onCancel={onDiscard}
      afterOpenChange={handleAfterOpenChange}
      footer={null}
      title="Draw your signature"
      width={480}
      className="signature-pad-modal"
      destroyOnClose
    >
      <p className="signature-pad-hint">Use your mouse or finger to sign in the box below.</p>
      <div className="signature-pad-canvas-wrap" style={{ pointerEvents: 'auto' }}>
        <canvas
          ref={canvasRef}
          className="signature-pad-canvas"
          style={{
            width: '100%',
            height: `${DEFAULT_CSS_HEIGHT}px`,
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        />
      </div>
      {emptyError && (
        <p className="signature-pad-empty-error">Please draw your signature in the box above before saving.</p>
      )}
      <div className="signature-pad-actions">
        <Button onClick={onDiscard} icon={<CloseOutlined />}>
          Discard
        </Button>
        <Button type="primary" onClick={handleSave} icon={<CheckOutlined />}>
          Save signature
        </Button>
      </div>
    </Modal>
  );
}
