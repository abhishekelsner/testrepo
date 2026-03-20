import { useState, useEffect, useCallback } from "react";

export const useGoogleAuth = ({ onSuccess, onError }) => {

  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {

    const scriptId = "google-client-script";

    if (document.getElementById(scriptId)) {
      setScriptReady(true);
      return;
    }

    const script = document.createElement("script");

    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.id = scriptId;

    script.onload = () => {
      setScriptReady(true);
    };

    script.onerror = () => {
      onError?.({ message: "Failed to load Google script" });
    };

    document.body.appendChild(script);

  }, []);

  const renderGoogleButton = useCallback((element) => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === "") {
      console.warn(
        "Google Sign-In: VITE_GOOGLE_CLIENT_ID is not set. Add it to client/.env (see client/env/.env.sample)."
      );
      if (element) {
        element.innerHTML =
          '<button type="button" disabled style="padding:10px 16px;width:100%;max-width:320px;border:1px solid #ccc;border-radius:4px;background:#f5f5f5;color:#888;cursor:not-allowed;">Google sign-in not configured</button>';
      }
      return;
    }

    if (!window.google || !window.google.accounts) {
      console.error("Google SDK not loaded yet");
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        onSuccess?.(response.credential);
      },
    });

    window.google.accounts.id.renderButton(element, {
      theme: "outline",
      size: "large",
      width: 320
    });
  }, [onSuccess]);

  return { scriptReady, renderGoogleButton };
};