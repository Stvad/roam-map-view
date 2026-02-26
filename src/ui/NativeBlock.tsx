import { useEffect, useRef } from "react";

type Props = {
  uid: string;
};

export function NativeBlock({ uid }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    ref.current.innerHTML = "";
    try {
      window.roamAlphaAPI.ui.components.renderBlock({ uid, el: ref.current });
    } catch {
      ref.current.textContent = `(( ${uid} ))`;
    }

    return () => {
      if (ref.current) {
        ref.current.innerHTML = "";
      }
    };
  }, [uid]);

  return <div ref={ref} />;
}
